import { useState } from 'react';
import { exportAll, getSettings, importAll, resetAll, saveSettings } from '../services/storage';

export default function SettingsPage() {
  const [settings, setSettings] = useState(getSettings());
  const [msg, setMsg] = useState('');

  const download = () => {
    const blob = new Blob([exportAll()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `psychotech-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const upload = async (file: File) => {
    try {
      importAll(await file.text());
      setMsg('הנתונים יובאו בהצלחה ✓');
    } catch (e) {
      setMsg(`שגיאה בייבוא: ${(e as Error).message}`);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-head"><h1>⚙️ הגדרות</h1></div>
      <div className="card">
        <label htmlFor="name">שם (אופציונלי)</label>
        <input id="name" type="text" value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
        <label htmlFor="date" className="mt" style={{ display: 'block' }}>תאריך המבחן</label>
        <input id="date" type="date" value={settings.examDate} onChange={(e) => setSettings({ ...settings, examDate: e.target.value })} />
        <button className="btn mt" onClick={() => { saveSettings(settings); setMsg('נשמר ✓'); }}>שמור</button>
      </div>
      <div className="card">
        <h2>גיבוי ושחזור</h2>
        <p className="muted small">כל הנתונים נשמרים רק בדפדפן הזה (אין שרת). אפשר לייצא קובץ ולייבא אותו במכשיר אחר.</p>
        <div className="row">
          <button className="btn btn-ghost" onClick={download}>⬇ ייצוא</button>
          <label className="btn btn-ghost">
            ⬆ ייבוא
            <input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
          <button className="btn btn-danger" onClick={() => { if (window.confirm('למחוק את כל הנתונים? לא ניתן לשחזר.')) { resetAll(); setMsg('כל הנתונים נמחקו'); } }}>
            איפוס
          </button>
        </div>
      </div>
      {msg && <p className="chip primary mt">{msg}</p>}
    </div>
  );
}
