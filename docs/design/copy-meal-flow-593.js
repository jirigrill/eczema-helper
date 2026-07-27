// PROTOTYPE #593 — render logic for the copy-meal flow variants. Throwaway.
'use strict';

// ---- shared chrome ----------------------------------------------------------
function phone(tag, inner) {
  return `
    <div>
      <div class="frame-tag mb-2">▸ ${tag}</div>
      <div class="phone">
        <div class="screen">
          <div class="island"></div>
          <div class="statusbar"><span>9:41</span><span>●●● ◐</span></div>
          <div class="content">${inner}</div>
        </div>
      </div>
    </div>`;
}

function switcher(hostId, options, onPick) {
  const host = document.getElementById(hostId);
  function paint(active) {
    host.innerHTML = options
      .map(
        (o) => `<button data-k="${o.key}"
          class="rounded-full px-3 py-1.5 text-[13px] font-semibold border ${
            o.key === active
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-text border-surface-dark'
          }">${o.label}</button>`,
      )
      .join('');
    host.querySelectorAll('button').forEach((b) =>
      b.addEventListener('click', () => {
        paint(b.dataset.k);
        onPick(b.dataset.k);
      }),
    );
  }
  paint(options[0].key);
  onPick(options[0].key);
}
// ---- day-view header + meals card, mirroring the real MealCard ---------------
// One filled slot (Oběd) is the copy source across every entry variant.
function dayHeader() {
  return `
    <div class="px-5 pt-1 pb-3">
      <div class="eyebrow">Pondělí · 5. 5.</div>
      <div class="text-[24px] font-bold tracking-tight">Den</div>
    </div>`;
}

// A meals card whose Oběd row is rendered by `lunchRow` (variant-specific).
function mealsCard(lunchRow) {
  return `
    <div class="mx-5 mb-3 rounded-2xl border border-surface-dark bg-white overflow-hidden">
      <div class="px-4 pt-3 pb-1"><div class="eyebrow">Dnešní jídla</div></div>
      <div class="px-4 divide-y divide-surface-dark">
        <!-- Snídaně: filled, quiet -->
        <div class="flex items-center gap-3 py-2">
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary">🌅</div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-semibold">Snídaně</div>
            <div class="text-[11px] text-text-muted">ovesná kaše · banán</div>
          </div>
          <span class="w-5 text-center text-sm text-text-muted">›</span>
        </div>
        <!-- Oběd: the copy source -->
        ${lunchRow}
        <!-- Svačina: empty -->
        <div class="flex items-center gap-3 py-2">
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-white text-text-muted/50">🍎</div>
          <div class="min-w-0 flex-1"><div class="text-sm font-medium text-text-muted/70">Svačina</div></div>
          <span class="w-5 text-center text-lg leading-none text-primary">+</span>
        </div>
      </div>
    </div>`;
}

// ---- HALF 1: entry-point variants -------------------------------------------
// The filled Oběd row (foods: rýže · kuřecí · mrkev), differing only in the copy affordance.
function lunchBody() {
  return `
    <div class="flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary">☀️</div>
    <div class="min-w-0 flex-1">
      <div class="text-sm font-semibold">Oběd</div>
      <div class="text-[11px] text-text-muted">rýže · kuřecí · mrkev</div>
    </div>`;
}

const ENTRY = {
  // A — explicit copy icon inline on the row, beside the chevron.
  icon: () =>
    dayHeader() +
    mealsCard(`
      <div class="flex items-center gap-2 py-2">
        <div class="flex items-center gap-3 min-w-0 flex-1">${lunchBody()}</div>
        <button title="Kopírovat" class="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-dark">
          <!-- two-rectangles copy glyph -->
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
        </button>
        <span class="w-5 text-center text-sm text-text-muted">›</span>
      </div>`) +
    hint('Kopírovat žije jako <b>ikona přímo na řádku</b> — jeden tap, hned vidět. Přidává druhou akci vedle šipky do editoru.'),

  // B — overflow menu (⋯) on the row; copy is one item in a small sheet.
  menu: () =>
    dayHeader() +
    mealsCard(`
      <div class="flex items-center gap-2 py-2">
        <div class="flex items-center gap-3 min-w-0 flex-1">${lunchBody()}</div>
        <button title="Více" class="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-dark text-xl leading-none">⋯</button>
        <span class="w-5 text-center text-sm text-text-muted">›</span>
      </div>`) +
    sheet('Oběd', [
      { glyph: copyGlyph(), label: 'Kopírovat do…', primary: true },
      { glyph: '🗑', label: 'Smazat', danger: true },
    ]) +
    hint('Řádek zůstává čistý — kopírování se skrývá pod <b>⋯</b>. Dva tapy, ale škáluje na další akce (smazat, duplikovat).'),

  // C — copy action lives inside the meal editor, not on the day view.
  editor: () => editorScreen() + hint('Na day view žádná ikona. Kopírování je akce <b>uvnitř editoru jídla</b> (kam vede šipka ›) — méně nápadné, ale bez rozšíření řádku.'),
};

function copyGlyph() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`;
}

function hint(html) {
  return `<div class="mx-5 mt-1 mb-4 rounded-xl border border-dashed border-surface-dark bg-white/60 p-3 text-[11px] leading-relaxed text-text-muted">${html}</div>`;
}

// A bottom action sheet (variant B), shown docked at the bottom of the screen.
function sheet(title, items) {
  return `
    <div class="absolute inset-x-0 bottom-0 z-[70]">
      <div class="mx-2 mb-2 rounded-2xl border border-surface-dark bg-white p-2 shadow-lg">
        <div class="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">${title}</div>
        ${items
          .map(
            (it) => `<button class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${
              it.danger ? 'text-danger' : it.primary ? 'text-primary font-semibold' : 'text-text'
            } hover:bg-surface-dark">
              <span class="flex h-6 w-6 items-center justify-center">${it.glyph}</span>${it.label}
            </button>`,
          )
          .join('')}
      </div>
      <div class="mx-2 mb-3 rounded-2xl bg-white p-3 text-center text-sm font-semibold text-primary shadow-lg">Zrušit</div>
    </div>`;
}

// Variant C — the meal editor with a copy affordance in its overflow / footer.
function editorScreen() {
  return `
    <div class="flex items-center justify-between px-5 pt-1 pb-3">
      <button class="text-2xl leading-none text-text-muted">‹</button>
      <div class="text-sm font-semibold">Oběd · 5. 5.</div>
      <button title="Více" class="text-xl leading-none text-text-muted">⋯</button>
    </div>
    <div class="mx-5 mb-3 rounded-2xl border border-surface-dark bg-white p-4">
      <div class="eyebrow mb-2">Položky</div>
      ${['rýže', 'kuřecí', 'mrkev']
        .map(
          (f) =>
            `<div class="flex items-center justify-between border-b border-surface-dark py-2 text-sm last:border-0">${f}<span class="text-text-muted">✎</span></div>`,
        )
        .join('')}
    </div>
    <div class="mx-5">
      <button class="flex w-full items-center justify-center gap-2 rounded-xl border border-surface-dark bg-white py-3 text-sm font-semibold text-primary">
        ${copyGlyph()} Kopírovat toto jídlo do…
      </button>
    </div>`;
}

// ---- HALF 2: destination-picker variants ------------------------------------
// Model: copying "Oběd (rýže · kuřecí · mrkev)" for the mother. Today = Po 5. 5.
// Days: past + today pickable; future disabled. Some slots occupied (→ merge).
const SLOTS = [
  { key: 'breakfast', label: 'Snídaně', glyph: '🌅' },
  { key: 'lunch', label: 'Oběd', glyph: '☀️' },
  { key: 'snack', label: 'Svačina', glyph: '🍎' },
  { key: 'dinner', label: 'Večeře', glyph: '🌙' },
];
// occupied[dayOffset] = set of slot keys already having a meal for this actor.
const DAYS = [
  { off: -3, dow: 'Pá', dm: '2. 5.', occupied: ['lunch', 'dinner'] },
  { off: -2, dow: 'So', dm: '3. 5.', occupied: ['breakfast'] },
  { off: -1, dow: 'Ne', dm: '4. 5.', occupied: [] },
  { off: 0, dow: 'Po', dm: '5. 5.', today: true, occupied: ['breakfast', 'lunch'] },
  { off: 1, dow: 'Út', dm: '6. 5.', future: true, occupied: [] },
  { off: 2, dow: 'St', dm: '7. 5.', future: true, occupied: [] },
];

function pickerHeader() {
  return `
    <div class="px-5 pt-1 pb-2">
      <div class="eyebrow">Kopíruji · Já</div>
      <div class="text-[20px] font-bold tracking-tight">Kam zkopírovat?</div>
      <div class="mt-1 rounded-xl bg-surface-dark/60 px-3 py-2 text-[11px] text-text-muted">
        ☀️ Oběd — <span class="text-text">rýže · kuřecí · mrkev</span>
      </div>
    </div>`;
}

// Occupied slot → merge hint; free → plain. Future day → all slots disabled.
function slotChip(day, slot) {
  const occupied = day.occupied.includes(slot.key);
  if (day.future)
    return `<div class="rounded-lg border border-surface-dark bg-surface px-2 py-2 text-center text-[11px] text-text-muted/40">${slot.glyph}</div>`;
  return `
    <button class="rounded-lg border px-2 py-2 text-center text-[11px] ${
      occupied
        ? 'border-primary/40 bg-primary/5 text-primary'
        : 'border-surface-dark bg-white text-text hover:border-primary'
    }">
      <div>${slot.glyph}</div>
      <div class="mt-0.5 font-medium">${slot.label}</div>
      ${occupied ? '<div class="mt-0.5 text-[9px] text-primary/80">sloučit</div>' : ''}
    </button>`;
}

const DEST = {
  // A — day grid: pick a day first (grid of day tiles), slots expand under the chosen day.
  grid: () =>
    pickerHeader() +
    `<div class="px-5 pb-3">
      <div class="grid grid-cols-3 gap-2">
        ${DAYS.map(
          (d) => `
          <div class="rounded-xl border ${
            d.today ? 'border-primary' : 'border-surface-dark'
          } ${d.future ? 'opacity-40' : 'bg-white'} p-2 text-center">
            <div class="text-[10px] uppercase tracking-wide text-text-muted">${d.dow}${d.today ? ' · dnes' : ''}</div>
            <div class="text-sm font-semibold ${d.today ? 'text-primary' : ''}">${d.dm}</div>
            ${d.future ? '<div class="mt-1 text-[9px] text-text-muted">nelze</div>' : `<div class="mt-1 text-[9px] text-text-muted">${d.occupied.length ? d.occupied.length + '× obsazeno' : 'volné'}</div>`}
          </div>`,
        ).join('')}
      </div>
      <div class="mt-4 rounded-xl border border-primary bg-white p-3">
        <div class="eyebrow mb-2">Ne 4. 5. · vyber slot</div>
        <div class="grid grid-cols-4 gap-2">
          ${SLOTS.map((s) => slotChip(DAYS[2], s)).join('')}
        </div>
      </div>
    </div>` +
    hint('Nejdřív <b>den</b> (mřížka), pak <b>slot</b> pod ním. Budoucí dny zašedlé. Obsazený slot jde vybrat — označen „sloučit“.'),

  // B — day list: each past/today day is a row; its 4 slots sit inline, tap one to pick day+slot at once.
  list: () =>
    pickerHeader() +
    `<div class="px-5 pb-3 space-y-2">
      ${DAYS.filter((d) => !d.future)
        .slice()
        .reverse()
        .map(
          (d) => `
        <div class="rounded-xl border ${d.today ? 'border-primary' : 'border-surface-dark'} bg-white p-2">
          <div class="mb-1.5 flex items-baseline gap-2 px-1">
            <span class="text-sm font-semibold ${d.today ? 'text-primary' : ''}">${d.dow} ${d.dm}</span>
            ${d.today ? '<span class="text-[10px] text-text-muted">dnes</span>' : ''}
          </div>
          <div class="grid grid-cols-4 gap-1.5">
            ${SLOTS.map((s) => slotChip(d, s)).join('')}
          </div>
        </div>`,
        )
        .join('')}
      <div class="rounded-xl border border-dashed border-surface-dark p-2 text-center text-[11px] text-text-muted/60">
        Budoucí dny nelze — kopírovat jde jen do dneška a dozadu
      </div>
    </div>` +
    hint('Každý den je řádek se všemi 4 sloty naráz — <b>jeden tap = den + slot</b>. Budoucí dny se vůbec nezobrazí. Delší scroll, ale nejrychlejší volba.'),
};

// ---- boot -------------------------------------------------------------------
const entryFrames = document.getElementById('entry-frames');
const destFrames = document.getElementById('dest-frames');
const ENTRY_TAGS = { icon: 'A · Ikona na řádku', menu: 'B · ⋯ menu', editor: 'C · V editoru' };
const DEST_TAGS = { grid: 'A · Mřížka dnů', list: 'B · Seznam dnů' };

switcher(
  'entry-switch',
  [
    { key: 'icon', label: 'A · Ikona na řádku' },
    { key: 'menu', label: 'B · ⋯ menu' },
    { key: 'editor', label: 'C · V editoru jídla' },
  ],
  (k) => {
    entryFrames.innerHTML = phone(ENTRY_TAGS[k], ENTRY[k]());
  },
);

switcher(
  'dest-switch',
  [
    { key: 'grid', label: 'A · Mřížka dnů → slot' },
    { key: 'list', label: 'B · Seznam dnů + sloty' },
  ],
  (k) => {
    destFrames.innerHTML = phone(DEST_TAGS[k], DEST[k]());
  },
);

