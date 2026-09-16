import { useTranslation } from 'react-i18next';
import { countryName, diseaseLabel, getGenesForDisease, buildExonEditorUrl } from '../catalog.js';

export default function PinCard({ pin, onClose }) {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage || 'en').split('-')[0];
  if (!pin) return null;

  const genes = getGenesForDisease(pin.rareDiseaseKey);

  return (
    <article className="pin-card" role="dialog" aria-label={t('pin.alwaysVisible')}>
      <button type="button" className="close" onClick={onClose} aria-label={t('pin.close')}>
        ×
      </button>
      <p className="badge">{t('pin.alwaysVisible')}</p>
      <h3>{diseaseLabel(pin, t)}</h3>
      <dl className="pin-dl">
        <div>
          <dt>{t('pin.country')}</dt>
          <dd>{countryName(pin.countryCode, locale)}</dd>
        </div>
        <div>
          <dt>{t('pin.disease')}</dt>
          <dd>{diseaseLabel(pin, t)}</dd>
        </div>
        {pin.variant ? (
          <div>
            <dt>{t('pin.variant')}</dt>
            <dd>{pin.variant}</dd>
          </div>
        ) : null}
        {pin.townCity ? (
          <div>
            <dt>{t('pin.town')}</dt>
            <dd>{pin.townCity}</dd>
          </div>
        ) : null}
      </dl>
      {genes.length > 0 && (
        <div className="exon-editor-links">
          <p className="exon-editor-label">{t('pin.exonEditorLabel')}</p>
          <ul className="exon-gene-list">
            {genes.map((gene) => (
              <li key={gene}>
                <a
                  href={buildExonEditorUrl(gene)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="exon-link"
                >
                  {t('pin.viewGene', { gene })}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
