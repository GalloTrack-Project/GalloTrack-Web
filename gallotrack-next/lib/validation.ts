import { z } from 'zod';

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
  legColor: z.string().optional(),
  behaviorTrait: z.string().optional(),
  eyeVariant: z.string().optional(),
  growthStage: z.string().optional(),
});

export type FowlFormData = z.infer<typeof fowlFormSchema>;

export const matchFormSchema = z.object({
  selectedFowl: z.string().min(1, 'Select a registered fowl'),
  date: z.string().optional(),
  opponentName: z.string().optional(),
  opponentBreed: z.string().optional(),
  location: z.string().optional(),
  type: z.string().default('Derby Match'),
  outcome: z.enum(['Win', 'Loss', 'Draw']).default('Win'),
  postFightCondition: z.enum(['Fit / Recovered', 'Severely Injured / Critical', 'Deceased (Died from injuries)']).default('Fit / Recovered'),
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
