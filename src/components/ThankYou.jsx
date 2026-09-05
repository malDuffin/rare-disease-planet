import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { COUNTRIES } from '../../server/countries.js';
import {
  DISEASE_KEYS,
  RELATIONSHIP_KEYS,
  ROLE_KEYS,
  countryName,
  diseaseLabel,
} from '../catalog.js';
import { api } from '../api.js';

export default function ThankYou({ result, onClose, onAdded }) {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage || 'en').split('-')[0];
  const [copied, setCopied] = useState(false);
  const [showFamily, setShowFamily] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);
  const [family, setFamily] = useState({
    relationship: 'child',
    role: 'living_with',
    countryCode: result?.pin?.countryCode || '',
    rareDiseaseKey: result?.pin?.rareDiseaseKey || '',
    rareDiseaseCustom: '',
    variant: '',
    townCity: '',
    townCityPublic: false,
    displayName: '',
    email: '',
    consent: false,
  });

  const inviteUrl = useMemo(() => {
    if (!result?.group?.inviteCode) return '';
    const url = new URL(window.location.origin);
    url.searchParams.set('g', result.group.inviteCode);
    return url.toString();
  }, [result]);

  const countries = useMemo(
    () =>
      [...COUNTRIES].sort((a, b) =>
        countryName(a.code, locale).localeCompare(countryName(b.code, locale), locale),
      ),
    [locale],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const addFamily = async () => {
    if (!family.consent) {
      setError('consent_required');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await api.family({
        familyToken: result.familyToken,
        ...family,
        country: countryName(family.countryCode, locale),
      });
      setAdded(true);
      setShowFamily(false);
      onAdded?.(data);
    } catch (e) {
      setError(e.code || 'generic');
    } finally {
      setBusy(false);
    }
  };

  const pin = result?.pin;
  const group = result?.group;

  return (
    <>
      <button type="button" className="sheet-backdrop" aria-label={t('thanks.back')} onClick={onClose} />
      <section className="sheet sheet-wide" role="dialog" aria-labelledby="thanks-title">
        <header className="sheet-head">
          <div>
            <h2 id="thanks-title">{t('thanks.title')}</h2>
            <p className="hint">{t('thanks.body')}</p>
          </div>
          <button type="button" className="chip" onClick={onClose}>
            {t('thanks.back')}
          </button>
        </header>
        <div className="sheet-body">
          {pin ? (
            <div className="pin-preview">
              <span className="label">{t('survey.reviewWillShow')}</span>
              <strong>
                {[
                  countryName(pin.countryCode, locale),
                  diseaseLabel(pin, t),
                  pin.variant,
                  pin.townCity,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </strong>
            </div>
          ) : null}

          {group ? (
            <>
              <h3 className="label">{t('thanks.inviteTitle')}</h3>
              <p className="hint">{t('thanks.inviteHelp')}</p>
              <p>
                <strong>{group.name}</strong>
                <span className="hint"> · {t('groups.members', { count: group.memberCount })}</span>
              </p>
              <p className="invite-code">{group.inviteCode}</p>
              <div className="qr-box">
                <QRCodeSVG value={inviteUrl} size={168} bgColor="#f8eef8" fgColor="#1a0a22" />
                <span>{t('thanks.qr')}</span>
              </div>
              <button type="button" className="btn btn-primary btn-full" onClick={copy}>
                {copied ? t('thanks.copied') : t('thanks.copyLink')}
              </button>
            </>
          ) : null}

          {added ? <div className="ok">{t('thanks.added')}</div> : null}
          {error ? <div className="error">{t(`errors.${error}`, { defaultValue: t('errors.generic') })}</div> : null}

          {group && !showFamily ? (
            <button
              type="button"
              className="btn btn-full"
              style={{ marginTop: 12 }}
              onClick={() => {
                setAdded(false);
                setShowFamily(true);
              }}
            >
              {t('thanks.addFamily')}
            </button>
          ) : null}

          {group && showFamily ? (
            <div style={{ marginTop: 18 }}>
              <h3>{t('thanks.addFamily')}</h3>
              <p className="hint">{t('thanks.addFamilyLead')}</p>
              <div className="field">
                <label htmlFor="rel">{t('thanks.relationship')}</label>
                <select
                  id="rel"
                  value={family.relationship}
                  onChange={(e) => setFamily((f) => ({ ...f, relationship: e.target.value }))}
                >
                  {RELATIONSHIP_KEYS.map((k) => (
                    <option key={k} value={k}>{t(`relationships.${k}`)}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="frole">{t('survey.role')}</label>
                <select
                  id="frole"
                  value={family.role}
                  onChange={(e) => setFamily((f) => ({ ...f, role: e.target.value }))}
                >
                  {ROLE_KEYS.map((k) => (
                    <option key={k} value={k}>{t(`roles.${k}`)}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="fcountry">{t('survey.country')}<span className="req">{t('survey.required')}</span></label>
                <select
                  id="fcountry"
                  value={family.countryCode}
                  onChange={(e) => setFamily((f) => ({ ...f, countryCode: e.target.value }))}
                >
                  <option value="">{t('survey.countryPlaceholder')}</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>{countryName(c.code, locale)}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="fdisease">{t('survey.disease')}<span className="req">{t('survey.required')}</span></label>
                <select
                  id="fdisease"
                  value={family.rareDiseaseKey}
                  onChange={(e) => setFamily((f) => ({ ...f, rareDiseaseKey: e.target.value }))}
                >
                  <option value="">{t('survey.diseasePlaceholder')}</option>
                  {DISEASE_KEYS.map((k) => (
                    <option key={k} value={k}>{t(`diseases.${k}`)}</option>
                  ))}
                </select>
              </div>
              {family.rareDiseaseKey === 'other' && (
                <div className="field">
                  <label htmlFor="fother">{t('survey.diseaseOther')}</label>
                  <input
                    id="fother"
                    value={family.rareDiseaseCustom}
                    onChange={(e) => setFamily((f) => ({ ...f, rareDiseaseCustom: e.target.value }))}
                  />
                </div>
              )}
              <div className="field">
                <label htmlFor="fvariant">{t('survey.variant')}</label>
                <input
                  id="fvariant"
                  value={family.variant}
                  onChange={(e) => setFamily((f) => ({ ...f, variant: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="ftown">{t('survey.town')}</label>
                <input
                  id="ftown"
                  value={family.townCity}
                  onChange={(e) => setFamily((f) => ({ ...f, townCity: e.target.value }))}
                />
              </div>
              <label className="consent">
                <input
                  type="checkbox"
                  checked={family.townCityPublic}
                  onChange={(e) => setFamily((f) => ({ ...f, townCityPublic: e.target.checked }))}
                />
                <span>{t('survey.townToggle')}</span>
              </label>
              <div className="field">
                <label htmlFor="fname">{t('survey.displayName')}</label>
                <input
                  id="fname"
                  value={family.displayName}
                  onChange={(e) => setFamily((f) => ({ ...f, displayName: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="femail">{t('survey.email')}</label>
                <input
                  id="femail"
                  type="email"
                  value={family.email}
                  onChange={(e) => setFamily((f) => ({ ...f, email: e.target.value }))}
                />
                <p className="hint">{t('survey.emailNever')}</p>
              </div>
              <label className="consent">
                <input
                  type="checkbox"
                  checked={family.consent}
                  onChange={(e) => setFamily((f) => ({ ...f, consent: e.target.checked }))}
                />
                <span>{t('survey.consentLabel')}</span>
              </label>
              <button type="button" className="btn btn-primary btn-full" disabled={busy} onClick={addFamily}>
                {busy ? t('survey.submitting') : t('thanks.submitFamily')}
              </button>
              <button type="button" className="btn btn-ghost btn-full" onClick={() => setShowFamily(false)}>
                {t('thanks.skip')}
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
