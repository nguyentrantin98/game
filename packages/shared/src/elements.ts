export const ELEMENTS = ['Kim', 'Mộc', 'Thổ', 'Thủy', 'Hỏa'] as const;
export type Element = (typeof ELEMENTS)[number];

export const ELEMENT_COLORS: Record<Element, string> = {
  Kim: '#D9A84A',
  Mộc: '#3E9A80',
  Thủy: '#6E9BD8',
  Hỏa: '#E0573E',
  Thổ: '#B98A5A',
};

/** Vòng tương khắc: Kim khắc Mộc, Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim. */
const OVERCOMES: Record<Element, Element> = {
  Kim: 'Mộc',
  Mộc: 'Thổ',
  Thổ: 'Thủy',
  Thủy: 'Hỏa',
  Hỏa: 'Kim',
};

export function overcomes(a: Element, b: Element): boolean {
  return OVERCOMES[a] === b;
}

/** Trúng hành bị khắc: +20%. Trúng hành khắc mình: −15%. */
export function elementMultiplier(attacker?: Element | null, defender?: Element | null): number {
  if (!attacker || !defender) return 1;
  if (overcomes(attacker, defender)) return 1.2;
  if (overcomes(defender, attacker)) return 0.85;
  return 1;
}
