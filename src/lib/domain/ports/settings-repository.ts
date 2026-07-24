import type { SettingsData } from '$lib/domain/models';
import type { Result } from '$lib/types/result';

export type SettingsRepository = {
  save(settings: SettingsData): Promise<Result<void, string>>;
  load(): Promise<Result<SettingsData | null, string>>;
};
