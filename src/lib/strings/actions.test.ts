import { describe, expect, it } from 'vitest';

import { actionStrings } from './actions';

// Issue #277: collapse the meal-screen save verbs around a single `save` and a
// new `saveChanges` for edit-mode finalize. The screen's CTA ladder reads as
// one consistent "Uložit {what}" voice instead of split between done/save.

describe('actionStrings — meal-screen verb cleanup (issue #277)', () => {
  it('exposes a single `save` set to "Uložit"', () => {
    expect(actionStrings.save).toBe('Uložit');
  });

  it('exposes `saveChanges` set to "Uložit změny" (edit-mode finalize)', () => {
    // Czech feminine-plural agreement: "změny" → "uložit změny", deliberately
    // distinct from the singular "uložit jídlo" of compose-new.
    expect(actionStrings as Record<string, string>).toHaveProperty('saveChanges', 'Uložit změny');
  });

  it('no longer exposes `saveFood` (callers use `save` and append the food name)', () => {
    expect(actionStrings as Record<string, string>).not.toHaveProperty('saveFood');
  });

  it('no longer exposes `saveFamily` (was dead — never bound to a real callsite)', () => {
    expect(actionStrings as Record<string, string>).not.toHaveProperty('saveFamily');
  });
});
