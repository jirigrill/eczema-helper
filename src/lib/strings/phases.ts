import type { PhaseType } from '$lib/domain/models';

export type PhaseStrings = {
  label: string;       // full name used in headers and cards
  badgeLabel: string;  // short label used inside the colored badge pill
  description: string; // Czech prose shown in phase detail cards
};

export const phaseStrings = {
  reset: {
    label:       'Resetovací fáze',
    badgeLabel:  'Reset',
    description: 'Jezte normálně (kromě potvrzených alergií). Zaznamenáváme výchozí stav kůže miminka před zahájením eliminace.',
  },
  elimination: {
    label:       'Eliminační fáze',
    badgeLabel:  'Eliminace',
    description: 'Vylučte všechny sledované alergeny. Čekáme, až se stav kůže miminka ustálí.',
  },
  reintroduction: {
    label:       'Znovuzavádění',
    badgeLabel:  'Reintrodukce',
    description: 'Postupně zařazujte alergen zpět do jídelníčku. Sledujte kůži miminka každý den.',
  },
  rest: {
    label:       'Klidový režim',
    badgeLabel:  'Odpočinek',
    description: 'Kůže se zotavuje — jezte pouze potraviny, které miminko toleruje. Žádné nové alergeny nezařazujte.',
  },
  'tolerance-building': {
    label:       'Budování tolerance',
    badgeLabel:  'Budování tolerance',
    description: 'Malé dávky alergenu max 2× týdně pro budování tolerance. Pokračujte, dokud miminko alergen toleruje.',
  },
} as const satisfies Record<PhaseType, PhaseStrings>;
