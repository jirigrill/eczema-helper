import type { AllergenId, AllergenProtocol, ProtocolAllergenId } from '$lib/domain/models';

/**
 * Baseline clinical reintroduction protocol per allergen.
 * v1: static guidelines only. Dynamic adjustment per baby profile is deferred.
 *
 * Each entry lists one ProtocolDay per reintroduction day, in order.
 * isEvaluationDay marks the last day — the UI shows the verdict form then.
 *
 * Source: standard elimination-diet reintroduction protocol for breastfeeding mothers.
 */
export const REINTRODUCTION_PROTOCOLS = {
  dairy: {
    days: [
      { day: 1, instructionCs: '100 ml kravského mléka nebo 1 jogurt', isEvaluationDay: false },
      { day: 2, instructionCs: '200 ml mléka nebo větší porce mléčného výrobku', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně mléčných výrobků', isEvaluationDay: false },
      { day: 4, instructionCs: 'Neomezeně mléčných výrobků', isEvaluationDay: false },
      { day: 5, instructionCs: 'Neomezeně mléčných výrobků — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
  eggs: {
    days: [
      { day: 1, instructionCs: '1 vařené vejce (celé)', isEvaluationDay: false },
      { day: 2, instructionCs: '2 vejce nebo vejce v jídle', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně vajec', isEvaluationDay: false },
      { day: 4, instructionCs: 'Neomezeně vajec — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
  wheat: {
    days: [
      { day: 1, instructionCs: '1 krajíc chleba nebo malá porce těstovin', isEvaluationDay: false },
      { day: 2, instructionCs: '2–3 krajíce chleba nebo střední porce těstovin', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně pšeničných výrobků', isEvaluationDay: false },
      { day: 4, instructionCs: 'Neomezeně pšeničných výrobků — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
  soy: {
    days: [
      { day: 1, instructionCs: '100 ml sójového mléka nebo malá porce tofu', isEvaluationDay: false },
      { day: 2, instructionCs: '200 ml sójového mléka nebo střední porce tofu', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně sójových výrobků — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
  nuts: {
    days: [
      { day: 1, instructionCs: '5–6 ořechů (např. vlašských nebo mandlí)', isEvaluationDay: false },
      { day: 2, instructionCs: 'Hrst ořechů nebo 2 lžíce ořechového másla', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně ořechů', isEvaluationDay: false },
      { day: 4, instructionCs: 'Neomezeně ořechů — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
  fish: {
    days: [
      { day: 1, instructionCs: '1 malá porce ryby (cca 50 g)', isEvaluationDay: false },
      { day: 2, instructionCs: 'Střední porce ryby (cca 100 g)', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně ryb — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
  shellfish: {
    days: [
      { day: 1, instructionCs: 'Malá porce korýšů nebo měkkýšů (cca 50 g)', isEvaluationDay: false },
      { day: 2, instructionCs: 'Střední porce korýšů nebo měkkýšů (cca 100 g)', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně korýšů a měkkýšů — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
  citrus: {
    days: [
      { day: 1, instructionCs: '1 mandarinka nebo sklenice džusu (150 ml)', isEvaluationDay: false },
      { day: 2, instructionCs: '2 mandarinky nebo 1 pomeranč', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně citrusů — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
  chocolate: {
    days: [
      { day: 1, instructionCs: '2–3 kostičky hořké čokolády (min. 70 % kakaa)', isEvaluationDay: false },
      { day: 2, instructionCs: 'Polovina tabulky čokolády', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně čokolády — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
  tomatoes: {
    days: [
      { day: 1, instructionCs: 'Neomezeně rajčat nebo paprik, min. 5 malých rajčátek', isEvaluationDay: false },
      { day: 2, instructionCs: 'Neomezeně rajčat nebo paprik, min. 5 malých rajčátek', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně rajčat nebo paprik, min. 5 malých rajčátek', isEvaluationDay: false },
      { day: 4, instructionCs: 'Neomezeně rajčat nebo paprik — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
  strawberries: {
    days: [
      { day: 1, instructionCs: 'Hrst jahod (cca 100 g)', isEvaluationDay: false },
      { day: 2, instructionCs: 'Větší porce jahod (cca 200 g)', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně jahod — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
  corn: {
    days: [
      { day: 1, instructionCs: 'Malá porce kukuřice (cca 50 g kukuřičné mouky nebo 1 klas)', isEvaluationDay: false },
      { day: 2, instructionCs: 'Střední porce kukuřice', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně kukuřičných výrobků — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
  sesame: {
    days: [
      { day: 1, instructionCs: '1 lžička sezamových semínek nebo tahini', isEvaluationDay: false },
      { day: 2, instructionCs: '2–3 lžíce tahini nebo větší porce sezamu', isEvaluationDay: false },
      { day: 3, instructionCs: 'Neomezeně sezamových výrobků — večer vyhodnoťte reakci', isEvaluationDay: true },
    ],
  },
} as const satisfies Record<ProtocolAllergenId, AllergenProtocol>;

export function getProtocolForAllergen(allergenId: AllergenId): AllergenProtocol | undefined {
  return (REINTRODUCTION_PROTOCOLS as Record<string, AllergenProtocol>)[allergenId];
}
