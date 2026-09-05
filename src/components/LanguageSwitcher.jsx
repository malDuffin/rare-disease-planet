import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGS } from '../catalog.js';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const active = LANGS.find((l) => l.code === current) || LANGS[0];

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, []);

  return (
    <div className="lang" ref={ref}>
      <button
        type="button"
        className="chip lang-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('nav.language')}
        onClick={() => setOpen((v) => !v)}
      >
        {active.native}
      </button>
      {open && (
        <div className="lang-menu" role="listbox">
          {LANGS.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-current={lang.code === active.code}
              onClick={() => {
                i18n.changeLanguage(lang.code);
                setOpen(false);
              }}
            >
              {lang.native}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
