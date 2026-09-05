import { useTranslation } from 'react-i18next';

export default function GroupDirectory({ groups, onClose, onJoin }) {
  const { t } = useTranslation();
  return (
    <>
      <button type="button" className="sheet-backdrop" aria-label={t('groups.close')} onClick={onClose} />
      <section className="sheet" role="dialog" aria-labelledby="groups-title">
        <header className="sheet-head">
          <div>
            <h2 id="groups-title">{t('groups.title')}</h2>
            <p className="hint">{t('groups.lead')}</p>
          </div>
          <button type="button" className="chip" onClick={onClose}>
            {t('groups.close')}
          </button>
        </header>
        <div className="sheet-body">
          {!groups.length ? (
            <p className="hint">{t('groups.empty')}</p>
          ) : (
            <div className="group-list">
              {groups.map((g) => (
                <article key={g.inviteCode} className="group-card">
                  <div>
                    <p className="badge">{t('groups.publicBadge')}</p>
                    <h3>{g.name}</h3>
                    <p className="hint">{t('groups.members', { count: g.memberCount })}</p>
                  </div>
                  <button type="button" className="btn btn-primary" onClick={() => onJoin(g.inviteCode)}>
                    {t('groups.join')}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
