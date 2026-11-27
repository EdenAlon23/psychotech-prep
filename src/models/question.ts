/**
 * Core domain types. Every question in the app – hand-written or procedurally
 * generated – is normalised into the `Question` shape so the quiz engine,
 * the analytics and the mistakes notebook treat them uniformly.
 */

export type SectionId =
  | 'instructions'
  | 'analogies'
  | 'numberSeries'
  | 'math'
  | 'figures'
  | 'attention'
  | 'logic'
  | 'hebrew'
  // English-language sections (psychometric English, SAT, GMAT)
  | 'english'
  | 'quantEn'
  | 'dataSufficiency';

export type ShapeKind = 'circle' | 'square' | 'triangle' | 'diamond' | 'hexagon';
export type FillKind = 'empty' | 'striped' | 'full';

/** One cell in a figural question (matrix cell, series item or answer option). */
export interface FigureCell {
  shape: ShapeKind;
  count: 1 | 2 | 3;
  fill: FillKind;
  /** Angle in degrees of the orientation dot; undefined = no dot. */
  dotAngle?: number;
}

export interface FigureVisual {
  layout: 'matrix' | 'series';
  /** Matrix: 9 cells row-major (last one null). Series: N cells + trailing null. */
  cells: (FigureCell | null)[];
}

export interface Choice {
  text?: string;
  figure?: FigureCell;
}

export type Difficulty = 1 | 2 | 3;

export interface Question {
  id: string;
  section: SectionId;
  /** Fine-grained topic used for weakness analysis (e.g. "ניגוד", "הפרש קבוע"). */
  subtype: string;
  prompt: string;
  /** Reading-comprehension passage, rendered above the prompt. */
  passage?: string;
  /** Monospace block (attention tasks), rendered verbatim, LTR. */
  codeBlock?: string;
  figure?: FigureVisual;
  choices: Choice[];
  answerIndex: number;
  explanation: string;
  difficulty: Difficulty;
  /** English content is rendered left-to-right. */
  dir?: 'ltr';
}

export interface SectionMeta {
  id: SectionId;
  title: string;
  short: string;
  icon: string;
  description: string;
  /** Target seconds per question – used for pace feedback. */
  targetSecPerQuestion: number;
  tips: string[];
  /** 'en' sections are rendered LTR. */
  lang?: 'he' | 'en';
}
