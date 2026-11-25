import { lazy, Suspense } from 'react';
import { HashRouter, NavLink, Route, Routes, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import { DEVELOPER } from './components/DeveloperCard';

// Route-level code splitting: the quiz engine & content load only when needed.
const PracticePage = lazy(() => import('./pages/PracticePage'));
const SimulationsPage = lazy(() => import('./pages/SimulationsPage'));
const QuizPage = lazy(() => import('./pages/QuizPage'));
const ResultsPage = lazy(() => import('./pages/ResultsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const MistakesPage = lazy(() => import('./pages/MistakesPage'));
const InterviewPage = lazy(() => import('./pages/InterviewPage'));
const PersonalityPage = lazy(() => import('./pages/PersonalityPage'));
const GuidePage = lazy(() => import('./pages/GuidePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

const NAV = [
  { to: '/', label: 'בית', end: true },
  { to: '/simulations', label: 'סימולציות' },
  { to: '/practice', label: 'תרגול' },
  { to: '/analytics', label: 'ניתוח' },
  { to: '/mistakes', label: 'טעויות' },
  { to: '/interview', label: 'ראיון' },
  { to: '/personality', label: 'אישיות' },
  { to: '/guide', label: 'מדריך' },
];

/**
 * HashRouter: the site is static (GitHub Pages / Vercel) – hash routes work on
 * any static host with no server-side rewrite rules.
 */
export default function App() {
  return (
    <HashRouter>
      <header className="app-header">
        <div className="header-inner">
          <Link to="/" className="brand"><span className="brand-badge">פס</span> PsychoTech Prep</Link>
          <nav className="nav" aria-label="ניווט ראשי">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end}>{n.label}</NavLink>)}
            <NavLink to="/settings" aria-label="הגדרות">⚙️</NavLink>
          </nav>
        </div>
      </header>
      <main className="container">
        <Suspense fallback={<div className="empty">טוען…</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/simulations" element={<SimulationsPage />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/results/:id" element={<ResultsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/mistakes" element={<MistakesPage />} />
            <Route path="/interview" element={<InterviewPage />} />
            <Route path="/personality" element={<PersonalityPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<div className="card empty"><p>הדף לא נמצא</p><Link className="btn" to="/">לדף הבית</Link></div>} />
          </Routes>
        </Suspense>
      </main>
      <footer className="footer">
        פותח על ידי <a href={DEVELOPER.linkedin} target="_blank" rel="noopener noreferrer">{DEVELOPER.name}</a> ·{' '}
        <a href="https://github.com/EdenAlon23/psychotech-prep" target="_blank" rel="noopener noreferrer">קוד המקור ב-GitHub</a>
        <br />
        כל השאלות מקוריות ונכתבו/נוצרו לצורכי תרגול. הנתונים נשמרים מקומית בדפדפן בלבד.
      </footer>
    </HashRouter>
  );
}
