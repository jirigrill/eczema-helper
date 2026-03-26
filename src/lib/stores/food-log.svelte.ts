import type { FoodLog } from '$lib/domain/models';

let _logs = $state<FoodLog[]>([]);
let _selectedDate = $state<string>(new Date().toISOString().slice(0, 10));

export const foodLogStore = {
  get logs() { return _logs; },
  get selectedDate() { return _selectedDate; },
  setLogs(logs: FoodLog[]) { _logs = logs; },
  setSelectedDate(date: string) { _selectedDate = date; }
};
