<script lang="ts">
  import { cs } from '$lib/i18n/cs';
  import { childrenStore } from '$lib/stores/children.svelte';
  import { goto } from '$app/navigation';
  import type { Child } from '$lib/domain/models';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Local state for children, initialized from server data
  // This avoids conflicts with the layout's store syncing
  let children = $state<Child[]>(data.children);

  let addName = $state('');
  let addBirthDate = $state('');
  let addLoading = $state(false);
  let addError = $state('');

  // Edit state as separate primitives (works better with Svelte 5 reactivity)
  let editingChildId = $state<string | null>(null);
  let editingName = $state('');
  let editingBirthDate = $state('');
  let editLoading = $state(false);
  let editError = $state('');
  let editSuccess = $state(false);

  let deleteConfirmId = $state<string | null>(null);

  async function addChild(e: SubmitEvent) {
    e.preventDefault();
    // Blur active element to dismiss keyboard before DOM changes
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    addLoading = true;
    addError = '';

    const res = await fetch('/api/children', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: addName, birthDate: addBirthDate }),
    });

    if (res.ok) {
      const { data: child } = (await res.json()) as { data: Child };
      // Update local state (for this page's UI)
      children = [...children, child];
      // Update global store (for other parts of the app)
      childrenStore.setChildren(children);
      if (!childrenStore.activeChildId) {
        childrenStore.setActiveChildId(child.id);
      }
      addName = '';
      addBirthDate = '';
      // Show success on the newly created child card
      editSuccess = true;
      setTimeout(() => (editSuccess = false), 3000);
      // Scroll to top so the new child card is visible
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
      });
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
      // Update local state (for this page's UI)
      children = children.map((c) => (c.id === updated.id ? updated : c));
      // Update global store (for other parts of the app)
      childrenStore.setChildren(children);
      editingChildId = null;
      // Show success confirmation
      editSuccess = true;
      setTimeout(() => (editSuccess = false), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      editError = data.error ?? cs.error;
    }
    editLoading = false;
  }

  async function deleteChild(id: string) {
    const res = await fetch(`/api/children/${id}`, { method: 'DELETE' });
    if (res.ok) {
      // Update local state (for this page's UI)
      children = children.filter((c) => c.id !== id);
      // Update global store (for other parts of the app)
      childrenStore.setChildren(children);
      if (childrenStore.activeChildId === id) {
        childrenStore.setActiveChildId(children[0]?.id ?? null);
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
  <!-- Child section -->
  <section class="mb-8">
    <h2 class="text-base font-semibold text-text mb-3">{cs.child}</h2>

    {#if children.length === 0}
      <div class="text-center py-4 mb-4">
        <div class="text-4xl mb-2">👶</div>
        <p class="text-text-muted text-sm">{cs.noChildYet}</p>
      </div>
    {:else}
      {#key `${editingChildId}-${deleteConfirmId}`}
      <ul class="flex flex-col gap-2 mb-4">
        {#each children as child (child.id)}
          <li class="bg-white rounded-xl border border-surface-dark p-4">
              {#if editingChildId === child.id}
                <!-- Edit form -->
                <form onsubmit={saveEdit} class="flex flex-col gap-3">
                  {#if editError}
                    <p class="text-sm text-danger">{editError}</p>
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
                      class="px-4 py-2 min-h-[44px] text-sm text-text-muted rounded-lg hover:bg-surface transition-colors"
                    >
                      {cs.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={editLoading}
                      class="px-4 py-2 min-h-[44px] text-sm bg-primary text-white rounded-lg disabled:opacity-50"
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
                      class="px-4 py-2 min-h-[44px] text-sm text-text-muted rounded-lg hover:bg-surface transition-colors"
                    >
                      {cs.cancel}
                    </button>
                    <button
                      onclick={() => deleteChild(child.id)}
                      class="px-4 py-2 min-h-[44px] text-sm bg-danger text-white rounded-lg"
                    >
                      {cs.delete}
                    </button>
                  </div>
                </div>
              {:else}
                <!-- Display row -->
                {#if editSuccess}
                  <p class="text-sm text-success mb-2 flex items-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {cs.childUpdated}
                  </p>
                {/if}
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium text-text">{child.name}</p>
                    <p class="text-xs text-text-muted mt-0.5">{cs.born} {formatDate(child.birthDate)}</p>
                  </div>
                  <div class="flex gap-2">
                    <button
                      onclick={() => startEdit(child)}
                      class="text-sm text-primary px-3 py-2 min-h-[44px] rounded-lg hover:bg-surface transition-colors"
                    >
                      {cs.edit}
                    </button>
                    <button
                      onclick={() => (deleteConfirmId = child.id)}
                      class="text-sm text-danger px-3 py-2 min-h-[44px] rounded-lg hover:bg-danger/10 transition-colors"
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

    <!-- Add child form - only show when no child exists (single-child app) -->
    {#if children.length === 0}
    <div class="bg-white rounded-xl border border-surface-dark p-4">
      <h3 class="text-sm font-semibold text-text mb-3">{cs.addChild}</h3>
      {#if addError}
        <p class="text-sm text-danger mb-2">{addError}</p>
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
          class="w-full bg-primary text-white rounded-lg py-2.5 min-h-[44px] text-sm font-medium disabled:opacity-50 transition-opacity"
        >
          {addLoading ? cs.loading : cs.addChild}
        </button>
      </form>
    </div>
    {/if}
  </section>

  <!-- Logout -->
  <section>
    <button
      onclick={logout}
      class="w-full border border-danger/30 text-danger rounded-xl py-3 min-h-[44px] text-sm hover:bg-danger/10 transition-colors"
    >
      {cs.logout}
    </button>
  </section>
</div>
