/** "Built by" strip – single source for the developer's public links. */
export const DEVELOPER = {
  name: 'עדן אלון',
  nameEn: 'Eden Alon',
  role: 'סטודנט שנה ג׳ למדעי המחשב (התמחות סייבר) · HIT',
  linkedin: 'https://www.linkedin.com/in/eden-izhak-alon',
  github: 'https://github.com/EdenAlon23',
  email: 'eden.izh.alon@gmail.com',
} as const;

export function DeveloperCard() {
  return (
    <section className="card dev-card" aria-label="על המפתח">
      <div className="row" style={{ gap: '0.8rem' }}>
        <div className="dev-avatar" aria-hidden>EA</div>
        <div>
          <div className="small muted">פותח ונבנה על ידי</div>
          <strong style={{ fontSize: '1.1rem' }}>{DEVELOPER.name}</strong>
          <span className="muted small"> · {DEVELOPER.role}</span>
        </div>
      </div>
      <div className="row">
        <a className="btn btn-sm" href={DEVELOPER.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
        <a className="btn btn-sm btn-ghost" href={DEVELOPER.github} target="_blank" rel="noopener noreferrer">GitHub</a>
        <a className="btn btn-sm btn-ghost" href={`mailto:${DEVELOPER.email}`}>✉ {DEVELOPER.email}</a>
      </div>
    </section>
  );
}
