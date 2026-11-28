import { useState } from 'react';
import { exportAll, getSettings, importAll, resetAll, saveSettings } from '../services/storage';
import { useT } from '../i18n';

export default function SettingsPage() {
  const [settings, setSettings] = useState(getSettings());
  const [msg, setMsg] = useState('');
  const { t } = useT();

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
      setMsg(t('הנתונים יובאו בהצלחה ✓', 'Data imported ✓'));
    } catch (e) {
      setMsg(`${t('שגיאה בייבוא', 'Import failed')}: ${(e as Error).message}`);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-head"><h1>⚙️ {t('הגדרות', 'Settings')}</h1></div>
      <div className="card">
        <label htmlFor="name">{t('שם (אופציונלי)', 'Name (optional)')}</label>
        <input id="name" type="text" value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
        <label htmlFor="date" className="mt" style={{ display: 'block' }}>{t('תאריך המבחן', 'Exam date')}</label>
        <input id="date" type="date" value={settings.examDate} onChange={(e) => setSettings({ ...settings, examDate: e.target.value })} />
        <button className="btn mt" onClick={() => { saveSettings(settings); setMsg(t('נשמר ✓', 'Saved ✓')); }}>{t('שמור', 'Save')}</button>
      </div>
      <div className="card">
        <h2>{t('גיבוי ושחזור', 'Backup and restore')}</h2>
        <p className="muted small">{t('כל הנתונים נשמרים רק בדפדפן הזה (אין שרת). אפשר לייצא קובץ ולייבא אותו במכשיר אחר.', 'All data is stored only in this browser (there is no server). Export a file to move it to another device.')}</p>
        <div className="row">
          <button className="btn btn-ghost" onClick={download}>⬇ {t('ייצוא', 'Export')}</button>
          <label className="btn btn-ghost">
            ⬆ {t('ייבוא', 'Import')}
            <input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
          <button className="btn btn-danger" onClick={() => { if (window.confirm(t('למחוק את כל הנתונים? לא ניתן לשחזר.', 'Delete all data? This cannot be undone.'))) { resetAll(); setMsg(t('כל הנתונים נמחקו', 'All data deleted')); } }}>
            {t('איפוס', 'Reset')}
          </button>
        </div>
      </div>
      {msg && <p className="chip primary mt">{msg}</p>}
    </div>
  );
}
