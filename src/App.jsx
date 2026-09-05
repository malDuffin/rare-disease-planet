import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import GlobeView from './components/GlobeView.jsx';
import LanguageSwitcher from './components/LanguageSwitcher.jsx';
import Survey from './components/Survey.jsx';
import ThankYou from './components/ThankYou.jsx';
import GroupDirectory from './components/GroupDirectory.jsx';
import PinCard from './components/PinCard.jsx';
import { api } from './api.js';

function readInviteFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get('g') || '';
  } catch {
    return '';
  }
}

export default function App() {
  const { t } = useTranslation();
  const [pins, setPins] = useState([]);
  const [groups, setGroups] = useState([]);
  const [view, setView] = useState('home');
  const [inviteCode, setInviteCode] = useState(() => readInviteFromUrl());
  const [selected, setSelected] = useState(null);
  const [thanks, setThanks] = useState(null);
  const [highlightId, setHighlightId] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [g, gr] = await Promise.all([api.globe(), api.groups()]);
      setPins(g.pins || []);
      setGroups(gr.groups || []);
    } catch {
      /* globe stays as last known */
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (inviteCode) setView('survey');
  }, [inviteCode]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setView('home');
        setSelected(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openSurvey = (code = '') => {
    setInviteCode(code);
    setSelected(null);
    setView('survey');
    if (code) {
      const url = new URL(window.location.href);
      url.searchParams.set('g', code);
      window.history.replaceState({}, '', url);
    }
  };

  const closeOverlays = () => {
    setView('home');
    const url = new URL(window.location.href);
    url.searchParams.delete('g');
    window.history.replaceState({}, '', url);
  };

  const onSubmitted = (result) => {
    setThanks(result);
    setView('thanks');
    setHighlightId(result.pin?.id || null);
    refresh();
    sessionStorage.setItem('rdp-family-token', result.familyToken || '');
  };

  const onFamilyAdded = (data) => {
    setThanks((prev) => ({
      ...prev,
      pin: data.pin,
      group: data.group || prev?.group,
    }));
    setHighlightId(data.pin?.id || null);
    refresh();
  };

  const lights = pins.length;
  const overlayOpen = view !== 'home';

  const title = useMemo(() => 'Rare Disease Planet', []);

  return (
    <div className="app">
      <GlobeView
        pins={pins}
        highlightId={highlightId}
        paused={overlayOpen}
        onPinClick={(pin) => {
          setSelected(pin);
          setHighlightId(pin.id);
        }}
      />

      <header className="topbar">
        <button type="button" className="brand" onClick={closeOverlays} aria-label={title}>
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-text">
            <span className="brand-name">Rare Disease Planet</span>
            <span className="brand-tag">{t('app.tagline')}</span>
          </span>
        </button>
        <div className="top-actions">
          <button type="button" className="chip" onClick={() => { setSelected(null); setView('groups'); }}>
            {t('nav.groups')}
          </button>
          <LanguageSwitcher />
        </div>
      </header>

      {view === 'home' && (
        <div className="dock">
          <div className="dock-row">
            <div className="hero-copy">
              <h1>{lights ? t('home.lights', { count: lights }) : t('home.emptyTitle')}</h1>
              <p>{lights ? t('app.footer') : t('home.emptyBody')}</p>
            </div>
            <div className="cta-stack">
              <button type="button" className="btn btn-primary" onClick={() => openSurvey('')}>
                {t('home.cta')}
              </button>
              <button type="button" className="btn" onClick={() => setView('groups')}>
                {t('home.browseGroups')}
              </button>
              <p className="meta-line">{t('home.hintRotate')}</p>
            </div>
          </div>
        </div>
      )}

      {selected && view === 'home' ? (
        <PinCard pin={selected} onClose={() => setSelected(null)} />
      ) : null}

      {view === 'survey' ? (
        <Survey
          inviteCode={inviteCode}
          onClose={closeOverlays}
          onSubmitted={onSubmitted}
        />
      ) : null}

      {view === 'thanks' && thanks ? (
        <ThankYou
          result={thanks}
          onClose={() => {
            setView('home');
          }}
          onAdded={onFamilyAdded}
        />
      ) : null}

      {view === 'groups' ? (
        <GroupDirectory
          groups={groups}
          onClose={() => setView('home')}
          onJoin={(code) => openSurvey(code)}
        />
      ) : null}
    </div>
  );
}
