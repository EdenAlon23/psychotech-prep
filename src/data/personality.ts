/**
 * Practice personality questionnaire. There are no "right" answers – the goal
 * is to rehearse the format and learn what assessors look at: CONSISTENCY
 * between items that ask the same thing in different words, and implausibly
 * "perfect" answers on social-desirability (lie-scale) items.
 * Items with the same `pairId` measure the same trait; `reversed` items are
 * phrased in the opposite direction (5 there = 1 on the trait).
 */
export interface PersonalityItem {
  id: string;
  text: string;
  trait: string;
  pairId?: string;
  reversed?: boolean;
  /** Social-desirability item: honest people rarely answer at the extreme. */
  lieScale?: boolean;
}

export const LIKERT = ['כלל לא מסכים', 'לא מסכים', 'ניטרלי', 'מסכים', 'מסכים מאוד'] as const;

export const personalityItems: PersonalityItem[] = [
  { id: 'p1', text: 'אני מקפיד לסיים משימות שהתחלתי.', trait: 'מצפוניות', pairId: 'c1' },
  { id: 'p2', text: 'אני נהנה לפגוש אנשים חדשים.', trait: 'מוחצנות', pairId: 'e1' },
  { id: 'p3', text: 'במצבי לחץ אני נשאר רגוע.', trait: 'יציבות רגשית', pairId: 's1' },
  { id: 'p4', text: 'מעולם לא אמרתי שקר, אפילו לא קטן.', trait: 'רצייה חברתית', lieScale: true },
  { id: 'p5', text: 'אני מעדיף לעבוד לפי נהלים ברורים.', trait: 'מחויבות לנהלים', pairId: 'r1' },
  { id: 'p6', text: 'לפעמים אני דוחה דברים לרגע האחרון.', trait: 'מצפוניות', pairId: 'c1', reversed: true },
  { id: 'p7', text: 'אני מתקשה לפתוח שיחה עם זרים.', trait: 'מוחצנות', pairId: 'e1', reversed: true },
  { id: 'p8', text: 'חשוב לי שאחרים ירגישו בנוח לידי.', trait: 'נעימות', pairId: 'a1' },
  { id: 'p9', text: 'כשמבקרים אותי, אני נפגע לזמן רב.', trait: 'יציבות רגשית', pairId: 's1', reversed: true },
  { id: 'p10', text: 'אני תמיד מסכים עם כל מה שהמפקד/המנהל אומר.', trait: 'רצייה חברתית', lieScale: true },
  { id: 'p11', text: 'כללים נועדו לפעמים כדי לעקוף אותם.', trait: 'מחויבות לנהלים', pairId: 'r1', reversed: true },
  { id: 'p12', text: 'אני מתכנן את השבוע שלי מראש.', trait: 'מצפוניות', pairId: 'c2' },
  { id: 'p13', text: 'אני לוקח יוזמה גם בלי שמבקשים ממני.', trait: 'יוזמה', pairId: 'i1' },
  { id: 'p14', text: 'אני נוטה להתעצבן מהר.', trait: 'יציבות רגשית', pairId: 's2', reversed: true },
  { id: 'p15', text: 'אני מקשיב לאחרים גם כשאני לא מסכים איתם.', trait: 'נעימות', pairId: 'a1' },
  { id: 'p16', text: 'מעולם לא כעסתי על אף אחד.', trait: 'רצייה חברתית', lieScale: true },
  { id: 'p17', text: 'אני מחכה שיגידו לי מה לעשות.', trait: 'יוזמה', pairId: 'i1', reversed: true },
  { id: 'p18', text: 'אני שומר על סדר בחפצים ובמסמכים שלי.', trait: 'מצפוניות', pairId: 'c2' },
  { id: 'p19', text: 'אני מרגיש בנוח להוביל קבוצה.', trait: 'מוחצנות', pairId: 'e2' },
  { id: 'p20', text: 'גם כשקשה לי, אני מצליח לשמור על קור רוח.', trait: 'יציבות רגשית', pairId: 's2' },
  { id: 'p21', text: 'אם חבר לעבודה מפר נוהל, אדווח על כך גם אם זה לא נעים.', trait: 'יושרה', pairId: 'h1' },
  { id: 'p22', text: 'לפעמים מותר לעגל פינות אם אף אחד לא רואה.', trait: 'יושרה', pairId: 'h1', reversed: true },
  { id: 'p23', text: 'אני תמיד במצב רוח טוב.', trait: 'רצייה חברתית', lieScale: true },
  { id: 'p24', text: 'אני מעדיף להישאר ברקע בדיונים קבוצתיים.', trait: 'מוחצנות', pairId: 'e2', reversed: true },
  { id: 'p25', text: 'אני מקבל בקלות שינויים בתוכניות.', trait: 'גמישות', pairId: 'f1' },
  { id: 'p26', text: 'שינוי של הרגע האחרון מוציא אותי מאיזון.', trait: 'גמישות', pairId: 'f1', reversed: true },
  { id: 'p27', text: 'אני מודה בטעויות שלי.', trait: 'יושרה', pairId: 'h2' },
  { id: 'p28', text: 'כשאני טועה, אני מעדיף שלא ידעו על זה.', trait: 'יושרה', pairId: 'h2', reversed: true },
  { id: 'p29', text: 'אני אף פעם לא מאחר.', trait: 'רצייה חברתית', lieScale: true },
  { id: 'p30', text: 'אכפת לי מאנשים שעובדים איתי.', trait: 'נעימות', pairId: 'a2' },
  { id: 'p31', text: 'לא מעניינות אותי הבעיות של אחרים.', trait: 'נעימות', pairId: 'a2', reversed: true },
  { id: 'p32', text: 'אני מציע רעיונות לשיפור בעבודה.', trait: 'יוזמה', pairId: 'i2' },
  { id: 'p33', text: 'אם משהו עובד – אין סיבה לשנות אותו.', trait: 'יוזמה', pairId: 'i2', reversed: true },
];
