<script lang="ts">
  import { cs } from '$lib/i18n/cs';
  import { childrenStore } from '$lib/stores/children.svelte';
  import { goto, invalidateAll } from '$app/navigation';
  import type { Child } from '$lib/domain/models';

  // Use $derived to react to store changes
  let children = $derived(childrenStore.children);

  let addName = $state('');
  let addBirthDate = $state('');
  let addLoading = $state(false);
  let addError = $state('');
  let addSuccess = $state(false);

  // Edit state as separate primitives (works better with Svelte 5 reactivity)
  let editingChildId = $state<string | null>(null);
  let editingName = $state('');
  let editingBirthDate = $state('');
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
      const { data: child } = (await res.json()) as { data: Child };
      childrenStore.setChildren([...childrenStore.children, child]);
      if (!childrenStore.activeChildId) {
        childrenStore.setActiveChildId(child.id);
      }
      addName = '';
      addBirthDate = '';
      addSuccess = true;
      setTimeout(() => (addSuccess = false), 3000);
      // Invalidate to force data refresh from server
      await invalidateAll();
    } else {
      const data = await res.json().catch(() => ({}));
      addError = data.error ?? cs.error;
    }
    addLoading = false;
  }

  function startEdit(child: Child) {
    editingChildId = child.id;
    editingName = child.name;
    // birthDate is already in YYYY-MM-DD format from the API
    editingBirthDate = child.birthDate;
    editError = '';
  }

  async function saveEdit(e: SubmitEvent) {
    e.preventDefault();
    if (!editingChildId) return;
    editLoading = true;
    editError = '';

    const res = await fetch(`/api/children/${editingChildId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingName, birthDate: editingBirthDate }),
    });

    if (res.ok) {
      const { data: updated } = (await res.json()) as { data: Child };
      childrenStore.setChildren(
        childrenStore.children.map((c) => (c.id === updated.id ? updated : c))
      );
      editingChildId = null;
      // Invalidate to force data refresh from server
      await invalidateAll();
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
      // Invalidate to force data refresh from server
      await invalidateAll();
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
  <!-- Children section -->
  <section class="mb-8">
    <h2 class="text-base font-semibold text-text mb-3">{cs.children}</h2>

    {#if children.length === 0}
      <p class="text-text-muted text-sm mb-4">{cs.noChildrenYet}</p>
    {:else}
      {#key `${editingChildId}-${deleteConfirmId}`}
      <ul class="flex flex-col gap-2 mb-4">
        {#each children as child (child.id)}
          <li class="bg-white rounded-xl border border-surface-dark p-4">
              {#if editingChildId === child.id}
                <!-- Edit form -->
                <form onsubmit={saveEdit} class="flex flex-col gap-3">
                  {#if editError}
                    <p class="text-sm text-red-600">{editError}</p>
                  {/if}
                  <div>
                    <label for="edit-name-{child.id}" class="block text-xs font-medium text-text-muted mb-1">{cs.name}</label>
                    <input
                      id="edit-name-{child.id}"
                      type="text"
                      bind:value={editingName}
                      required
                      class="w-full border border-surface-dark rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label for="edit-birth-{child.id}" class="block text-xs font-medium text-text-muted mb-1">{cs.birthDate}</label>
                    <input
                      id="edit-birth-{child.id}"
                      type="date"
                      bind:value={editingBirthDate}
                      required
                      class="w-full border border-surface-dark rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div class="flex gap-2 justify-end">
                    <button
                      type="button"
                      onclick={() => (editingChildId = null)}
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
                    {cs.deleteConfirm} <strong>{child.name}</strong>? {cs.deleteWarning}
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
                    <p class="text-xs text-text-muted mt-0.5">{cs.born} {formatDate(child.birthDate)}</p>
                  </div>
                  <div class="flex gap-2">
                    <button
                      onclick={() => startEdit(child)}
                      class="text-sm text-primary px-2 py-1 rounded-lg hover:bg-surface transition-colors"
                    >
                      {cs.edit}
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
      {/key}
    {/if}

    <!-- Add child form -->
    <div class="bg-white rounded-xl border border-surface-dark p-4">
      <h3 class="text-sm font-semibold text-text mb-3">{cs.addChild}</h3>
      {#if addSuccess}
        <p class="text-sm text-green-600 mb-2 flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          {cs.childAdded}
        </p>
      {/if}
      {#if addError}
        <p class="text-sm text-red-600 mb-2">{addError}</p>
      {/if}
      <form onsubmit={addChild} class="flex flex-col gap-3">
        <div>
          <label for="add-name" class="block text-xs font-medium text-text-muted mb-1">{cs.name}</label>
          <input
            id="add-name"
            type="text"
            bind:value={addName}
            required
            placeholder={cs.childName}
            class="w-full border border-surface-dark rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label for="add-birth" class="block text-xs font-medium text-text-muted mb-1">{cs.birthDate}</label>
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
          {addLoading ? cs.loading : cs.addChild}
        </button>
      </form>
    </div>
  </section>

  <!-- Logout -->
  <section>
    <button
      onclick={logout}
      class="w-full border border-red-200 text-red-600 rounded-xl py-3 text-sm hover:bg-red-50 transition-colors"
    >
      {cs.logout}
    </button>
  </section>
</div>
