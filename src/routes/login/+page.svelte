<script lang="ts">
  import { cs } from '$lib/i18n/cs';
  import { goto } from '$app/navigation';
  import FormInput from '$lib/components/form-input.svelte';
  import ErrorAlert from '$lib/components/error-alert.svelte';

  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state('');

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    loading = true;
    error = '';

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
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
      <h1 class="text-2xl font-bold text-text">Sledování ekzému</h1>
      <p class="text-text-muted text-sm mt-1">Eliminační dieta kojence</p>
    </div>

    <ErrorAlert message={error} />

    <form onsubmit={handleSubmit} class="flex flex-col gap-4">
      <FormInput
        id="email"
        label="E-mail"
        type="email"
        bind:value={email}
        required
        autocomplete="email"
      />

      <FormInput
        id="password"
        label="Heslo"
        type="password"
        bind:value={password}
        required
        autocomplete="current-password"
      />

      <button
        type="submit"
        disabled={loading}
        class="w-full bg-primary text-white rounded-lg py-2.5 font-medium mt-2 disabled:opacity-50 transition-opacity"
      >
        {loading ? cs.loading : cs.login}
      </button>
    </form>

    <p class="text-center text-sm text-text-muted mt-4">
      Nemáte účet?
      <a href="/register" class="text-primary font-medium">Registrovat se</a>
    </p>
  </div>
</div>
