import { browser } from '$app/environment';
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
  return stored ? JSON.parse(stored) : null;
}

export const coilState = writable<CoilState | null>(createInitialState());

if (browser) {
  coilState.subscribe((value) => {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
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
    return { ...state, nextChangeAt, postponeUntil: addDays(now, 1), events: [event, ...state.events] };
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
    return { ...state, deadline: new Date(deadline).toISOString(), intervalDays, nextChangeAt: addDays(now, intervalDays) };
  });
}

export function clearPlan() {
  coilState.set(null);
}
