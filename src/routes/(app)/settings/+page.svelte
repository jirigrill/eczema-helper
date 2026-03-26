<script lang="ts">
  import { cs } from '$lib/i18n/cs';
  import { childrenStore } from '$lib/stores/children.svelte';
  import { goto } from '$app/navigation';
  import type { Child } from '$lib/domain/models';

  type EditState = { id: string; name: string; birthDate: string } | null;

  let addName = $state('');
  let addBirthDate = $state('');
  let addLoading = $state(false);
  let addError = $state('');

  let editState = $state<EditState>(null);
  let editLoading = $state(false);
  let editError = $state('');

  let deleteConfirmId = $state<string | null>(null);

  async function addChild(e: SubmitEvent) {
    e.preventDefault();
    addLoading = true;
    addError = '';

    const res = await fetch('/api/children', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: addName, birthDate: addBirthDate }),
    });

    if (res.ok) {
      const child: Child = await res.json();
      childrenStore.setChildren([...childrenStore.children, child]);
      if (!childrenStore.activeChildId) {
        childrenStore.setActiveChildId(child.id);
      }
      addName = '';
      addBirthDate = '';
    } else {
      const data = await res.json().catch(() => ({}));
      addError = data.error ?? cs.error;
    }
    addLoading = false;
  }

  function startEdit(child: Child) {
    editState = { id: child.id, name: child.name, birthDate: child.birthDate.split('T')[0] };
    editError = '';
  }

  async function saveEdit(e: SubmitEvent) {
    e.preventDefault();
    if (!editState) return;
    editLoading = true;
    editError = '';

    const res = await fetch(`/api/children/${editState.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editState.name, birthDate: editState.birthDate }),
    });

    if (res.ok) {
      const updated: Child = await res.json();
      childrenStore.setChildren(
        childrenStore.children.map((c) => (c.id === updated.id ? updated : c))
      );
      editState = null;
    } else {
      const data = await res.json().catch(() => ({}));
      editError = data.error ?? cs.error;
    }
    editLoading = false;
  }

  async function deleteChild(id: string) {
    const res = await fetch(`/api/children/${id}`, { method: 'DELETE' });
    if (res.ok) {
      childrenStore.setChildren(childrenStore.children.filter((c) => c.id !== id));
      if (childrenStore.activeChildId === id) {
        const remaining = childrenStore.children.filter((c) => c.id !== id);
        childrenStore.setActiveChildId(remaining[0]?.id ?? null);
      }
    }
    deleteConfirmId = null;
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    goto('/login');
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
  }
</script>

<div class="p-4 max-w-lg mx-auto pb-8">
  <h1 class="text-xl font-bold text-text mb-6">Nastavení</h1>

  <!-- Children section -->
  <section class="mb-8">
    <h2 class="text-base font-semibold text-text mb-3">Děti</h2>

    {#if childrenStore.children.length === 0}
      <p class="text-text-muted text-sm mb-4">Zatím nemáte přidané žádné dítě.</p>
    {:else}
      <ul class="flex flex-col gap-2 mb-4">
        {#each childrenStore.children as child}
          <li class="bg-white rounded-xl border border-surface-dark p-4">
            {#if editState?.id === child.id}
              <!-- Edit form -->
              <form onsubmit={saveEdit} class="flex flex-col gap-3">
                {#if editError}
                  <p class="text-sm text-red-600">{editError}</p>
                {/if}
                <div>
                  <label class="block text-xs font-medium text-text-muted mb-1">Jméno</label>
                  <input
                    type="text"
                    bind:value={editState.name}
                    required
                    class="w-full border border-surface-dark rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-text-muted mb-1">Datum narození</label>
                  <input
                    type="date"
                    bind:value={editState.birthDate}
                    required
                    class="w-full border border-surface-dark rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div class="flex gap-2 justify-end">
                  <button
                    type="button"
                    onclick={() => (editState = null)}
                    class="px-3 py-1.5 text-sm text-text-muted rounded-lg hover:bg-surface transition-colors"
                  >
                    {cs.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg disabled:opacity-50"
                  >
                    {editLoading ? cs.loading : cs.save}
                  </button>
                </div>
              </form>
            {:else if deleteConfirmId === child.id}
              <!-- Delete confirmation -->
              <div class="flex flex-col gap-3">
                <p class="text-sm text-text">
                  Opravdu smazat <strong>{child.name}</strong>? Tato akce je nevratná.
                </p>
                <div class="flex gap-2 justify-end">
                  <button
                    onclick={() => (deleteConfirmId = null)}
                    class="px-3 py-1.5 text-sm text-text-muted rounded-lg hover:bg-surface transition-colors"
                  >
                    {cs.cancel}
                  </button>
                  <button
                    onclick={() => deleteChild(child.id)}
                    class="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg"
                  >
                    {cs.delete}
                  </button>
                </div>
              </div>
            {:else}
              <!-- Display row -->
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-text">{child.name}</p>
                  <p class="text-xs text-text-muted mt-0.5">nar. {formatDate(child.birthDate)}</p>
                </div>
                <div class="flex gap-2">
                  <button
                    onclick={() => startEdit(child)}
                    class="text-sm text-primary px-2 py-1 rounded-lg hover:bg-surface transition-colors"
                  >
                    Upravit
                  </button>
                  <button
                    onclick={() => (deleteConfirmId = child.id)}
                    class="text-sm text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    {cs.delete}
                  </button>
                </div>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}

    <!-- Add child form -->
    <div class="bg-white rounded-xl border border-surface-dark p-4">
      <h3 class="text-sm font-semibold text-text mb-3">Přidat dítě</h3>
      {#if addError}
        <p class="text-sm text-red-600 mb-2">{addError}</p>
      {/if}
      <form onsubmit={addChild} class="flex flex-col gap-3">
        <div>
          <label for="add-name" class="block text-xs font-medium text-text-muted mb-1">Jméno</label>
          <input
            id="add-name"
            type="text"
            bind:value={addName}
            required
            placeholder="Jméno dítěte"
            class="w-full border border-surface-dark rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label for="add-birth" class="block text-xs font-medium text-text-muted mb-1">Datum narození</label>
          <input
            id="add-birth"
            type="date"
            bind:value={addBirthDate}
            required
            class="w-full border border-surface-dark rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          disabled={addLoading}
          class="w-full bg-primary text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50 transition-opacity"
        >
          {addLoading ? cs.loading : 'Přidat dítě'}
        </button>
      </form>
    </div>
  </section>

  <!-- Logout -->
  <section>
    <button
      onclick={logout}
      class="w-full border border-surface-dark text-text-muted rounded-xl py-3 text-sm hover:bg-surface transition-colors"
    >
      {cs.logout}
    </button>
  </section>
</div>
