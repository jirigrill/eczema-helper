export const cs = {
  // Auth
  login: 'Přihlásit se',
  logout: 'Odhlásit se',
  register: 'Registrovat',
  email: 'E-mail',
  password: 'Heslo',
  passwordHint: 'min. 8 znaků',
  name: 'Jméno',
  noAccount: 'Nemáte účet?',
  hasAccount: 'Máte účet?',
  registerLink: 'Registrovat se',

  // App title/branding
  appTitle: 'Sledování ekzému',
  appSubtitle: 'Eliminační dieta kojence',
  newAccount: 'Nový účet',
  eczemaTracker: 'Ekzém tracker',

  // Navigation
  calendar: 'Kalendář',
  food: 'Jídlo',
  photos: 'Fotky',
  trends: 'Trendy',
  settings: 'Nastavení',

  // Actions
  save: 'Uložit',
  cancel: 'Zrušit',
  delete: 'Smazat',
  edit: 'Upravit',
  add: 'Přidat',

  // Children management
  children: 'Děti',
  addChild: 'Přidat dítě',
  childName: 'Jméno dítěte',
  birthDate: 'Datum narození',
  born: 'nar.',
  noChildrenYet: 'Zatím nemáte přidané žádné dítě.',
  selectChild: 'Vybrat dítě',
  manageChildren: 'Správa dětí…',
  deleteConfirm: 'Opravdu smazat',
  deleteWarning: 'Tato akce je nevratná.',

  // Status
  loading: 'Načítám…',
  error: 'Nastala chyba',
  comingSoon: 'Připravujeme',
} as const;

export type TranslationKey = keyof typeof cs;
