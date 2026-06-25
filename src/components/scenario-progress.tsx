'use client';

const STORAGE_KEY = 'avtostil-scenario-progress';

export function markScenarioCompleted(scenarioId: string, score: number): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!existing[scenarioId] || existing[scenarioId] < score) {
      existing[scenarioId] = score;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  } catch (e) {
    console.warn('markScenarioCompleted failed:', e);
  }
}

export function getScenarioProgress(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}
