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

  // Child management (single-child app)
  child: 'Dítě',
  addChild: 'Přidat dítě',
  childName: 'Jméno dítěte',
  birthDate: 'Datum narození',
  born: 'nar.',
  noChildYet: 'Zatím nemáte přidané dítě.',
  deleteConfirm: 'Opravdu smazat',
  deleteWarning: 'Tato akce je nevratná.',

  // Status
  loading: 'Načítám…',
  error: 'Nastala chyba',
  comingSoon: 'Připravujeme',

  // Success messages
  childAdded: 'Dítě bylo přidáno',
  childUpdated: 'Údaje byly uloženy',

  // Limits
  singleChildOnly: 'Tato aplikace podporuje pouze jedno dítě.',
} as const;

export type TranslationKey = keyof typeof cs;
