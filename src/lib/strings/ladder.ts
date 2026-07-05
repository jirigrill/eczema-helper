import type { LadderStepId } from '$lib/data/allergen-catalog';

export type LadderStepStrings = {
  /** Czech dose caption shown at that rung — the "how much to give" instruction. */
  dose: string;
};

/**
 * Czech dose captions keyed by ladder step id (ADR-0014, ADR-0023).
 *
 * The `satisfies Record<LadderStepId, LadderStepStrings>` clause enforces that
 * every ladder rung authored in `allergen-catalog.ts` has a caption — adding a
 * rung without a caption fails `bunx tsc --noEmit`.
 *
 * These strings are the sole home for per-rung Czech text; the catalog record
 * carries no display strings inline.
 */
export const ladderStepStrings = {
  // dairy — 5 rungs
  'dairy-1':        { dose: '100 ml kravského mléka nebo 1 jogurt' },
  'dairy-2':        { dose: '200 ml mléka nebo větší porce mléčného výrobku' },
  'dairy-3':        { dose: 'Neomezeně mléčných výrobků' },
  'dairy-4':        { dose: 'Neomezeně mléčných výrobků' },
  'dairy-5':        { dose: 'Neomezeně mléčných výrobků — večer vyhodnoťte reakci' },
  // eggs — 3 rungs
  'eggs-1':         { dose: '1 vejce (vařené)' },
  'eggs-2':         { dose: '2 vejce nebo větší porce vaječných výrobků' },
  'eggs-3':         { dose: 'Neomezeně vajec — večer vyhodnoťte reakci' },
  // wheat — 4 rungs
  'wheat-1':        { dose: '1 krajíc chleba nebo malá porce těstovin' },
  'wheat-2':        { dose: '2–3 krajíce chleba nebo střední porce těstovin' },
  'wheat-3':        { dose: 'Neomezeně pšeničných výrobků' },
  'wheat-4':        { dose: 'Neomezeně pšeničných výrobků — večer vyhodnoťte reakci' },
  // soy — 3 rungs
  'soy-1':          { dose: '100 ml sójového mléka nebo malá porce tofu' },
  'soy-2':          { dose: '200 ml sójového mléka nebo střední porce tofu' },
  'soy-3':          { dose: 'Neomezeně sójových výrobků — večer vyhodnoťte reakci' },
  // nuts — 4 rungs
  'nuts-1':         { dose: '5–6 ořechů (např. vlašských nebo mandlí)' },
  'nuts-2':         { dose: 'Hrst ořechů nebo 2 lžíce ořechového másla' },
  'nuts-3':         { dose: 'Neomezeně ořechů' },
  'nuts-4':         { dose: 'Neomezeně ořechů — večer vyhodnoťte reakci' },
  // fish — 3 rungs
  'fish-1':         { dose: '1 malá porce ryby (cca 50 g)' },
  'fish-2':         { dose: 'Střední porce ryby (cca 100 g)' },
  'fish-3':         { dose: 'Neomezeně ryb — večer vyhodnoťte reakci' },
  // shellfish — 3 rungs
  'shellfish-1':    { dose: 'Malá porce korýšů nebo měkkýšů (cca 50 g)' },
  'shellfish-2':    { dose: 'Střední porce korýšů nebo měkkýšů (cca 100 g)' },
  'shellfish-3':    { dose: 'Neomezeně korýšů a měkkýšů — večer vyhodnoťte reakci' },
  // citrus — 3 rungs
  'citrus-1':       { dose: '1 mandarinka nebo sklenice džusu (150 ml)' },
  'citrus-2':       { dose: '2 mandarinky nebo 1 pomeranč' },
  'citrus-3':       { dose: 'Neomezeně citrusů — večer vyhodnoťte reakci' },
  // chocolate — 3 rungs
  'chocolate-1':    { dose: '2–3 kostičky hořké čokolády (min. 70 % kakaa)' },
  'chocolate-2':    { dose: 'Polovina tabulky čokolády' },
  'chocolate-3':    { dose: 'Neomezeně čokolády — večer vyhodnoťte reakci' },
  // tomatoes — 4 rungs
  'tomatoes-1':     { dose: 'Neomezeně rajčat nebo paprik, min. 5 malých rajčátek' },
  'tomatoes-2':     { dose: 'Neomezeně rajčat nebo paprik, min. 5 malých rajčátek' },
  'tomatoes-3':     { dose: 'Neomezeně rajčat nebo paprik, min. 5 malých rajčátek' },
  'tomatoes-4':     { dose: 'Neomezeně rajčat nebo paprik — večer vyhodnoťte reakci' },
  // strawberries — 3 rungs
  'strawberries-1': { dose: 'Hrst jahod (cca 100 g)' },
  'strawberries-2': { dose: 'Větší porce jahod (cca 200 g)' },
  'strawberries-3': { dose: 'Neomezeně jahod — večer vyhodnoťte reakci' },
  // corn — 3 rungs
  'corn-1':         { dose: 'Malá porce kukuřice (cca 50 g kukuřičné mouky nebo 1 klas)' },
  'corn-2':         { dose: 'Střední porce kukuřice' },
  'corn-3':         { dose: 'Neomezeně kukuřičných výrobků — večer vyhodnoťte reakci' },
  // sesame — 3 rungs
  'sesame-1':       { dose: '1 lžička sezamových semínek nebo tahini' },
  'sesame-2':       { dose: '2–3 lžíce tahini nebo větší porce sezamu' },
  'sesame-3':       { dose: 'Neomezeně sezamových výrobků — večer vyhodnoťte reakci' },
} as const satisfies Record<LadderStepId, LadderStepStrings>;
