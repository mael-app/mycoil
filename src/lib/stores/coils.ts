import { browser } from '$app/environment';
import { supabase } from '$lib/supabase';
import type { User } from '@supabase/supabase-js';
import { writable } from 'svelte/store';
import type { CoilEvent, CoilState } from '$lib/types';

const STORAGE_KEY = 'mycoil-state';

function daysBetween(from: Date, to: Date) {
  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000).toISOString();
}

function createInitialState(): CoilState | null {
  if (!browser) return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  const state = JSON.parse(stored) as CoilState;
  return { ...state, lastNotifiedAt: state.lastNotifiedAt ?? null };
}

export const coilState = writable<CoilState | null>(createInitialState());
export const currentUser = writable<User | null>(null);
export const authReady = writable(false);

let activeUser: User | null = null;
let loadingRemote = false;

function settingsRow(state: CoilState, userId: string) {
  return {
    user_id: userId,
    coil_count: state.coilCount,
    initial_coil_count: state.initialCoilCount,
    deadline: state.deadline,
    current_coil_started_at: state.currentCoilStartedAt,
    next_change_at: state.nextChangeAt,
    interval_days: state.intervalDays,
    postpone_until: state.postponeUntil,
    last_notified_at: state.lastNotifiedAt,
    updated_at: new Date().toISOString()
  };
}

async function syncState(state: CoilState | null) {
  if (!supabase || !activeUser || loadingRemote) return;
  if (!state) {
    await supabase.from('coil_events').delete().eq('user_id', activeUser.id);
    await supabase.from('coil_settings').delete().eq('user_id', activeUser.id);
    return;
  }
  await supabase.from('coil_settings').upsert(settingsRow(state, activeUser.id));
  if (state.events.length > 0) {
    await supabase.from('coil_events').upsert(state.events.map((event) => ({
      id: event.id,
      user_id: activeUser?.id,
      type: event.type,
      occurred_at: event.occurredAt,
      amount: event.amount ?? null
    })));
  }
}

async function loadRemoteState(user: User) {
  if (!supabase) return;
  loadingRemote = true;
  const [{ data: settings }, { data: events }] = await Promise.all([
    supabase.from('coil_settings').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('coil_events').select('*').eq('user_id', user.id).order('occurred_at', { ascending: false })
  ]);

  if (settings) {
    coilState.set({
      coilCount: settings.coil_count,
      initialCoilCount: settings.initial_coil_count,
      deadline: settings.deadline,
      currentCoilStartedAt: settings.current_coil_started_at,
      nextChangeAt: settings.next_change_at,
      intervalDays: Number(settings.interval_days),
      postponeUntil: settings.postpone_until,
      lastNotifiedAt: settings.last_notified_at,
      events: (events ?? []).map((event) => ({
        id: event.id,
        type: event.type,
        occurredAt: event.occurred_at,
        amount: event.amount ?? undefined
      }))
    });
  } else {
    const localState = getState();
    if (localState) await syncState(localState);
  }
  loadingRemote = false;
}

function getState() {
  let value: CoilState | null = null;
  const unsubscribe = coilState.subscribe((state) => value = state);
  unsubscribe();
  return value;
}

export async function initializeAuth() {
  if (!browser || !supabase) {
    authReady.set(true);
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  activeUser = session?.user ?? null;
  currentUser.set(activeUser);
  if (activeUser) await loadRemoteState(activeUser);
  authReady.set(true);

  supabase.auth.onAuthStateChange((_event, nextSession) => {
    activeUser = nextSession?.user ?? null;
    currentUser.set(activeUser);
    if (activeUser) void loadRemoteState(activeUser);
  });
}

export async function signIn(email: string, password: string) {
  if (!supabase) return { error: 'Supabase is not configured.' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function signUp(email: string, password: string) {
  if (!supabase) return { error: 'Supabase is not configured.' };
  const { error } = await supabase.auth.signUp({ email, password });
  return { error: error?.message ?? null };
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

if (browser) {
  coilState.subscribe((value) => {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    void syncState(value);
  });
}

export function createPlan(coilCount: number, deadline: string) {
  const now = new Date();
  const intervalDays = daysBetween(now, new Date(deadline)) / Math.max(1, coilCount);
  coilState.set({
    coilCount,
    initialCoilCount: coilCount,
    deadline: new Date(deadline).toISOString(),
    currentCoilStartedAt: now.toISOString(),
    nextChangeAt: addDays(now, intervalDays),
    intervalDays,
    postponeUntil: null,
    lastNotifiedAt: null,
    events: []
  });
}

export function changeCoil() {
  coilState.update((state) => {
    if (!state) return state;
    const now = new Date();
    const coilCount = Math.max(0, state.coilCount - 1);
    const intervalDays = coilCount > 0
      ? daysBetween(now, new Date(state.deadline)) / coilCount
      : state.intervalDays;
    const event: CoilEvent = { id: crypto.randomUUID(), type: 'coil_change', occurredAt: now.toISOString() };
    return {
      ...state,
      coilCount,
      currentCoilStartedAt: now.toISOString(),
      nextChangeAt: addDays(now, intervalDays),
      intervalDays,
      postponeUntil: null,
      lastNotifiedAt: null,
      events: [event, ...state.events]
    };
  });
}

export function postponeChange() {
  coilState.update((state) => {
    if (!state) return state;
    const now = new Date();
    const next = new Date(state.nextChangeAt);
    const nextChangeAt = addDays(next, 1);
    const event: CoilEvent = { id: crypto.randomUUID(), type: 'postpone', occurredAt: now.toISOString() };
    return { ...state, nextChangeAt, postponeUntil: addDays(now, 1), lastNotifiedAt: null, events: [event, ...state.events] };
  });
}

export function refill(amount: number) {
  coilState.update((state) => {
    if (!state || amount < 1) return state;
    const event: CoilEvent = { id: crypto.randomUUID(), type: 'refill', occurredAt: new Date().toISOString(), amount };
    return { ...state, coilCount: state.coilCount + amount, events: [event, ...state.events] };
  });
}

export function updateDeadline(deadline: string) {
  coilState.update((state) => {
    if (!state) return state;
    const now = new Date();
    const intervalDays = daysBetween(now, new Date(deadline)) / Math.max(1, state.coilCount);
    return { ...state, deadline: new Date(deadline).toISOString(), intervalDays, nextChangeAt: addDays(now, intervalDays), lastNotifiedAt: null };
  });
}

export function clearPlan() {
  coilState.set(null);
}
