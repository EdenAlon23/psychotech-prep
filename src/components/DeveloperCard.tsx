import { useT } from '../i18n';

/** "Created by" card – single source for the developer's public links. */
export const DEVELOPER = {
  name: 'עדן אלון',
  nameEn: 'Eden Alon',
  linkedin: 'https://www.linkedin.com/in/eden-izhak-alon',
  linkedinLabel: 'eden-izhak-alon',
  github: 'https://github.com/EdenAlon23',
  githubLabel: 'EdenAlon23',
} as const;

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

export function DeveloperCard() {
  const { t } = useT();
  return (
    <aside className="dev-card" aria-label={t('על המפתח', 'About the developer')}>
      <div className="dev-eyebrow">{t('נוצר על ידי', 'Created by')}</div>
      <div className="dev-name">{t(DEVELOPER.name, DEVELOPER.nameEn)}</div>
      <dl className="dev-rows">
        <dt>{t('מטרה', 'Goal')}</dt>
        <dd>{t('כלי עזר חינמי להכנה למבחנים פסיכוטכניים', 'A free tool for exam preparation')}</dd>
        <dt>LinkedIn</dt>
        <dd><a href={DEVELOPER.linkedin} {...ext}>{DEVELOPER.linkedinLabel}</a></dd>
        <dt>GitHub</dt>
        <dd><a href={DEVELOPER.github} {...ext}>{DEVELOPER.githubLabel}</a></dd>
      </dl>
    </aside>
  );
}
