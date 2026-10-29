//~ How a contraction felt, as the person picks it: an intensity, or no pain
// at all — a Braxton-Hicks contraction. Stored as two fields (intensity,
// braxtonHicks) but chosen in one place, the chips and the journal.
import type { Intensity } from './monitoringTypes';

export type Feeling = Intensity | 'painless';

export const FEELINGS: { value: Feeling; label: string; short: string }[] = [
  { value: 1, label: 'Légère', short: 'Légère' },
  { value: 2, label: 'Moyenne', short: 'Moyenne' },
  { value: 3, label: 'Forte', short: 'Forte' },
  { value: 'painless', label: 'Sans douleur (Braxton-Hicks)', short: 'Sans douleur (BH)' }
];

const LABELS = new Map(FEELINGS.map(({ value, short }) => [value, short]));

// braxtonHicks is missing on contractions recorded before it existed
export const feelingOf = ({ intensity, braxtonHicks }: { intensity: Intensity; braxtonHicks?: boolean }): Feeling =>
  braxtonHicks ? 'painless' : intensity;

export const feelingLabel = (contraction: { intensity: Intensity; braxtonHicks?: boolean }): string =>
  LABELS.get(feelingOf(contraction)) ?? '';

// a painless contraction keeps its last intensity, in case it is changed back
export const withFeeling = <C extends { intensity: Intensity; braxtonHicks?: boolean }>(contraction: C, feeling: Feeling): C =>
  feeling === 'painless'
    ? { ...contraction, braxtonHicks: true }
    : { ...contraction, intensity: feeling, braxtonHicks: false };

// <select> values are strings
export const parseFeeling = (value: string): Feeling => (value === 'painless' ? 'painless' : (Number(value) as Intensity));
