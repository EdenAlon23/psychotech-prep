import { examDayChecklist } from '../data/interview';
import { SECTIONS } from '../data/sections';

export default function GuidePage() {
  return (
    <div>
      <div className="page-head">
        <h1>📘 מדריך ותוכנית הכנה</h1>
        <p>מבנה התהליך, אסטרטגיה לכל פרק ותוכנית לימים שנותרו.</p>
      </div>

      <div className="card mb">
        <h2>שלבי המיון (כללי)</h2>
        <ol>
          <li><b>מבחנים קוגניטיביים ממוחשבים</b> – פרקים נפרדים עם זמן לכל פרק: הבנת הוראות, אנלוגיות, סדרות, חשבון, צורות, קשב, ולעיתים עברית.</li>
          <li><b>שאלונים</b> – שאלון ביוגרפי ושאלון אישיות. בודקים עקביות ואמינות.</li>
          <li><b>ראיון עם מאבחנת / פסיכולוג/ית תעסוקתי/ת</b> – מוטיבציה, התאמה לתפקיד, יושרה, דרכי התמודדות.</li>
          <li>לעיתים <b>דינמיקה קבוצתית</b> או מטלת סימולציה.</li>
        </ol>
        <p className="small muted" style={{ margin: 0 }}>המבנה המדויק משתנה בין מכוני מיון ותפקידים – מומלץ לקרוא היטב את הזימון ואת ההוראות בתחילת כל פרק.</p>
      </div>

      <div className="card mb">
        <h2>תוכנית ל-4 ימים</h2>
        <table>
          <thead><tr><th>יום</th><th>מה עושים</th></tr></thead>
          <tbody>
            <tr><td>1</td><td>סימולציה מקוצרת (תמונת מצב) ← עבור על הטעויות ← תרגול ממוקד ×2 ← שאלון אישיות ← כתיבת 3 סיפורים לראיון.</td></tr>
            <tr><td>2</td><td>סימולציה מלאה ← תרגול לפי שני הפרקים החלשים (עם טיימר) ← סימולציית עברית ← תרגול ראיון: 10 שאלות.</td></tr>
            <tr><td>3</td><td>סימולציה מלאה נוספת ← מחברת טעויות ← תרגול ממוקד ← השלמת בנק הסיפורים ← תרגול ראיון בקול מול מראה/חבר.</td></tr>
            <tr><td>ערב לפני</td><td>תרגול קל בלבד (20 דק'), מעבר על הטיפים ורשימת יום המבחן. שינה מוקדמת.</td></tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-2">
        {SECTIONS.map((s) => (
          <div key={s.id} className="card">
            <h3>{s.icon} {s.title}</h3>
            <p className="small muted">{s.description} · יעד: ~{s.targetSecPerQuestion} שנ' לשאלה</p>
            <ul className="tips">{s.tips.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        ))}
      </div>

      <div className="card mt">
        <h2>✅ צ'קליסט ליום המבחן</h2>
        <ul className="tips">{examDayChecklist.map((t) => <li key={t}>{t}</li>)}</ul>
      </div>
    </div>
  );
}
