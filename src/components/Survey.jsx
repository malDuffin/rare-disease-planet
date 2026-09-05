import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COUNTRIES } from '../../server/countries.js';
import {
  DISEASE_KEYS,
  FEATURE_KEYS,
  ROLE_KEYS,
  countryName,
} from '../catalog.js';
import { api } from '../api.js';

const STEPS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emptyForm(inviteCode = '') {
  return {
    consent: false,
    wantsUpdates: false,
    role: '',
    countryCode: '',
    rareDiseaseKey: '',
    rareDiseaseCustom: '',
    variant: '',
    townCity: '',
    townCityPublic: false,
    displayName: '',
    email: '',
    features: [],
    featureOther: '',
    groupAction: inviteCode ? 'join' : 'none',
    groupType: 'public_group',
    groupName: '',
    inviteCode,
  };
}

export default function Survey({ inviteCode, onClose, onSubmitted }) {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage || 'en').split('-')[0];
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => emptyForm(inviteCode || ''));
  const [invite, setInvite] = useState(null);
  const [inviteError, setInviteError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!inviteCode) return undefined;
    let live = true;
    api
      .invite(inviteCode)
      .then((data) => {
        if (!live) return;
        setInvite(data);
        setForm((f) => ({ ...f, groupAction: 'join', inviteCode: data.inviteCode }));
      })
      .catch(() => {
        if (!live) return;
        setInviteError('invite_invalid');
      });
    return () => {
      live = false;
    };
  }, [inviteCode]);

  const countries = useMemo(() => {
    return [...COUNTRIES].sort((a, b) =>
      countryName(a.code, locale).localeCompare(countryName(b.code, locale), locale),
    );
  }, [locale]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const diseaseName = useMemo(() => {
    if (form.rareDiseaseKey && form.rareDiseaseKey !== 'other') {
      return t(`diseases.${form.rareDiseaseKey}`);
    }
    return form.rareDiseaseCustom.trim();
  }, [form.rareDiseaseKey, form.rareDiseaseCustom, t]);

  const countryLabel = form.countryCode ? countryName(form.countryCode, locale) : '';
  const pinParts = [countryLabel, diseaseName, form.variant.trim()].filter(Boolean);

  const toggleFeature = (key) => {
    setForm((f) => {
      const has = f.features.includes(key);
      if (has) return { ...f, features: f.features.filter((x) => x !== key) };
      if (f.features.length >= 3) return f;
      return { ...f, features: [...f.features, key] };
    });
  };

  function validateStep(s) {
    if (s === 0 && !form.consent) return 'consent_required';
    if (s === 1) {
      if (!form.countryCode) return 'country_required';
      if (!form.rareDiseaseKey) return 'disease_required';
      if (form.rareDiseaseKey === 'other' && !form.rareDiseaseCustom.trim()) {
        return 'disease_required';
      }
    }
    if (s === 2 && (!form.email.trim() || !EMAIL_RE.test(form.email.trim()))) {
      return 'email_invalid';
    }
    if (s === 3 && form.groupAction === 'create' && !form.groupName.trim()) {
      return 'group_required';
    }
    if (s === 3 && form.groupAction === 'join' && !form.inviteCode.trim()) {
      return 'invite_invalid';
    }
    return '';
  }

  const goNext = async () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    if (step === 3 && form.groupAction === 'join' && form.inviteCode && !invite) {
      try {
        const data = await api.invite(form.inviteCode.trim());
        setInvite(data);
        setInviteError('');
      } catch {
        setInviteError('invite_invalid');
        setError('invite_invalid');
        return;
      }
    }
    setStep((n) => Math.min(STEPS - 1, n + 1));
  };

  const submit = async () => {
    const err = validateStep(0) || validateStep(1) || validateStep(2) || validateStep(3);
    if (err) {
      setError(err);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await api.survey({
        consent: form.consent,
        wantsUpdates: form.wantsUpdates,
        role: form.role || null,
        countryCode: form.countryCode,
        country: countryLabel,
        rareDiseaseKey: form.rareDiseaseKey,
        rareDiseaseCustom: form.rareDiseaseCustom,
        variant: form.variant,
        townCity: form.townCity,
        townCityPublic: form.townCityPublic,
        displayName: form.displayName,
        email: form.email.trim(),
        features: form.features,
        featureOther: form.featureOther,
        groupAction: form.groupAction,
        groupType: form.groupType,
        groupName: form.groupName,
        inviteCode: form.inviteCode,
      });
      onSubmitted(result);
    } catch (e) {
      setError(e.code || 'generic');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="sheet-backdrop" aria-label={t('nav.backToGlobe')} onClick={onClose} />
      <section className="sheet" role="dialog" aria-labelledby="survey-title">
        <header className="sheet-head">
          <div>
            <h2 id="survey-title">{t('survey.title')}</h2>
            <p className="hint">
              {t('survey.stepProgress', { current: step + 1, total: STEPS })}
            </p>
          </div>
          <button type="button" className="chip" onClick={onClose}>
            {t('nav.backToGlobe')}
          </button>
        </header>
        <div className="steps" aria-hidden="true">
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={i <= step ? 'on' : ''} />
          ))}
        </div>
        <div className="sheet-body">
          {error ? <div className="error">{t(`errors.${error}`, { defaultValue: t('errors.generic') })}</div> : null}

          {invite && step === 0 ? (
            <div className="callout">
              <h3>{t('survey.joining', { name: invite.name })}</h3>
              <p className="hint">{t('survey.joiningMembers', { count: invite.memberCount })}</p>
            </div>
          ) : null}

          {step === 0 && (
            <>
              <div className="callout">
                <h3>{t('survey.privacyTitle')}</h3>
                <p className="hint">{t('survey.privacyLead')}</p>
                <div className="checklist">
                  <div className="check"><b>1</b><span>{t('survey.privacyCountry')}</span></div>
                  <div className="check"><b>2</b><span>{t('survey.privacyDisease')}</span></div>
                  <div className="check"><b>3</b><span>{t('survey.privacyVariant')}</span></div>
                </div>
                <p className="hint">{t('survey.privacyPrivate')}</p>
                <p className="hint">{t('survey.privacyEmail')}</p>
              </div>
              <label className="consent">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => set({ consent: e.target.checked })}
                />
                <span>{t('survey.consentLabel')}</span>
              </label>
              <label className="consent">
                <input
                  type="checkbox"
                  checked={form.wantsUpdates}
                  onChange={(e) => set({ wantsUpdates: e.target.checked })}
                />
                <span>{t('survey.updatesLabel')}</span>
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <p className="hint">{t('survey.globeIntro')}</p>
              <div className="field">
                <label htmlFor="role">{t('survey.role')}</label>
                <select id="role" value={form.role} onChange={(e) => set({ role: e.target.value })}>
                  <option value="">{t('survey.rolePlaceholder')}</option>
                  {ROLE_KEYS.map((k) => (
                    <option key={k} value={k}>{t(`roles.${k}`)}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="country">{t('survey.country')}<span className="req">{t('survey.required')}</span></label>
                <select
                  id="country"
                  value={form.countryCode}
                  onChange={(e) => set({ countryCode: e.target.value })}
                  required
                >
                  <option value="">{t('survey.countryPlaceholder')}</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {countryName(c.code, locale)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="disease">{t('survey.disease')}<span className="req">{t('survey.required')}</span></label>
                <select
                  id="disease"
                  value={form.rareDiseaseKey}
                  onChange={(e) => set({ rareDiseaseKey: e.target.value })}
                >
                  <option value="">{t('survey.diseasePlaceholder')}</option>
                  {DISEASE_KEYS.map((k) => (
                    <option key={k} value={k}>{t(`diseases.${k}`)}</option>
                  ))}
                </select>
              </div>
              {form.rareDiseaseKey === 'other' && (
                <div className="field">
                  <label htmlFor="diseaseOther">{t('survey.diseaseOther')}<span className="req">{t('survey.required')}</span></label>
                  <input
                    id="diseaseOther"
                    value={form.rareDiseaseCustom}
                    onChange={(e) => set({ rareDiseaseCustom: e.target.value })}
                  />
                </div>
              )}
              <div className="field">
                <label htmlFor="variant">{t('survey.variant')}</label>
                <input
                  id="variant"
                  value={form.variant}
                  onChange={(e) => set({ variant: e.target.value })}
                />
                <p className="hint">{t('survey.variantHint')}</p>
              </div>
              <div className="field">
                <label htmlFor="town">{t('survey.town')}</label>
                <input
                  id="town"
                  value={form.townCity}
                  onChange={(e) => set({ townCity: e.target.value })}
                />
              </div>
              <label className="consent">
                <input
                  type="checkbox"
                  checked={form.townCityPublic}
                  onChange={(e) => set({ townCityPublic: e.target.checked })}
                />
                <span>
                  {t('survey.townToggle')}
                  <br />
                  <span className="hint">{t('survey.townToggleHelp')}</span>
                </span>
              </label>
              <div className="pin-preview">
                <span className="label">{t('survey.pinPreview')}</span>
                <strong>{pinParts.length ? pinParts.join(' · ') : t('survey.pinPreviewEmpty')}</strong>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="hint">{t('survey.privateIntro')}</p>
              <div className="field">
                <label htmlFor="displayName">{t('survey.displayName')}</label>
                <input
                  id="displayName"
                  value={form.displayName}
                  onChange={(e) => set({ displayName: e.target.value })}
                  autoComplete="nickname"
                />
                <p className="hint">{t('survey.displayNameHint')}</p>
              </div>
              <div className="field">
                <label htmlFor="email">{t('survey.email')}<span className="req">{t('survey.required')}</span></label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => set({ email: e.target.value })}
                />
                <p className="hint">{t('survey.emailNever')}</p>
              </div>
              <div className="field">
                <span className="label">{t('survey.features')}</span>
                <p className="hint">{t('survey.featuresHint')} {t('survey.featuresMax')}</p>
                <div className="chips">
                  {FEATURE_KEYS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={`choice ${form.features.includes(k) ? 'on' : ''}`}
                      onClick={() => toggleFeature(k)}
                    >
                      {t(`features.${k}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label htmlFor="featureOther">{t('survey.featureOther')}</label>
                <input
                  id="featureOther"
                  value={form.featureOther}
                  onChange={(e) => set({ featureOther: e.target.value })}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="hint">{t('survey.groupIntro')}</p>
              {invite ? (
                <div className="callout">
                  <h3>{t('survey.joining', { name: invite.name })}</h3>
                  <p className="hint">
                    {t('survey.joiningMembers', { count: invite.memberCount })}
                  </p>
                </div>
              ) : null}
              {inviteError ? (
                <div className="error">{t('survey.invalidInvite')}</div>
              ) : null}
              {[
                ['none', 'survey.groupNone', null],
                ['create_public', 'survey.groupCreatePublic', 'survey.publicNote'],
                ['create_private', 'survey.groupCreatePrivate', 'survey.privateNote'],
                ['join', 'survey.groupJoin', null],
              ].map(([key, label, note]) => {
                const on =
                  (key === 'none' && form.groupAction === 'none') ||
                  (key === 'create_public' && form.groupAction === 'create' && form.groupType === 'public_group') ||
                  (key === 'create_private' && form.groupAction === 'create' && form.groupType === 'private_family') ||
                  (key === 'join' && form.groupAction === 'join');
                return (
                  <button
                    key={key}
                    type="button"
                    className={`radio-card ${on ? 'on' : ''}`}
                    onClick={() => {
                      if (key === 'none') set({ groupAction: 'none' });
                      if (key === 'create_public') set({ groupAction: 'create', groupType: 'public_group' });
                      if (key === 'create_private') set({ groupAction: 'create', groupType: 'private_family' });
                      if (key === 'join') set({ groupAction: 'join' });
                    }}
                  >
                    {t(label)}
                    {note ? <small>{t(note)}</small> : null}
                  </button>
                );
              })}
              {form.groupAction === 'create' && (
                <div className="field">
                  <label htmlFor="groupName">{t('survey.groupName')}<span className="req">{t('survey.required')}</span></label>
                  <input
                    id="groupName"
                    value={form.groupName}
                    onChange={(e) => set({ groupName: e.target.value })}
                    placeholder={t('survey.groupNamePlaceholder')}
                  />
                </div>
              )}
              {form.groupAction === 'join' && !invite && (
                <div className="field">
                  <label htmlFor="inviteCode">{t('survey.inviteCode')}<span className="req">{t('survey.required')}</span></label>
                  <input
                    id="inviteCode"
                    value={form.inviteCode}
                    onChange={(e) => {
                      setInvite(null);
                      set({ inviteCode: e.target.value.toUpperCase() });
                    }}
                    autoCapitalize="characters"
                  />
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div className="callout">
                <h3>{t('survey.reviewTitle')}</h3>
                <p className="hint">{t('survey.reviewLead')}</p>
              </div>
              <div className="pin-preview">
                <span className="label">{t('survey.reviewWillShow')}</span>
                <strong>{pinParts.join(' · ')}</strong>
                {form.townCityPublic && form.townCity ? (
                  <p className="hint">{t('survey.reviewTownPublic')}: {form.townCity}</p>
                ) : null}
              </div>
              <ul className="hint">
                <li>{t('survey.reviewEmail')}</li>
                <li>{form.townCityPublic ? t('survey.reviewTownPublic') : t('survey.reviewTownPrivate')}</li>
                <li>{t('survey.reviewName')}</li>
                <li>{t('survey.reviewFeatures')}</li>
              </ul>
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                {t('survey.reviewEdit')}
              </button>
            </>
          )}
        </div>
        <footer className="sheet-foot">
          {step > 0 ? (
            <button type="button" className="btn" onClick={() => { setError(''); setStep((n) => n - 1); }}>
              {t('survey.back')}
            </button>
          ) : (
            <button type="button" className="btn" onClick={onClose}>
              {t('nav.backToGlobe')}
            </button>
          )}
          {step < STEPS - 1 ? (
            <button type="button" className="btn btn-primary btn-full" onClick={goNext}>
              {t('survey.next')}
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-full" onClick={submit} disabled={busy}>
              {busy ? t('survey.submitting') : t('survey.submit')}
            </button>
          )}
        </footer>
      </section>
    </>
  );
}
