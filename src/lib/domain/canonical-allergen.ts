export type ProtocolDay = {
  day: number;
  instructionCs: string;
  isEvaluationDay: boolean;
};

export type AllergenProtocol = {
  days: ProtocolDay[];
};

/** A single self-contained allergen record. `protocol` presence determines reintroducibility. */
export type CanonicalAllergen = {
  id: string;
  icon: string;
  aliases: readonly string[];
  source?: string;
  protocol?: AllergenProtocol;
};
