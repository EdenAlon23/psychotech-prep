/** "Created by" card – single source for the developer's public links. */
export const DEVELOPER = {
  name: 'עדן אלון',
  nameEn: 'Eden Alon',
  linkedin: 'https://www.linkedin.com/in/eden-izhak-alon',
  linkedinLabel: 'eden-izhak-alon',
  github: 'https://github.com/EdenAlon23',
  githubLabel: 'EdenAlon23',
  repo: 'https://github.com/EdenAlon23/psychotech-prep',
} as const;

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

export function DeveloperCard() {
  return (
    <aside className="dev-card" aria-label="על המפתח">
      <div className="dev-eyebrow">CREATED BY</div>
      <div className="dev-name">{DEVELOPER.nameEn}</div>
      <div className="dev-sub">{DEVELOPER.name}</div>
      <dl className="dev-rows">
        <dt>מטרה</dt>
        <dd>כלי עזר חינמי להכנה למבחנים פסיכוטכניים</dd>
        <dt>LinkedIn</dt>
        <dd><a href={DEVELOPER.linkedin} {...ext}>{DEVELOPER.linkedinLabel}</a></dd>
        <dt>GitHub</dt>
        <dd><a href={DEVELOPER.github} {...ext}>{DEVELOPER.githubLabel}</a></dd>
        <dt>קוד מקור</dt>
        <dd><a href={DEVELOPER.repo} {...ext}>psychotech-prep</a></dd>
      </dl>
    </aside>
  );
}
