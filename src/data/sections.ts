import type { SectionId, SectionMeta } from '../models/question';

export const SECTIONS: SectionMeta[] = [
  {
    id: 'instructions', title: 'הבנת הוראות', short: 'הוראות', icon: '📋', targetSecPerQuestion: 40,
    description: 'הוראה מותנית על רשימת נתונים: צריך לבצע בדיוק מה שכתוב – לא מה שנראה הגיוני.',
    tips: ['קראו את כל ההוראה לפני שמסתכלים על הנתונים.', 'זהו את התנאי ("אם…") ובדקו אותו לבד, ורק אז בחרו ענף.', 'שימו לב למילים "בדיוק", "גדול מ" (לא "גדול או שווה"), "אחרת".'],
  },
  {
    id: 'analogies', title: 'אנלוגיות מילוליות', short: 'אנלוגיות', icon: '🔤', targetSecPerQuestion: 35,
    description: 'זיהוי היחס בין זוג מילים ומציאת זוג עם יחס זהה.',
    tips: ['נסחו משפט שמקשר בין המילים ("X הוא כלי שמשמש ל-Y") והציבו אותו בכל תשובה.', 'אם כמה תשובות מתאימות – חדדו את המשפט.', 'שמרו על סדר: היחס X:Y אינו כמו Y:X.'],
  },
  {
    id: 'numberSeries', title: 'סדרות מספרים', short: 'סדרות', icon: '🔢', targetSecPerQuestion: 45,
    description: 'מציאת החוק שמייצר את הסדרה והשלמת המספר החסר.',
    tips: ['כתבו את ההפרשים בין האיברים – ברוב המקרים החוק שם.', 'אם ההפרשים לא קבועים – בדקו הפרשים של ההפרשים, כפל, או שתי סדרות שזורות.', 'מספרים שגדלים מהר מאוד ⇐ כנראה כפל.'],
  },
  {
    id: 'math', title: 'בעיות חשבון', short: 'חשבון', icon: '➗', targetSecPerQuestion: 70,
    description: 'בעיות מילוליות: אחוזים, יחס, דרך-מהירות-זמן, הספק, ממוצעים.',
    tips: ['כתבו את הנתונים בטיוטה לפני החישוב.', 'הערכה גסה מוחקת לרוב 2 תשובות.', 'מלכודות: הנחה על הנחה, ממוצע מהירויות, הספק משותף.'],
  },
  {
    id: 'figures', title: 'צורות ומטריצות', short: 'צורות', icon: '🔷', targetSecPerQuestion: 60,
    description: 'מטריצות בסגנון ראבן וסדרות צורניות – גילוי החוקים לפי מאפייני הצורה.',
    tips: ['פרקו לתכונות: צורה, כמות, מילוי, כיוון – ובדקו כל תכונה בנפרד.', 'בדקו שורות וגם עמודות.', 'פסלו תשובות: כל מסיח שובר בדרך כלל חוק אחד בלבד.'],
  },
  {
    id: 'attention', title: 'קשב ודיוק', short: 'קשב', icon: '🎯', targetSecPerQuestion: 25,
    description: 'השוואת רצפים, ספירת תווים וטבלאות קוד – מהירות ודיוק פקידותי.',
    tips: ['השוו בקבוצות של 3–4 תווים.', 'הצביעו עם העכבר/האצבע על המקום שאתם בודקים.', 'אל תדלגו על בדיקה כפולה בשאלות "כמה זהים".'],
  },
  {
    id: 'logic', title: 'היגיון ושלילות', short: 'היגיון', icon: '🧩', targetSecPerQuestion: 60,
    description: 'הסקת מסקנות הכרחיות, סידור לפי יחסים ושלילת טענות.',
    tips: ['"בהכרח" = נכון בכל מצב אפשרי. חפשו דוגמה נגדית.', 'שלילת "כל" היא "לא כל" (= לפחות אחד לא), לא "אף אחד".', 'בשאלות סידור – ציירו קו ומקמו כל פריט.'],
  },
  {
    id: 'hebrew', title: 'עברית', short: 'עברית', icon: '📖', targetSecPerQuestion: 40,
    description: 'אוצר מילים, הפכים, ביטויים, השלמת משפטים, דקדוק והבנת הנקרא.',
    tips: ['במילים לא מוכרות – חפשו שורש מוכר.', 'בהשלמת משפטים – מילות קישור ("למרות", "ולכן") קובעות את הכיוון.', 'בהבנת הנקרא – התשובה חייבת להיות כתובה/נובעת מהקטע, לא מידע כללי. מילים קיצוניות ("תמיד", "רק") – חשודות.'],
  },
];

export const SECTION_BY_ID: Record<SectionId, SectionMeta> = Object.fromEntries(SECTIONS.map((s) => [s.id, s])) as Record<SectionId, SectionMeta>;

export interface SimulationDef {
  id: string;
  title: string;
  description: string;
  blocks: { section: SectionId; count: number; timeLimitSec: number }[];
}

/** Simulations mirror the structure of computerised placement batteries: separately-timed sections. */
export const SIMULATIONS: SimulationDef[] = [
  {
    id: 'full', title: 'סימולציה מלאה – סוללה קוגניטיבית',
    description: 'כל הפרקים הקוגניטיביים ברצף, כל פרק עם זמן משלו – כמו במכון המיון. כ-60 דקות.',
    blocks: [
      { section: 'instructions', count: 10, timeLimitSec: 7 * 60 },
      { section: 'analogies', count: 12, timeLimitSec: 7 * 60 },
      { section: 'numberSeries', count: 12, timeLimitSec: 9 * 60 },
      { section: 'math', count: 10, timeLimitSec: 12 * 60 },
      { section: 'figures', count: 12, timeLimitSec: 12 * 60 },
      { section: 'attention', count: 16, timeLimitSec: 6 * 60 },
      { section: 'logic', count: 8, timeLimitSec: 8 * 60 },
    ],
  },
  {
    id: 'short', title: 'סימולציה מקוצרת',
    description: 'גרסה של 25 דקות לכל הפרקים – מתאימה לתרגול יומי.',
    blocks: [
      { section: 'instructions', count: 5, timeLimitSec: 3.5 * 60 },
      { section: 'analogies', count: 6, timeLimitSec: 3.5 * 60 },
      { section: 'numberSeries', count: 6, timeLimitSec: 4.5 * 60 },
      { section: 'math', count: 5, timeLimitSec: 6 * 60 },
      { section: 'figures', count: 6, timeLimitSec: 6 * 60 },
      { section: 'attention', count: 8, timeLimitSec: 3 * 60 },
    ],
  },
  {
    id: 'hebrew', title: 'סימולציית עברית',
    description: 'מבחן עברית מלא: אוצר מילים, ביטויים, השלמה, דקדוק והבנת הנקרא.',
    blocks: [{ section: 'hebrew', count: 25, timeLimitSec: 18 * 60 }],
  },
  {
    id: 'verbal', title: 'סימולציה מילולית',
    description: 'אנלוגיות, היגיון ושלילות, והבנת הוראות.',
    blocks: [
      { section: 'analogies', count: 12, timeLimitSec: 7 * 60 },
      { section: 'logic', count: 10, timeLimitSec: 10 * 60 },
      { section: 'instructions', count: 10, timeLimitSec: 7 * 60 },
    ],
  },
  {
    id: 'quant', title: 'סימולציה כמותית וצורנית',
    description: 'סדרות, חשבון, ומטריצות צורניות.',
    blocks: [
      { section: 'numberSeries', count: 12, timeLimitSec: 9 * 60 },
      { section: 'math', count: 10, timeLimitSec: 12 * 60 },
      { section: 'figures', count: 12, timeLimitSec: 12 * 60 },
    ],
  },
];
