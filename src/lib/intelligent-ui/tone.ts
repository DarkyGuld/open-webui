/**
 * Shared semantic tone vocabulary, used by Badge and Metric (single source of
 * truth — do not duplicate the enum elsewhere). Tone is presentation-only and
 * must stay subtle/native; the model never supplies colors.
 */
import { z } from 'zod';

export const TONE_VALUES = ['neutral', 'positive', 'warning', 'negative'] as const;
export type Tone = (typeof TONE_VALUES)[number];
export const toneSchema = z.enum(TONE_VALUES);
