/** "Created by" card – single source for the developer's public links. */
export const DEVELOPER = {
  name: 'עדן אלון',
  linkedin: 'https://www.linkedin.com/in/eden-izhak-alon',
  linkedinLabel: 'eden-izhak-alon',
  github: 'https://github.com/EdenAlon23',
  githubLabel: 'EdenAlon23',
} as const;

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

export function DeveloperCard() {
  return (
    <aside className="dev-card" aria-label="על המפתח">
      <div className="dev-eyebrow">נוצר על ידי</div>
      <div className="dev-name">{DEVELOPER.name}</div>
      <dl className="dev-rows">
        <dt>מטרה</dt>
        <dd>כלי עזר חינמי להכנה למבחנים פסיכוטכניים</dd>
        <dt>LinkedIn</dt>
        <dd><a href={DEVELOPER.linkedin} {...ext}>{DEVELOPER.linkedinLabel}</a></dd>
        <dt>GitHub</dt>
        <dd><a href={DEVELOPER.github} {...ext}>{DEVELOPER.githubLabel}</a></dd>
      </dl>
    </aside>
  );
}
