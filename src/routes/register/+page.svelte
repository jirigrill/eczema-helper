<script lang="ts">
  import { cs } from '$lib/i18n/cs';
  import { goto } from '$app/navigation';

  let name = $state('');
  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state('');

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    loading = true;
    error = '';

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    if (res.ok) {
      goto('/calendar');
    } else {
      const data = await res.json().catch(() => ({}));
      error = data.error ?? cs.error;
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-surface flex items-center justify-center p-4">
  <div class="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6">
    <div class="text-center mb-8">
      <div class="text-5xl mb-3">🌿</div>
      <h1 class="text-2xl font-bold text-text">Nový účet</h1>
      <p class="text-text-muted text-sm mt-1">Sledování ekzému kojence</p>
    </div>

    {#if error}
      <div class="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    {/if}

    <form onsubmit={handleSubmit} class="flex flex-col gap-4">
      <div>
        <label for="name" class="block text-sm font-medium text-text mb-1">Jméno</label>
        <input
          id="name"
          type="text"
          bind:value={name}
          required
          autocomplete="name"
          class="w-full border border-surface-dark rounded-lg px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label for="email" class="block text-sm font-medium text-text mb-1">E-mail</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          required
          autocomplete="email"
          class="w-full border border-surface-dark rounded-lg px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-text mb-1">
          Heslo <span class="text-text-muted font-normal">(min. 8 znaků)</span>
        </label>
        <input
          id="password"
          type="password"
          bind:value={password}
          required
          minlength="8"
          autocomplete="new-password"
          class="w-full border border-surface-dark rounded-lg px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        class="w-full bg-primary text-white rounded-lg py-2.5 font-medium mt-2 disabled:opacity-50 transition-opacity"
      >
        {loading ? cs.loading : cs.register}
      </button>
    </form>

    <p class="text-center text-sm text-text-muted mt-4">
      Máte účet?
      <a href="/login" class="text-primary font-medium">{cs.login}</a>
    </p>
  </div>
</div>
