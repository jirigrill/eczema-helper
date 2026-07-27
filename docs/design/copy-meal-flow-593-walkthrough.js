// PROTOTYPE #593 — end-to-end copy-meal walkthrough. Throwaway.
'use strict';

// Flow states, in order.
const STEPS = [
  { key: 'day', label: 'Dnes' },
  { key: 'editor', label: 'Editor' },
  { key: 'menu', label: '… menu' },
  { key: 'picker', label: 'Picker' },
  { key: 'done', label: 'Hotovo' },
];

// Source meal being copied, and the live picker selection (reused from D′).
const SLOTS = [
  { key: 'breakfast', label: 'Snídaně', glyph: '🌅' },
  { key: 'lunch', label: 'Oběd', glyph: '☀️' },
  { key: 'snack', label: 'Svačina', glyph: '🍎' },
  { key: 'dinner', label: 'Večeře', glyph: '🌙' },
];
const SOURCE = { slot: 'lunch', foods: ['rýže', 'kuřecí', 'mrkev'] };

const DOW = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
const STRIP_DAYS = (() => {
  const out = [];
  for (let off = -10; off <= 3; off++) {
    out.push({
      off,
      num: 5 + off,
      dow: DOW[(((1 + off) % 7) + 7) % 7],
      isToday: off === 0,
      isFuture: off > 0,
      occupied:
        off === -3 ? ['lunch', 'dinner'] : off === 0 ? ['breakfast', 'lunch'] : off === -2 ? ['breakfast'] : [],
    });
  }
  return out;
})();

// Whole-flow state.
const S = { step: 'day', menuOpen: false, sheetOpen: false, dayOff: -1, slot: SOURCE.slot };

const frame = document.getElementById('frame');
const notesEl = document.getElementById('notes');
const railEl = document.getElementById('steprail');

function go(step) { S.step = step; S.menuOpen = false; S.sheetOpen = false; render(); }

// ---- chrome -----------------------------------------------------------------
function phone(tag, inner) {
  return `
    <div class="frame-tag mb-2">▸ ${tag}</div>
    <div class="phone"><div class="screen">
      <div class="island"></div>
      <div class="statusbar"><span>9:41</span><span>●●● ◐</span></div>
      <div class="content">${inner}</div>
    </div></div>`;
}
function slotOf(key) { return SLOTS.find((s) => s.key === key); }
function dayOf(off) { return STRIP_DAYS.find((d) => d.off === off); }
function occupiedAt(off, slot) { const d = dayOf(off); return d ? d.occupied.includes(slot) : false; }
function dayLabel(off) {
  const d = dayOf(off);
  return d.isToday ? 'dnes' : off === -1 ? 'včera' : `${d.dow} ${d.num}. 5.`;
}

// ---- screen 1: DAY VIEW — tap the Oběd meal ---------------------------------
function screenDay() {
  const row = (glyph, label, foods, filled, action) => `
    <div class="flex items-center gap-3 py-2 ${action ? 'cursor-pointer -mx-2 px-2 rounded-lg hover:bg-surface-dark/50' : ''}" ${action ? `data-go="editor"` : ''}>
      <div class="flex h-9 w-9 items-center justify-center rounded-full bg-white ${filled ? 'text-primary' : 'text-text-muted/50'}">${glyph}</div>
      <div class="min-w-0 flex-1">
        <div class="text-sm ${filled ? 'font-semibold' : 'font-medium text-text-muted/70'}">${label}</div>
        ${foods ? `<div class="text-[11px] text-text-muted">${foods}</div>` : ''}
      </div>
      <span class="w-5 text-center ${filled ? 'text-sm text-text-muted' : 'text-lg leading-none text-primary'}">${filled ? '›' : '+'}</span>
    </div>`;
  return phone('DNES · den view', `
    <div class="px-5 pt-1 pb-3"><div class="eyebrow">Pondělí · 5. 5.</div><div class="text-[24px] font-bold tracking-tight">Den</div></div>
    <div class="mx-5 mb-3 rounded-2xl border border-surface-dark bg-white overflow-hidden">
      <div class="px-4 pt-3 pb-1"><div class="eyebrow">Dnešní jídla</div></div>
      <div class="px-4 divide-y divide-surface-dark">
        ${row('🌅', 'Snídaně', 'ovesná kaše · banán', true, false)}
        ${row('☀️', 'Oběd', 'rýže · kuřecí · mrkev', true, true)}
        ${row('🍎', 'Svačina', '', false, false)}
        ${row('🌙', 'Večeře', '', false, false)}
      </div>
    </div>
    <div class="mx-5 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-2 text-center text-[11px] text-primary">
      ↑ Klepni na <b>Oběd</b> — to je jídlo, které chceme zkopírovat
    </div>`);
}

// ---- screen 2: MEAL EDITOR — the "…" overflow in the header -----------------
function screenEditor() {
  return phone('MEALEDITOR', `
    <div class="sticky top-0 z-20 flex items-center gap-3 border-b border-surface-dark bg-surface px-4 py-2.5">
      <button class="text-lg leading-none text-text" data-go="day">‹</button>
      <h1 class="flex-1 text-[24px] font-bold tracking-tight">Oběd</h1>
      <button class="flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none text-text-muted hover:bg-surface-dark" data-menu>⋯</button>
    </div>
    <div class="body-muted px-4 pt-2 text-[13px] text-text-muted">Pondělí 5. května</div>
    <div class="mx-4 my-3 rounded-2xl border border-surface-dark bg-white p-4">
      <div class="eyebrow mb-2">Položky</div>
      ${SOURCE.foods
        .map((f) => `<div class="flex items-center justify-between border-b border-surface-dark py-2.5 text-sm last:border-0">${f}<span class="text-text-muted">✎</span></div>`)
        .join('')}
    </div>
    <div class="mx-4 rounded-xl bg-surface-dark/60 p-3 text-center text-[11px] text-text-muted">
      Kopírování žije pod <b>⋯</b> vpravo nahoře (locked: entry = v editoru)
    </div>
    ${S.menuOpen ? overflowSheet() : ''}`);
}

// The "…" overflow action sheet — "Kopírovat jídlo" is the copy entry point.
function overflowSheet() {
  const item = (glyph, label, attrs, cls) => `
    <button ${attrs} class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${cls} hover:bg-surface-dark">
      <span class="flex h-6 w-6 items-center justify-center">${glyph}</span>${label}</button>`;
  return `
    <div data-menu-close class="absolute inset-0 z-[60] bg-black/30"></div>
    <div class="absolute inset-x-0 bottom-0 z-[70]">
      <div class="mx-2 mb-2 rounded-2xl border border-surface-dark bg-white p-2 shadow-lg">
        <div class="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Oběd · 5. 5.</div>
        ${item('📋', 'Kopírovat jídlo', 'data-go="picker"', 'text-primary font-semibold')}
        ${item('✎', 'Upravit položky', 'data-menu-close', 'text-text')}
        ${item('🗑', 'Smazat jídlo', 'data-menu-close', 'text-danger')}
      </div>
      <div data-menu-close class="mx-2 mb-3 rounded-2xl bg-white p-3 text-center text-sm font-semibold text-primary shadow-lg">Zrušit</div>
    </div>`;
}

// ---- screen 3/4: PICKER (D′) — DayStrip + slot sheet ------------------------
function dayCell(d) {
  const selected = d.off === S.dayOff;
  const base = selected ? 'bg-primary text-white' : d.isFuture ? 'text-text-muted/50' : 'text-text-muted';
  // Merge is silent — no occupied marker on the strip; only today-ring + selection dot.
  return `
    <button data-day="${d.off}" ${d.isFuture ? 'disabled' : ''}
      class="flex w-10 shrink-0 snap-center flex-col items-center gap-1 rounded-lg py-2 ${base} ${d.isFuture ? 'cursor-not-allowed' : ''}">
      <span class="text-[10px] uppercase ${selected ? 'opacity-80' : ''}">${d.dow}</span>
      <span class="text-sm font-semibold">${d.num}</span>
      ${
        d.isToday && !selected ? '<span class="ring-primary h-1.5 w-1.5 rounded-full ring-1 bg-transparent"></span>'
        : selected ? '<span class="h-1.5 w-1.5 rounded-full bg-white/30 ring-1 ring-white"></span>'
        : '<span class="h-1.5 w-1.5 rounded-full bg-transparent"></span>'
      }
    </button>`;
}
function slotSheet() {
  if (!S.sheetOpen) return '';
  return `
    <div data-sheet-close class="absolute inset-0 z-[60] bg-black/30"></div>
    <div class="absolute inset-x-0 bottom-0 z-[70]">
      <div class="mx-2 mb-2 rounded-2xl border border-surface-dark bg-white p-2 shadow-lg">
        <div class="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Do kterého jídla?</div>
        ${SLOTS.map((s) => {
          const sel = s.key === S.slot;
          // Merge is silent — no "obsazeno" marker; every slot is a plain target.
          return `<button data-slot="${s.key}" class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${sel ? 'bg-primary/5 text-primary font-semibold' : 'text-text'} hover:bg-surface-dark">
            <span class="flex h-6 w-6 items-center justify-center">${s.glyph}</span>${s.label}
            ${sel ? '<span class="ml-auto text-primary">✓</span>' : ''}</button>`;
        }).join('')}
      </div>
      <div data-sheet-close class="mx-2 mb-3 rounded-2xl bg-white p-3 text-center text-sm font-semibold text-primary shadow-lg">Zrušit</div>
    </div>`;
}
function screenPicker() {
  const slot = slotOf(S.slot);
  // Merge is silent — the picker never mentions occupancy; confirm is always "Kopírovat sem".
  return phone("PICKER · D′", `
    <div class="sticky top-0 z-20 flex items-center gap-3 border-b border-surface-dark bg-surface px-4 py-2.5">
      <button class="text-lg leading-none text-text" data-go="editor">‹</button>
      <h1 class="flex-1 text-sm font-bold">Kam zkopírovat?</h1>
    </div>
    <div class="px-5 pt-3">
      <div class="rounded-xl bg-surface-dark/60 px-3 py-2 text-[11px] text-text-muted">📋 Kopíruji · Já &nbsp;☀️ Oběd — <span class="text-text">rýže · kuřecí · mrkev</span></div>
    </div>
    <div class="px-5 pt-3 pb-4">
      <div class="eyebrow mb-2">Do kterého dne?</div>
      <div class="-mx-1 mb-4 overflow-hidden">
        <div id="strip" class="flex snap-x gap-1 overflow-x-auto scroll-smooth pb-1" style="scrollbar-width:none">
          ${STRIP_DAYS.map(dayCell).join('')}
        </div>
      </div>
      <div class="eyebrow mb-2">Jídlo</div>
      <button data-openslot class="mb-4 flex w-full items-center gap-3 rounded-xl border border-surface-dark bg-white px-3 py-3 text-left hover:border-primary">
        <span class="flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary">${slot.glyph}</span>
        <div class="min-w-0 flex-1"><div class="text-sm font-semibold">${slot.label}</div>
          <div class="text-[11px] text-text-muted">${S.slot === SOURCE.slot ? 'stejný slot jako zdroj' : 'změněno'}</div></div>
        <span class="text-[11px] text-text-muted">změnit ›</span>
      </button>
      <div class="rounded-xl bg-surface-dark/60 px-3 py-2 text-center text-[12px] text-text-muted">
        Cíl: <b class="text-text">${dayLabel(S.dayOff)} · ${slot.label}</b>
      </div>
      <button data-go="done" class="mt-3 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white">Kopírovat sem</button>
    </div>
    ${slotSheet()}`);
}

// ---- screen 5: DONE — landed on the destination day with a toast ------------
function screenDone() {
  const slot = slotOf(S.slot);
  const merged = occupiedAt(S.dayOff, S.slot);
  // Merge is silent: the destination slot simply shows its resulting items (which,
  // if it was occupied, now include the copied foods). No merge is announced —
  // the toast reads the same either way, and only the undo remains as the net.
  const foods = merged ? 'rýže · dýně · rýže · kuřecí · mrkev' : 'rýže · kuřecí · mrkev';
  return phone('CÍLOVÝ DEN + toast', `
    <div class="px-5 pt-1 pb-3"><div class="eyebrow">${dayLabel(S.dayOff)}</div><div class="text-[24px] font-bold tracking-tight">Den</div></div>
    <div class="mx-5 mb-3 rounded-2xl border border-surface-dark bg-white overflow-hidden">
      <div class="px-4 pt-3 pb-1"><div class="eyebrow">Jídla</div></div>
      <div class="px-4">
        <div class="flex items-center gap-3 py-2 ring-2 ring-primary/30 rounded-lg -mx-1 px-1">
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary">${slot.glyph}</div>
          <div class="min-w-0 flex-1"><div class="text-sm font-semibold">${slot.label}</div>
            <div class="text-[11px] text-text-muted">${foods}</div></div>
          <span class="w-5 text-center text-sm text-text-muted">›</span>
        </div>
      </div>
    </div>
    <div class="absolute inset-x-3 bottom-6 z-40 flex items-center gap-3 rounded-xl bg-text px-4 py-3 text-white shadow-lg">
      <span class="text-sm">Zkopírováno do <b>${dayLabel(S.dayOff)} · ${slot.label}</b></span>
      <button data-go="editor" class="ml-auto text-sm font-semibold text-white/90 underline">Zpět</button>
      <button class="text-sm font-semibold underline">Vrátit</button>
    </div>`);
}

// ---- render + wiring --------------------------------------------------------
const NOTES = {
  day: '<b>1 · Dnes.</b> Klepnutím na <b>Oběd</b> otevřeš editor toho jídla. (Entry point je uzamčený na editor — na day view žádná ikona kopírování.)',
  editor: '<b>2 · MealEditor.</b> Kopírování žije pod <b>⋯</b> vpravo nahoře. Klepni na ⋯.',
  menu: '<b>3 · … menu.</b> Vyber <b>Kopírovat jídlo</b>. Ostatní akce (upravit, smazat) tu žijí vedle.',
  picker: '<b>4 · D′ picker.</b> Slot je předvyplněný na zdroj (Oběd) — hlavní volba je den (DayStrip). Klepni na den; „změnit“ přepne slot přes sheet. <b>O slučování se uživatelce nic neříká</b> — vždy jen „Kopírovat sem“; případné sloučení proběhne tiše. Potvrď.',
  done: '<b>5 · Hotovo.</b> Přistaneš na cílovém dni, jídlo zvýrazněné, toast „Zkopírováno“ s <b>Vrátit</b>. Když byl cíl obsazený, položky se tiše sloučily — jediná záchrana je <b>Vrátit</b> v toastu.',
};
const SCREENS = { day: screenDay, editor: screenEditor, menu: screenEditor, picker: screenPicker, done: screenDone };

function render() {
  if (S.step === 'menu') S.menuOpen = true; // "menu" = editor screen with sheet open
  frame.innerHTML = SCREENS[S.step]();
  notesEl.innerHTML = NOTES[S.step];
  paintRail();
  wire();
  if (S.step === 'picker') {
    const sel = frame.querySelector(`[data-day="${S.dayOff}"]`);
    if (sel) sel.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
}

function paintRail() {
  const idx = STEPS.findIndex((s) => s.key === S.step);
  railEl.innerHTML = STEPS.map((s, i) =>
    `<div class="flex items-center gap-2">
      <span class="step-dot ${i <= idx ? 'on' : ''}"></span>
      <span class="text-[12px] ${i === idx ? 'font-semibold text-text' : 'text-text-muted'}">${s.label}</span>
      ${i < STEPS.length - 1 ? '<span class="text-text-muted/40">→</span>' : ''}
    </div>`).join('');
}

function wire() {
  frame.querySelectorAll('[data-go]').forEach((el) => el.addEventListener('click', () => go(el.dataset.go)));
  const menuBtn = frame.querySelector('[data-menu]');
  if (menuBtn) menuBtn.addEventListener('click', () => { S.step = 'menu'; S.menuOpen = true; render(); });
  frame.querySelectorAll('[data-menu-close]').forEach((el) =>
    el.addEventListener('click', () => { S.step = 'editor'; S.menuOpen = false; render(); }));
  frame.querySelectorAll('[data-day]').forEach((b) =>
    b.addEventListener('click', () => { S.dayOff = Number(b.dataset.day); render(); }));
  const open = frame.querySelector('[data-openslot]');
  if (open) open.addEventListener('click', () => { S.sheetOpen = true; render(); });
  frame.querySelectorAll('[data-slot]').forEach((b) =>
    b.addEventListener('click', () => { S.slot = b.dataset.slot; S.sheetOpen = false; render(); }));
  frame.querySelectorAll('[data-sheet-close]').forEach((el) =>
    el.addEventListener('click', () => { S.sheetOpen = false; render(); }));
}

const ORDER = ['day', 'editor', 'menu', 'picker', 'done'];
document.getElementById('btn-back').addEventListener('click', () => {
  const i = ORDER.indexOf(S.step);
  if (i > 0) go(ORDER[i - 1]);
});
document.getElementById('btn-reset').addEventListener('click', () => {
  Object.assign(S, { step: 'day', menuOpen: false, sheetOpen: false, dayOff: -1, slot: SOURCE.slot });
  render();
});

render();

