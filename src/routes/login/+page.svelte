<script lang="ts">
  import { cs } from '$lib/i18n/cs';

  let email = $state('');
  let password = $state('');
  let loading = $state(false);

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    // No backend wiring yet — Phase 1
  }
</script>

<div class="min-h-screen bg-surface flex items-center justify-center p-4">
  <div class="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6">
    <div class="text-center mb-8">
      <div class="text-5xl mb-3">🌿</div>
      <h1 class="text-2xl font-bold text-text">Sledování ekzému</h1>
      <p class="text-text-muted text-sm mt-1">Eliminační dieta kojence</p>
    </div>

    <form onsubmit={handleSubmit} class="flex flex-col gap-4">
      <div>
        <label for="email" class="block text-sm font-medium text-text mb-1">
          E-mail
        </label>
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
          Heslo
        </label>
        <input
          id="password"
          type="password"
          bind:value={password}
          required
          autocomplete="current-password"
          class="w-full border border-surface-dark rounded-lg px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

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
