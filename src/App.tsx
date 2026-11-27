import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { HashRouter, NavLink, Route, Routes, Link, useLocation } from 'react-router-dom';
import { currentExam } from './services/profile';
import HomePage from './pages/HomePage';
import { DEVELOPER } from './components/DeveloperCard';
import PremiumGate from './components/PremiumGate';
import { paywallEnabled } from './services/entitlements';
import { refreshLicense } from './services/license';

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
const VocabPage = lazy(() => import('./pages/VocabPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UpgradePage = lazy(() => import('./pages/UpgradePage'));
const StartPage = lazy(() => import('./pages/StartPage'));

/** Re-mounts on every route change (key = path) so the enter animation replays: a light page transition. */
function PageTransition({ children }: { children: ReactNode }) {
  const loc = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [loc.pathname]);
  return <div key={loc.pathname} className="page-enter">{children}</div>;
}

function ExamChip() {
  const [exam, setExam] = useState(currentExam());
  useEffect(() => { const f = () => setExam(currentExam()); window.addEventListener('pp:profile', f); return () => window.removeEventListener('pp:profile', f); }, []);
  return <Link to="/start" className="exam-chip" title="החלפת מבחן">{exam.icon} {exam.nameShort} <span aria-hidden>▾</span></Link>;
}

const NAV = [
  { to: '/', label: 'בית', end: true },
  { to: '/simulations', label: 'סימולציות' },
  { to: '/practice', label: 'תרגול' },
  { to: '/vocab', label: 'אוצר מילים' },
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
  // Re-check a stored license once a day so refunded keys stop working.
  useEffect(() => { if (paywallEnabled()) void refreshLicense(); }, []);
  return (
    <HashRouter>
      <header className="app-header">
        <div className="header-inner">
          <Link to="/" className="brand"><span className="brand-badge">✦</span> <span className="brand-name">PsychoTech<b>Prep</b></span></Link>
          <ExamChip />
          <nav className="nav" aria-label="ניווט ראשי">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end}>{n.label}</NavLink>)}
            <NavLink to="/settings" aria-label="הגדרות">⚙️</NavLink>
          </nav>
        </div>
      </header>
      <main className="container">
        <Suspense fallback={<div className="empty"><span className="spinner" aria-label="טוען" /></div>}>
          <PageTransition>
          <Routes>
            <Route path="/start" element={<StartPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/simulations" element={<SimulationsPage />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/results/:id" element={<ResultsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/mistakes" element={<MistakesPage />} />
            <Route path="/interview" element={<PremiumGate feature="interview_coach" title="הכנה לראיון"><InterviewPage /></PremiumGate>} />
            <Route path="/personality" element={<PremiumGate feature="personality_analysis" title="שאלון אישיות"><PersonalityPage /></PremiumGate>} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/vocab" element={<VocabPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/upgrade" element={<UpgradePage />} />
            <Route path="*" element={<div className="card empty"><p>הדף לא נמצא</p><Link className="btn" to="/">לדף הבית</Link></div>} />
          </Routes>
          </PageTransition>
        </Suspense>
      </main>
      <footer className="footer">
        נוצר על ידי <a href={DEVELOPER.linkedin} target="_blank" rel="noopener noreferrer">{DEVELOPER.name}</a>
        <br />
        כל השאלות מקוריות ונכתבו/נוצרו לצורכי תרגול. הנתונים נשמרים מקומית בדפדפן בלבד.
      </footer>
    </HashRouter>
  );
}
