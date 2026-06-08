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
  origin: 'core' | 'regional';
  icon: string;
  aliases: string[];
  /** Full `allergenId:subitem` keys, e.g. `'dairy:milk'`. */
  subitems: readonly string[];
  source?: string;
  protocol?: AllergenProtocol;
};
