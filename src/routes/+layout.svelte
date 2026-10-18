<script lang="ts">
  import { onMount } from 'svelte';
  import '../app.css';

  let isLoading = true;

  onMount(() => {
    const timer = window.setTimeout(() => {
      isLoading = false;
    }, 620);

    return () => window.clearTimeout(timer);
  });
</script>

<slot />

{#if isLoading}
  <div class="page-loader" role="status" aria-label="Loading mycoil">
    <div class="loader-content">
      <div class="loader-mark"><span></span><span></span><span></span></div>
      <div class="loader-brand"><span class="brand-mark">↯</span><span>mycoil</span></div>
      <div class="loader-track"><div></div></div>
      <span class="loader-label">Finding your rhythm</span>
    </div>
  </div>
{/if}
