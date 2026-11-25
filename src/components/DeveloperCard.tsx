/** "Built by" strip – single source for the developer's public links. */
export const DEVELOPER = {
  name: 'עדן אלון',
  linkedin: 'https://www.linkedin.com/in/eden-izhak-alon',
  github: 'https://github.com/EdenAlon23',
} as const;

export function DeveloperCard() {
  return (
    <section className="card dev-card" aria-label="על המפתח">
      <div className="row" style={{ gap: '0.8rem' }}>
        <div className="dev-avatar" aria-hidden>EA</div>
        <strong style={{ fontSize: '1.1rem' }}>פותח על ידי {DEVELOPER.name}</strong>
      </div>
      <div className="row">
        <a className="btn btn-sm" href={DEVELOPER.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
        <a className="btn btn-sm btn-ghost" href={DEVELOPER.github} target="_blank" rel="noopener noreferrer">GitHub</a>
      </div>
    </section>
  );
}
