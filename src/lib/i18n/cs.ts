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
  close: 'Zavřít',
  back: 'Zpět',
  undo: 'Zpět',

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

  // Calendar
  previousMonth: 'Předchozí měsíc',
  nextMonth: 'Další měsíc',
  today: 'Dnes',
  dayDetail: 'Detail dne',
  elimination: 'Vyřazení',
  reintroduction: 'Znovuzavedení',
  eliminate: 'Vyřadit',
  reintroduce: 'Zavést zpět',
  selectStart: 'Klepněte na den pro začátek období',
  selectEnd: 'Klepněte na druhý den pro konec',
  noRecords: 'Žádné záznamy',
  nothingToReintroduce: 'Žádné vyřazené potraviny k znovuzavedení',
  selectPeriod: 'Vyberte období',
  selectEndSuffix: '— vyberte konec',
  editInCalendar: 'Upravit v kalendáři',

  // Food tracking
  eliminations: 'Eliminace',
  meals: 'Jídla',
  eliminated: 'Vyřazeno',
  reintroduced: 'Znovuzavedeno',
  neutral: 'Neutrální',
  copyFromYesterday: 'Kopírovat ze včerejška',
  noYesterdayLogs: 'Včera nejsou žádné záznamy k kopírování',
  copiedFromYesterday: 'Zkopírováno ze včerejška',
  noEliminationsToday: 'Žádné změny v dietě pro tento den',
  tapCategoryToEliminate: 'Klepněte na kategorii pro eliminaci',

  // Meals
  breakfast: 'Snídaně',
  lunch: 'Oběd',
  dinner: 'Večeře',
  snack: 'Svačina',
  mealType: 'Typ jídla',
  mealLabel: 'Poznámka',
  mealItems: 'Položky jídla',
  addMeal: 'Přidat jídlo',
  editMeal: 'Upravit jídlo',
  mealAdded: 'Jídlo bylo přidáno',
  mealUpdated: 'Jídlo bylo upraveno',
  mealDeleted: 'Jídlo bylo smazáno',
  noMealsToday: 'Žádná jídla pro tento den',
  addItem: 'Přidej položku…',
  pressEnterToAdd: 'Stiskněte Enter pro přidání',
  unknownItem: 'Neznámá položka',

  // Sync status
  synced: 'Synchronizováno',
  syncing: 'Synchronizuji…',
  pendingSync: 'Čeká na sync',
  offline: 'Offline',

  // Empty states
  addChildFirst: 'Nejprve přidejte dítě',
  goToSettings: 'Přejít do nastavení',
  loadingCategories: 'Načítám kategorie…',
} as const;

export type TranslationKey = keyof typeof cs;

/** Czech plural for "den" (day): 1 den, 2-4 dny, 5+ dní */
export function dayPlural(n: number): string {
  if (n === 1) return 'den';
  if (n >= 2 && n <= 4) return 'dny';
  return 'dní';
}

