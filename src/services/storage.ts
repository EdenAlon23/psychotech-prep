import type { Attempt, MistakeEntry } from '../models/attempt';
import type { Question } from '../models/question';

/**
 * Single persistence boundary. Everything lives in localStorage (no backend:
 * the app is a static site), wrapped in try/catch because storage can be
 * full or disabled (private mode). Components never touch localStorage directly.
 */
const KEYS = {
  attempts: 'pp.attempts.v1',
  mistakes: 'pp.mistakes.v1',
  settings: 'pp.settings.v1',
  interview: 'pp.interview.v1',
  personality: 'pp.personality.v1',
} as const;

const MAX_ATTEMPTS_WITH_SNAPSHOT = 30;
const MAX_MISTAKES = 400;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Storage write failed', e);
  }
}

// ---------- Attempts ----------
export const getAttempts = (): Attempt[] => read<Attempt[]>(KEYS.attempts, []);

export function saveAttempt(attempt: Attempt): void {
  const all = [attempt, ...getAttempts()];
  // Keep question snapshots only for recent attempts to bound storage size.
  const trimmed = all.map((a, i) => (i < MAX_ATTEMPTS_WITH_SNAPSHOT ? a : { ...a, questions: [] }));
  write(KEYS.attempts, trimmed);
}

export const getAttempt = (id: string): Attempt | undefined => getAttempts().find((a) => a.id === id);

// ---------- Mistakes notebook ----------
export const getMistakes = (): MistakeEntry[] => read<MistakeEntry[]>(KEYS.mistakes, []);

export function recordMistakes(items: { question: Question; chosenIndex: number }[]): void {
  if (items.length === 0) return;
  const map = new Map(getMistakes().map((m) => [m.question.id, m]));
  for (const { question, chosenIndex } of items) {
    map.set(question.id, { question, chosenIndex, at: Date.now(), fixedCount: 0 });
  }
  write(KEYS.mistakes, [...map.values()].sort((a, b) => b.at - a.at).slice(0, MAX_MISTAKES));
}

/** Two correct retries in a row "graduate" a mistake out of the notebook (light spaced-repetition). */
export function markMistakeRetried(questionId: string, correct: boolean): void {
  const list = getMistakes()
    .map((m) => (m.question.id === questionId ? { ...m, fixedCount: correct ? m.fixedCount + 1 : 0, at: Date.now() } : m))
    .filter((m) => m.fixedCount < 2);
  write(KEYS.mistakes, list);
}

export function removeMistake(questionId: string): void {
  write(KEYS.mistakes, getMistakes().filter((m) => m.question.id !== questionId));
}

// ---------- Settings ----------
export interface Settings {
  examDate: string; // ISO date
  name: string;
}
const DEFAULT_SETTINGS: Settings = { examDate: '2026-11-29', name: '' };
export const getSettings = (): Settings => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEYS.settings, {}) });
export const saveSettings = (s: Settings): void => write(KEYS.settings, s);

// ---------- Interview prep ----------
export interface InterviewData {
  stories: Record<string, string>;
  answers: Record<string, { text: string; checks: string[]; rating: number; at: number }>;
}
export const getInterviewData = (): InterviewData => read<InterviewData>(KEYS.interview, { stories: {}, answers: {} });
export const saveInterviewData = (d: InterviewData): void => write(KEYS.interview, d);

// ---------- Personality practice ----------
export interface PersonalityRun {
  at: number;
  answers: Record<string, number>; // itemId -> 1..5
}
export const getPersonalityRuns = (): PersonalityRun[] => read<PersonalityRun[]>(KEYS.personality, []);
export const savePersonalityRun = (r: PersonalityRun): void => write(KEYS.personality, [r, ...getPersonalityRuns()].slice(0, 10));

// ---------- Backup ----------
export function exportAll(): string {
  const data: Record<string, unknown> = {};
  for (const k of Object.values(KEYS)) data[k] = read<unknown>(k, null);
  return JSON.stringify({ app: 'psychotech-prep', version: 1, data }, null, 2);
}

export function importAll(json: string): void {
  const parsed = JSON.parse(json) as { app?: string; data?: Record<string, unknown> };
  if (parsed.app !== 'psychotech-prep' || !parsed.data) throw new Error('קובץ לא תקין');
  const allowed = new Set<string>(Object.values(KEYS));
  for (const [k, v] of Object.entries(parsed.data)) if (allowed.has(k) && v !== null) write(k, v);
}

export function resetAll(): void {
  for (const k of Object.values(KEYS)) localStorage.removeItem(k);
}
