import type { User } from '$lib/domain/models';

let _user = $state<User | null>(null);
let _loading = $state(true);

export const authStore = {
  get user() { return _user; },
  get loading() { return _loading; },
  get isAuthenticated() { return _user !== null; },
  setUser(user: User | null) { _user = user; },
  setLoading(loading: boolean) { _loading = loading; }
};
