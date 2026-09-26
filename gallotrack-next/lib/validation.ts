import { z } from 'zod';
import { BIRD_CODE_MAX_LENGTH, BIRD_CODE_PATTERN } from '@/lib/bird-code';

export const birdCodeSchema = z.union([
  z.literal(''),
  z
    .string()
    .min(1, 'Chicken code is required')
    .max(BIRD_CODE_MAX_LENGTH, `Chicken code must be ${BIRD_CODE_MAX_LENGTH} characters or less`)
    .regex(BIRD_CODE_PATTERN, 'Use letters, numbers, x, - or . only (e.g. 1A, 1Ax1B)'),
]);

export const fowlFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  breed: z.string().min(1, 'Breed/strain is required').max(100),
  gender: z.string().min(1, 'Gender is required'),
  color: z.string().default('Bright Red'),
  colorCategory: z.string().default('Red'),
  birthdate: z.string().optional(),
  age: z.string().optional(),
  weight: z.string().optional(),
  height: z.string().optional(),
  sireName: z.string().optional(),
  damName: z.string().optional(),
  sirePct: z.union([z.number(), z.string()]).optional(),
  damPct: z.union([z.number(), z.string()]).optional(),
  birdCode: birdCodeSchema.optional(),
  legColor: z.string().optional(),
  behaviorTrait: z.string().optional(),
  eyeVariant: z.string().optional(),
  growthStage: z.string().optional(),
});

export type FowlFormData = z.infer<typeof fowlFormSchema>;

export const matchFormSchema = z.object({
  selectedFowl: z.string().min(1, 'Select a registered chicken'),
  date: z.string().optional(),
  opponentName: z.string().optional(),
  opponentBreed: z.string().optional(),
  location: z.string().optional(),
  type: z.string().default('Derby Match'),
  outcome: z.enum(['Win', 'Loss', 'Draw']).default('Win'),
  postFightCondition: z.enum(['Fit / Recovered', 'Severely Injured / Critical', 'Deceased (Died from injuries)']).default('Fit / Recovered'),
  optionNumber: z.number().min(1).max(5).default(1),
  betType: z.enum(['durbe', 'lusok', 'contra', 'bulsay']).default('durbe'),
  targetNumber: z.number().min(1).max(10).default(1),
  partnerEntry: z.string().optional(),
  cockCount: z.number().min(1).max(99).default(2),
  ageCategory: z.enum(['Cock', 'Stag']).default('Cock'),
  eventType: z.string().default('Derby'),
  derbyMatchNumber: z.number().min(1).max(99).default(1),
});

export type MatchFormData = z.infer<typeof matchFormSchema>;

export function validateFowlForm(data: Record<string, unknown>): { success: boolean; errors: string[] } {
  const result = fowlFormSchema.safeParse(data);
  if (result.success) return { success: true, errors: [] };
  return {
    success: false,
    errors: result.error.issues.map((issue) => issue.message),
  };
}

export function validateMatchForm(data: Record<string, unknown>): { success: boolean; errors: string[] } {
  const result = matchFormSchema.safeParse(data);
  if (result.success) return { success: true, errors: [] };
  return {
    success: false,
    errors: result.error.issues.map((issue) => issue.message),
  };
}
