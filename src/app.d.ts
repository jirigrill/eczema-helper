import type { Child, ClientUser } from '$lib/domain/models';

declare global {
  namespace App {
    interface Locals {
      user: ClientUser | null;
      children: Child[];
    }
  }
}

export {};
