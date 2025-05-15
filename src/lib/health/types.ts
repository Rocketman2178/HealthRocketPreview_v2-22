export type Gender = 'Male' | 'Female' | 'Prefer Not To Say';

export interface HealthUpdateData {
  expectedLifespan: number;
  expectedHealthspan: number;
  gender: Gender;
  categoryScores: CategoryScores;
  error?: Error | null;
}

export interface CategoryScores {
  mindset: number;
  sleep: number;
  exercise: number;
  nutrition: number;
  biohacking: number;
}