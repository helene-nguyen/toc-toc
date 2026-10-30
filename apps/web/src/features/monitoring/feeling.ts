//~ How a contraction is described, in two independent choices:
// - the pain felt: none (a Braxton-Hicks contraction), light, medium or
//   strong — stored as braxtonHicks + intensity; it never changes the trace
// - the intensity drawn on the trace: auto (from the duration, the default)
//   or a level that caps the curve — stored as curve
import type { CurveLevel, Intensity } from './monitoringTypes';

export type Pain = Intensity | 'none';

// short: for the chips, under a "Douleur" heading
export const PAINS: { value: Pain; label: string; short: string }[] = [
  { value: 'none', label: 'Sans douleur', short: 'Aucune' },
  { value: 1, label: 'Faible', short: 'Faible' },
  { value: 2, label: 'Moyenne', short: 'Moyenne' },
  { value: 3, label: 'Forte', short: 'Forte' }
];

const PAIN_LABELS = new Map(PAINS.map(({ value, label }) => [value, label]));

interface Painful {
  intensity: Intensity;
  // missing on contractions recorded before it existed
  braxtonHicks?: boolean;
}

export const painOf = ({ intensity, braxtonHicks }: Painful): Pain => (braxtonHicks ? 'none' : intensity);

export const painLabel = (contraction: Painful): string => PAIN_LABELS.get(painOf(contraction)) ?? '';

// "no pain" keeps the last intensity, in case it is changed back
export const withPain = <C extends Painful>(contraction: C, pain: Pain): C =>
  pain === 'none' ? { ...contraction, braxtonHicks: true } : { ...contraction, intensity: pain, braxtonHicks: false };

// <select> values are strings
export const parsePain = (value: string): Pain => (value === 'none' ? 'none' : (Number(value) as Intensity));

export const CURVES: { value: CurveLevel; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Forte' }
];

const CURVE_LABELS = new Map(CURVES.map(({ value, label }) => [value, label]));

// missing on contractions recorded before it existed: drawn the auto way
export const curveOf = ({ curve }: { curve?: CurveLevel }): CurveLevel => curve ?? 'auto';

export const curveLabel = (contraction: { curve?: CurveLevel }): string => CURVE_LABELS.get(curveOf(contraction)) ?? '';
