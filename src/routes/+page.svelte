<script lang="ts">
  import { CalendarDays, Check, ChevronRight, CircleHelp, Clock3, Flame, History, LogOut, PackagePlus, RotateCcw, Settings2, ShieldCheck, UserRound, Zap } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { coilState, changeCoil, clearPlan, createPlan, currentUser, initializeAuth, postponeChange, refill, signIn, signOut, signUp, updateDeadline } from '$lib/stores/coils';

  let activeTab = 'Today';
  let showSetup = false;
  let showRefill = false;
  let showDeadline = false;
  let showHistory = false;
  let showAuth = false;
  let authMode: 'sign-in' | 'sign-up' = 'sign-in';
  let email = '';
  let password = '';
  let authMessage = '';
  let authLoading = false;
  let coilCount = 10;
  let deadline = '';
  let refillAmount = 5;

  $: state = $coilState;
  $: user = $currentUser;
  $: now = new Date();
  $: due = state ? now >= new Date(state.nextChangeAt) : false;
  $: postponed = state?.postponeUntil ? now < new Date(state.postponeUntil) : false;
  $: daysUntil = state ? Math.max(0, Math.ceil((new Date(state.nextChangeAt).getTime() - now.getTime()) / 86_400_000)) : 0;
  $: progress = state ? Math.min(100, Math.max(0, ((now.getTime() - new Date(state.currentCoilStartedAt).getTime()) / (state.intervalDays * 86_400_000)) * 100)) : 0;

  const formatDate = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value));
  const formatLongDate = (value: string) => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(value));
  const formatInterval = (days: number) => days < 1 ? `${Math.round(days * 24)} hours` : `${days % 1 === 0 ? days : days.toFixed(1)} days`;

  function passwordRules(node: HTMLInputElement) {
    node.setAttribute('passwordrules', 'minlength: 6;');
  }

  onMount(() => {
    void initializeAuth();
  });

  function startPlan() {
    if (!deadline || coilCount < 1) return;
    createPlan(coilCount, deadline);
    showSetup = false;
  }

  function openSetup() {
    if (state) {
      coilCount = state.coilCount;
      deadline = state.deadline.slice(0, 10);
    } else {
      const future = new Date();
      future.setDate(future.getDate() + 30);
      deadline = future.toISOString().slice(0, 10);
    }
    showSetup = true;
  }

  function saveDeadline() {
    if (deadline) updateDeadline(deadline);
    showDeadline = false;
  }

  function openAuth() {
    authMessage = '';
    showAuth = true;
  }

  async function submitAuth() {
    if (!email || password.length < 6) {
      authMessage = 'Enter a valid email and a password with at least 6 characters.';
      return;
    }
    authLoading = true;
    const result = authMode === 'sign-in' ? await signIn(email, password) : await signUp(email, password);
    authLoading = false;
    if (result.error) {
      authMessage = result.error;
      return;
    }
    authMessage = authMode === 'sign-up' ? 'Account created. Check your inbox to confirm your email.' : '';
    if (authMode === 'sign-in') showAuth = false;
  }
</script>

<svelte:head>
  <title>mycoil — Coil rhythm, under control.</title>
  <meta name="description" content="A calm, simple way to track your vape coil changes." />
</svelte:head>

<div class="app-shell">
  <header class="topbar">
    <a class="brand" href="/" aria-label="mycoil home"><span class="brand-mark"><Zap size={17} strokeWidth={2.8} /></span><span>mycoil</span></a>
    <div class="topbar-actions">
      {#if state}<button class="icon-button" aria-label="Open settings" onclick={openSetup}><Settings2 size={20} /></button>{/if}
      <button class="account-button" aria-label={user ? 'Open account' : 'Sign in'} onclick={openAuth}>{#if user}<span>{user.email?.slice(0, 1).toUpperCase()}</span>{:else}<UserRound size={18} />{/if}</button>
    </div>
  </header>

  {#if !state}
    <main class="welcome-page">
      <div class="eyebrow"><span class="live-dot"></span> Personal coil rhythm</div>
      <h1>Stay ahead<br /><em>of the burn.</em></h1>
      <p class="intro">A simple rhythm for knowing when to change your coil, without having to keep it in your head.</p>
      <div class="hero-orbit"><div class="orbit-ring"></div><div class="hero-coil"><Flame size={42} strokeWidth={1.4} /></div><span class="orbit-label label-one">CHANGE<br /><strong>ON TIME</strong></span><span class="orbit-label label-two">LESS<br /><strong>GUESSWORK</strong></span></div>
      <button class="primary-button wide" onclick={openSetup}>Set up my rhythm <ChevronRight size={19} /></button>
       <button class="sync-link" onclick={openAuth}><ShieldCheck size={14} /> {user ? 'Synced across your devices' : 'Sign in to sync across devices'}</button>
    </main>
  {:else}
    <main class="main-content" in:fade={{ duration: 260 }}>
      <div class="greeting-row"><div><p class="eyebrow">{formatLongDate(now.toISOString())}</p><h1>Good morning<span class="accent">.</span></h1></div><div class="avatar">M</div></div>

      <section class:status-due={due} class:status-postponed={postponed} class="status-card">
        <div class="status-top"><span class="status-label"><span class="status-pulse"></span>{due ? 'Action needed' : postponed ? 'Reminder snoozed' : 'On track'}</span><span class="status-icon">{#if due}<Flame size={20} />{:else}<Check size={20} />{/if}</span></div>
        {#if due}
          <h2>Time for a<br /><span>fresh coil.</span></h2><p class="status-copy">Your current coil has reached its rhythm. Swap it now for a cleaner draw.</p>
        {:else if postponed}
          <h2>Enjoy it for<br /><span>one more day.</span></h2><p class="status-copy">We will remind you again tomorrow. Your rhythm is still {formatInterval(state.intervalDays)}.</p>
        {:else}
          <h2>Next change<br /><span>in {daysUntil} day{daysUntil === 1 ? '' : 's'}.</span></h2><p class="status-copy">Your current coil is holding up well. Keep your rhythm going.</p>
        {/if}
        <div class="status-date"><CalendarDays size={15} /> {formatDate(state.nextChangeAt)} <span class="date-separator">•</span> Every {formatInterval(state.intervalDays)}</div>
        <div class="progress-track"><div class="progress-fill" style={`width: ${progress}%`}></div></div>
      </section>

      <div class="actions-row"><button class="primary-button" onclick={changeCoil}><Check size={18} /> I changed it</button><button class="secondary-button" onclick={postponeChange} disabled={postponed}><Clock3 size={18} /> {postponed ? 'Snoozed' : 'Continue'}</button></div>

      <section class="stats-grid"><div class="stat-card"><div class="stat-icon"><PackagePlus size={18} /></div><span class="stat-label">Coils left</span><strong>{state.coilCount}</strong><button onclick={() => showRefill = true}>Refill stock <ChevronRight size={14} /></button></div><div class="stat-card"><div class="stat-icon purple"><RotateCcw size={18} /></div><span class="stat-label">Your rhythm</span><strong>Every {formatInterval(state.intervalDays)}</strong><button onclick={() => showDeadline = true}>Adjust deadline <ChevronRight size={14} /></button></div></section>

      <section class="section-heading"><div><p class="eyebrow">Your rhythm</p><h2>At a glance</h2></div><button class="text-button" onclick={() => showHistory = true}>View history <ChevronRight size={15} /></button></section>
      <div class="glance-card"><div class="glance-item"><span>Started</span><strong>{formatDate(state.currentCoilStartedAt)}</strong></div><div class="glance-line"></div><div class="glance-item"><span>Deadline</span><strong>{formatDate(state.deadline)}</strong></div><div class="glance-line"></div><div class="glance-item"><span>Changes logged</span><strong>{state.events.filter((event) => event.type === 'coil_change').length}</strong></div></div>
      <div class="tip-card"><div class="tip-icon"><CircleHelp size={18} /></div><div><strong>Trust your taste, too.</strong><p>The schedule is a guide. If the flavour drops or the draw feels off, change early.</p></div></div>
    </main>
    <nav class="bottom-nav"><button class:active={activeTab === 'Today'} onclick={() => activeTab = 'Today'}><Zap size={19} /><span>Today</span></button><button class:active={activeTab === 'History'} onclick={() => { activeTab = 'History'; showHistory = true; }}><History size={19} /><span>History</span></button><button class:active={activeTab === 'Settings'} onclick={() => { activeTab = 'Settings'; openSetup(); }}><Settings2 size={19} /><span>Settings</span></button></nav>
  {/if}
</div>

{#if showSetup}
  <div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (showSetup = false)}><div class="modal" role="dialog" aria-modal="true" aria-labelledby="setup-title"><div class="modal-handle"></div><div class="modal-heading"><div><p class="eyebrow">Setup</p><h2 id="setup-title">Build your rhythm.</h2></div><button class="close-button" onclick={() => showSetup = false}>×</button></div><p class="modal-copy">Tell us how many coils you have and when you want them to last until.</p><label>Coils available<input type="number" min="1" bind:value={coilCount} /></label><label>Target deadline<input type="date" bind:value={deadline} /></label><button class="primary-button wide" onclick={startPlan}>{state ? 'Save changes' : 'Start tracking'} <ChevronRight size={18} /></button>{#if state}<button class="danger-button" onclick={() => { clearPlan(); showSetup = false; }}>Reset my plan</button>{/if}</div></div>
{:else if showRefill}
  <div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (showRefill = false)}><div class="modal compact" role="dialog" aria-modal="true"><div class="modal-heading"><div><p class="eyebrow">Stock</p><h2>Add coils.</h2></div><button class="close-button" onclick={() => showRefill = false}>×</button></div><label>How many did you get?<input type="number" min="1" bind:value={refillAmount} /></label><button class="primary-button wide" onclick={() => { refill(refillAmount); showRefill = false; }}>Add to stock <PackagePlus size={18} /></button></div></div>
{:else if showDeadline}
  <div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (showDeadline = false)}><section class="modal compact" role="dialog" aria-modal="true"><div class="modal-heading"><div><p class="eyebrow">Planning</p><h2>Move the finish line.</h2></div><button class="close-button" onclick={() => showDeadline = false}>×</button></div><p class="modal-copy">Your recommended rhythm and next change will be recalculated from today.</p><label>New deadline<input type="date" bind:value={deadline} /></label><button class="primary-button wide" onclick={saveDeadline}>Update deadline <CalendarDays size={18} /></button></section></div>
{:else if showHistory}
  <div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (showHistory = false)}><div class="modal history-modal" role="dialog" aria-modal="true"><div class="modal-heading"><div><p class="eyebrow">Timeline</p><h2>Your history.</h2></div><button class="close-button" onclick={() => showHistory = false}>×</button></div>{#if state && state.events.length === 0}<div class="empty-history"><History size={26} /><p>No activity yet.</p></div>{:else if state}<div class="event-list">{#each state.events as event}<div class="event-row"><div class="event-dot {event.type}"></div><div><strong>{event.type === 'coil_change' ? 'Coil changed' : event.type === 'postpone' ? 'Reminder postponed' : `Added ${event.amount} coils`}</strong><span>{formatLongDate(event.occurredAt)}</span></div></div>{/each}</div>{/if}</div></div>
{:else if showAuth}
  <div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (showAuth = false)}><div class="modal compact auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><div class="modal-heading"><div><p class="eyebrow">{user ? 'Account' : 'Cloud sync'}</p><h2 id="auth-title">{user ? 'Your account.' : authMode === 'sign-in' ? 'Welcome back.' : 'Create your account.'}</h2></div><button class="close-button" onclick={() => showAuth = false}>×</button></div>{#if user}<div class="account-summary"><div class="avatar">{user.email?.slice(0, 1).toUpperCase()}</div><div><strong>{user.email}</strong><span>Your coil rhythm is synced.</span></div></div><button class="secondary-button wide" onclick={() => { void signOut(); showAuth = false; }}><LogOut size={17} /> Sign out</button>{:else}{#key authMode}<form id="auth-form" name="auth-form" class="auth-form" method="post" action="/" autocomplete="on" onsubmit={(event) => { event.preventDefault(); void submitAuth(); }}><p class="modal-copy">Sign in to keep your rhythm synced between your phone and computer.</p><label for="auth-email">Email address<input id="auth-email" name="email" type="email" autocomplete="username" inputmode="email" placeholder="you@example.com" bind:value={email} /></label><label for="auth-password">Password<input use:passwordRules id="auth-password" name="password" type="password" autocomplete={authMode === 'sign-in' ? 'current-password' : 'new-password'} minlength="6" maxlength="72" placeholder="At least 6 characters" bind:value={password} /></label>{#if authMessage}<p class="auth-message">{authMessage}</p>{/if}<button type="submit" class="primary-button wide" disabled={authLoading}>{authLoading ? 'Working…' : authMode === 'sign-in' ? 'Sign in' : 'Create account'} <ChevronRight size={18} /></button><button type="button" class="switch-auth" onclick={() => { authMode = authMode === 'sign-in' ? 'sign-up' : 'sign-in'; authMessage = ''; }}>{authMode === 'sign-in' ? 'Need an account? Create one' : 'Already have an account? Sign in'}</button></form>{/key}{/if}</div></div>
{/if}
