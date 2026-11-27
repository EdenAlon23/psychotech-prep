import type { SectionId } from '../models/question';

/**
 * Exam catalogue. Each exam maps to the app's question sections and defines its own simulation and score scale.
 * Structure facts are summarised from public descriptions; formats change — every exam page links the user to
 * check the official source. Score estimates are rough guidance, never an official prediction.
 */
export type ExamId = 'psychotech' | 'psychometric' | 'tzav' | 'police' | 'sat' | 'gmat';

export interface ExamSection { section: SectionId; weight: number; label?: string }

export interface ExamDef {
  id: ExamId;
  name: string;
  nameShort: string;
  org: string;
  audience: string;
  lang: 'he' | 'en';
  icon: string;
  summary: string;
  structure: string[];
  officialHint: string;
  sections: ExamSection[];
  simulation: { title: string; blocks: { section: SectionId; count: number; minutes: number; label?: string }[] };
  score: { min: number; max: number; label: string; step: number };
  /** Extra modules shown in the plan (interview prep, personality questionnaire). */
  extras: ('interview' | 'personality')[];
  /** Ask about employer / assessment company (job-selection tests). */
  asksEmployer?: boolean;
}

export const EXAMS: ExamDef[] = [
  {
    id: 'psychotech', name: 'מבחנים פסיכוטכניים (מיון לעבודה)', nameShort: 'פסיכוטכני', org: 'מכוני מיון וחברות השמה', icon: '🧠',
    audience: 'מועמדים לעבודה, הייטק, בנקים, שירות המדינה', lang: 'he',
    summary: 'סוללה ממוחשבת של מבחנים קוגניטיביים, לרוב עם שאלון אישיות, ולעיתים דינמיקה קבוצתית וראיון.',
    structure: ['פרקים קוגניטיביים מתוזמנים: הוראות, אנלוגיות, סדרות, חשבון, צורות, קשב, היגיון', 'שאלון אישיות', 'לעיתים: דינמיקה קבוצתית וראיון אישי'],
    officialHint: 'הרכב הסוללה משתנה בין מכונים ותפקידים — בדקו בהזמנה למבחן מה נכלל.',
    sections: [
      { section: 'instructions', weight: 1 }, { section: 'analogies', weight: 1 }, { section: 'numberSeries', weight: 1 },
      { section: 'math', weight: 1 }, { section: 'figures', weight: 1.2 }, { section: 'attention', weight: 0.8 }, { section: 'logic', weight: 0.8 },
    ],
    simulation: { title: 'סימולציית סוללה קוגניטיבית', blocks: [
      { section: 'instructions', count: 10, minutes: 7 }, { section: 'analogies', count: 12, minutes: 7 }, { section: 'numberSeries', count: 12, minutes: 9 },
      { section: 'math', count: 10, minutes: 12 }, { section: 'figures', count: 12, minutes: 12 }, { section: 'attention', count: 16, minutes: 6 }, { section: 'logic', count: 8, minutes: 8 },
    ] },
    score: { min: 1, max: 10, step: 1, label: 'ציון יחסי (הערכה)' },
    extras: ['interview', 'personality'], asksEmployer: true,
  },
  {
    id: 'psychometric', name: 'המבחן הפסיכומטרי', nameShort: 'פסיכומטרי', org: 'המרכז הארצי לבחינות ולהערכה', icon: '🎓',
    audience: 'מועמדים ללימודים אקדמיים', lang: 'he',
    summary: 'שלושה תחומים: חשיבה מילולית, חשיבה כמותית ואנגלית, ומטלת כתיבה. ציון כללי 200–800.',
    structure: ['חשיבה מילולית: אנלוגיות, השלמת משפטים, הבנת הנקרא, היגיון', 'חשיבה כמותית: בעיות מילוליות, אלגברה, גאומטריה, הסקה מתרשים', 'אנגלית: השלמת משפטים, ניסוח מחדש, הבנת הנקרא', 'מטלת כתיבה'],
    officialHint: 'מבנה ומועדים מעודכנים — באתר המרכז הארצי לבחינות ולהערכה.',
    sections: [
      { section: 'analogies', weight: 1, label: 'מילולי' }, { section: 'hebrew', weight: 1.2, label: 'מילולי' }, { section: 'logic', weight: 0.8, label: 'מילולי' },
      { section: 'math', weight: 1.5, label: 'כמותי' }, { section: 'numberSeries', weight: 0.5, label: 'כמותי' }, { section: 'english', weight: 1.5, label: 'אנגלית' },
    ],
    simulation: { title: 'סימולציה פסיכומטרית', blocks: [
      { section: 'hebrew', count: 12, minutes: 10, label: 'מילולי א׳' }, { section: 'analogies', count: 8, minutes: 6, label: 'מילולי א׳' },
      { section: 'math', count: 20, minutes: 21, label: 'כמותי א׳' },
      { section: 'english', count: 20, minutes: 20, label: 'אנגלית א׳' },
      { section: 'logic', count: 6, minutes: 6, label: 'מילולי ב׳' }, { section: 'hebrew', count: 10, minutes: 9, label: 'מילולי ב׳' },
      { section: 'math', count: 20, minutes: 21, label: 'כמותי ב׳' },
    ] },
    score: { min: 200, max: 800, step: 1, label: 'ציון כללי (הערכה)' },
    extras: [],
  },
  {
    id: 'tzav', name: 'צו ראשון — מבחן דפ״ר', nameShort: 'צו ראשון', org: 'צה״ל', icon: '🪖',
    audience: 'מלש״בים לפני צו ראשון', lang: 'he',
    summary: 'מבחן ממוחשב קצר שקובע את ציון הדפ״ר (10–90), שמשפיע על השיבוץ יחד עם הראיון והפרופיל.',
    structure: ['אנלוגיות מילוליות', 'הבנת הוראות', 'סדרות צורות (מטריצות)', 'בעיות כמותיות וסדרות מספרים', 'ראיון אישי (בנפרד)'],
    officialHint: 'פרטים רשמיים והכנה — באתר "מתגייסים" של צה״ל ובזימון לצו הראשון.',
    sections: [
      { section: 'analogies', weight: 1.2 }, { section: 'instructions', weight: 1 }, { section: 'figures', weight: 1.2 },
      { section: 'numberSeries', weight: 1 }, { section: 'math', weight: 1 },
    ],
    simulation: { title: 'סימולציית דפ״ר', blocks: [
      { section: 'analogies', count: 10, minutes: 6 }, { section: 'instructions', count: 8, minutes: 6 },
      { section: 'figures', count: 10, minutes: 9 }, { section: 'numberSeries', count: 8, minutes: 6 }, { section: 'math', count: 6, minutes: 7 },
    ] },
    score: { min: 10, max: 90, step: 10, label: 'דפ״ר משוער' },
    extras: ['interview'],
  },
  {
    id: 'police', name: 'מבחני מיון למשטרה (דפ״ר משטרתי)', nameShort: 'משטרה', org: 'משטרת ישראל', icon: '🚓',
    audience: 'מועמדים לשירות במשטרה ובגופי ביטחון', lang: 'he',
    summary: 'סוללה ממוחשבת של יכולות חשיבה, עברית וקשב, בנוסף לשאלונים, ראיון ובדיקות נוספות.',
    structure: ['יכולות חשיבה: אנלוגיות, הוראות, צורות, סדרות, חשבון', 'עברית והבנת הנקרא', 'קשב ודיוק', 'שאלון אישיות וראיון'],
    officialHint: 'שלבי המיון המדויקים מפורטים בפניה מאגף כוח האדם של המשטרה.',
    sections: [
      { section: 'analogies', weight: 1 }, { section: 'instructions', weight: 1 }, { section: 'figures', weight: 1 },
      { section: 'numberSeries', weight: 0.8 }, { section: 'math', weight: 0.8 }, { section: 'hebrew', weight: 1 }, { section: 'attention', weight: 1 },
    ],
    simulation: { title: 'סימולציית מיון משטרה', blocks: [
      { section: 'analogies', count: 10, minutes: 6 }, { section: 'instructions', count: 8, minutes: 6 }, { section: 'figures', count: 10, minutes: 9 },
      { section: 'numberSeries', count: 8, minutes: 6 }, { section: 'math', count: 6, minutes: 7 }, { section: 'hebrew', count: 10, minutes: 9 }, { section: 'attention', count: 12, minutes: 5 },
    ] },
    score: { min: 1, max: 9, step: 1, label: 'רמה יחסית (הערכה)' },
    extras: ['interview', 'personality'],
  },
  {
    id: 'sat', name: 'SAT', nameShort: 'SAT', org: 'College Board', icon: '🇺🇸',
    audience: 'Applicants to US colleges', lang: 'en',
    summary: 'Digital, section-adaptive test: Reading & Writing and Math, two modules each. Total score 400–1600.',
    structure: ['Reading and Writing: two modules (~64 minutes total)', 'Math: two modules (~70 minutes total), calculator allowed', 'The second module of each section adapts to your performance on the first'],
    officialHint: 'Check dates and test centers in Israel on the College Board website.',
    sections: [{ section: 'english', weight: 1, label: 'Reading & Writing' }, { section: 'quantEn', weight: 1, label: 'Math' }],
    simulation: { title: 'SAT practice test (shortened)', blocks: [
      { section: 'english', count: 14, minutes: 16, label: 'R&W module 1' }, { section: 'english', count: 14, minutes: 16, label: 'R&W module 2' },
      { section: 'quantEn', count: 11, minutes: 18, label: 'Math module 1' }, { section: 'quantEn', count: 11, minutes: 18, label: 'Math module 2' },
    ] },
    score: { min: 400, max: 1600, step: 10, label: 'Estimated total' },
    extras: [],
  },
  {
    id: 'gmat', name: 'GMAT Focus', nameShort: 'GMAT', org: 'GMAC', icon: '💼',
    audience: 'MBA and business master\'s applicants', lang: 'en',
    summary: 'Three adaptive sections — Quantitative, Verbal and Data Insights — 45 minutes each. Score 205–805.',
    structure: ['Quantitative Reasoning: problem solving', 'Verbal Reasoning: reading and critical reasoning', 'Data Insights: data sufficiency, tables, graphs, multi-source reasoning'],
    officialHint: 'Format and registration on mba.com.',
    sections: [{ section: 'quantEn', weight: 1, label: 'Quant' }, { section: 'english', weight: 1, label: 'Verbal' }, { section: 'dataSufficiency', weight: 1, label: 'Data Insights' }],
    simulation: { title: 'GMAT practice test (shortened)', blocks: [
      { section: 'quantEn', count: 12, minutes: 25, label: 'Quant' }, { section: 'english', count: 12, minutes: 22, label: 'Verbal' },
      { section: 'dataSufficiency', count: 10, minutes: 22, label: 'Data Insights' },
    ] },
    score: { min: 205, max: 805, step: 10, label: 'Estimated total' },
    extras: [],
  },
];

export const EXAM_BY_ID = Object.fromEntries(EXAMS.map((e) => [e.id, e])) as Record<ExamId, ExamDef>;
export const isExamId = (v: unknown): v is ExamId => typeof v === 'string' && v in EXAM_BY_ID;
