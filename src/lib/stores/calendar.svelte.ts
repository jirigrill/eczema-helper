import { getTodayIso, navigateMonth as navMonth } from '$lib/utils/calendar';

const now = new Date();

let _year = $state(now.getFullYear());
let _month = $state(now.getMonth()); // 0-indexed
let _selectedDate = $state<string | null>(null);

// Edit mode state
let _mode = $state<'view' | 'edit'>('view');
let _rangeStart = $state<string | null>(null);
let _rangeEnd = $state<string | null>(null);
let _inspectedDate = $state<string | null>(getTodayIso());
let _actionMode = $state<'eliminate' | 'reintroduce'>('eliminate');

export const calendarStore = {
  get year() {
    return _year;
  },
  get month() {
    return _month;
  },
  get selectedDate() {
    return _selectedDate;
  },
  get mode() {
    return _mode;
  },
  get rangeStart() {
    return _rangeStart;
  },
  get rangeEnd() {
    return _rangeEnd;
  },
  get inspectedDate() {
    return _inspectedDate;
  },
  get actionMode() {
    return _actionMode;
  },

  setSelectedDate(date: string | null) {
    _selectedDate = date;
  },

  setInspectedDate(date: string | null) {
    _inspectedDate = date;
  },

  setActionMode(mode: 'eliminate' | 'reintroduce') {
    _actionMode = mode;
  },

  navigateMonth(delta: number) {
    const result = navMonth(_year, _month, delta);
    _year = result.year;
    _month = result.month;
  },

  goToToday() {
    const today = new Date();
    _year = today.getFullYear();
    _month = today.getMonth();
    _selectedDate = getTodayIso();
  },

  goToDate(isoDate: string) {
    const [year, month] = isoDate.split('-').map(Number);
    _year = year;
    _month = month - 1;
    _selectedDate = isoDate;
  },

  handleDayClick(date: string) {
    if (_mode === 'view') {
      _inspectedDate = _inspectedDate === date ? null : date;
    } else {
      if (!_rangeStart) {
        _rangeStart = date;
        _rangeEnd = null;
      } else if (!_rangeEnd) {
        _rangeEnd = date;
      } else {
        _rangeStart = date;
        _rangeEnd = null;
      }
    }
  },

  enterEditMode() {
    const startDate = _inspectedDate ?? getTodayIso();
    _rangeStart = startDate;
    _rangeEnd = null;
    _mode = 'edit';
    _inspectedDate = null;
    _actionMode = 'eliminate';
  },

  cancelEdit() {
    _mode = 'view';
    _rangeStart = null;
    _rangeEnd = null;
    _actionMode = 'eliminate';
  },

  exitEditMode(focusDate: string) {
    _mode = 'view';
    _rangeStart = null;
    _rangeEnd = null;
    _actionMode = 'eliminate';
    _inspectedDate = focusDate;
  },

  /** Sorted range — ensures start <= end regardless of click order */
  getSortedRange(): { start: string; end: string } | null {
    if (!_rangeStart) return null;
    if (!_rangeEnd) return { start: _rangeStart, end: _rangeStart };
    return _rangeStart <= _rangeEnd
      ? { start: _rangeStart, end: _rangeEnd }
      : { start: _rangeEnd, end: _rangeStart };
  },

  isInRange(date: string): boolean {
    const sorted = this.getSortedRange();
    if (!sorted) return false;
    return date >= sorted.start && date <= sorted.end;
  },

  isRangeEndpoint(date: string): boolean {
    return date === _rangeStart || date === _rangeEnd;
  },
};
