export const cs = {
  login: 'Přihlásit se',
  logout: 'Odhlásit se',
  register: 'Registrovat',
  calendar: 'Kalendář',
  food: 'Jídlo',
  photos: 'Fotky',
  trends: 'Trendy',
  settings: 'Nastavení',
  save: 'Uložit',
  cancel: 'Zrušit',
  delete: 'Smazat',
  loading: 'Načítám…',
  error: 'Nastala chyba'
} as const;

export type TranslationKey = keyof typeof cs;
