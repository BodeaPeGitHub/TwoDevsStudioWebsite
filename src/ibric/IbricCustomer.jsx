'use client';
import { useEffect, useState } from 'react';
import { api, post, CardPreview, Icon } from './shared';
import './ibric.css';

export default function IbricCustomer({ apiBase = '/api/ibric', assets = '/ibric/assets' }) {
  const [config, setConfig] = useState(null);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saveUrl, setSaveUrl] = useState('');

  useEffect(() => {
    document.title = 'IBRIC · Cardul tău de fidelitate';
    let active = true;
    Promise.all([api(apiBase, 'config'), api(apiBase, 'me')])
      .then(([program, data]) => {
        if (!active) return;
        setConfig(program);
        setMember(data.member);
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [apiBase]);

  async function addCard() {
    if (busy) return;
    if (saveUrl) {
      window.location.assign(saveUrl);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await api(apiBase, 'enroll', post({}));
      const url = new URL(data.saveUrl);
      if (url.origin !== 'https://pay.google.com') {
        throw new Error('Linkul Google Wallet nu este disponibil.');
      }
      setMember(data.member);
      setSaveUrl(url.href);
      window.location.assign(url.href);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  const threshold = member?.threshold ?? config?.threshold ?? 9;
  const unavailable = !loading && config && !config.walletReady;

  return (
    <main className="ibric-app ibric-enrollment">
      <section className="ibric-enrollment-content" aria-labelledby="ibric-card-title">
        <img
          className="ibric-brand-logo"
          src={`${assets}/ibric-logo.png`}
          width="180"
          height="100"
          alt="IBRIC"
        />
        <h1 id="ibric-card-title">Cardul tău de fidelitate.</h1>
        <div className="ibric-enrollment-preview">
          <CardPreview
            coffees={member?.coffees ?? 0}
            threshold={threshold}
            assets={assets}
            assetBase={threshold !== 9 ? config?.assetBase : undefined}
            name={member?.firstName}
          />
        </div>
        <button
          className="ibric-button ibric-enrollment-button"
          onClick={addCard}
          disabled={loading || busy || unavailable}
          aria-busy={busy}
        >
          {busy ? 'Pregătim cardul…' : 'Vreau cardul meu'}
          <Icon name="arrow" size={20} />
        </button>
        <p className="ibric-enrollment-wallet">Adaugă în Portofel Google</p>
        {unavailable && <p className="ibric-error" role="status">Salvarea cardurilor nu este disponibilă momentan.</p>}
        {error && <p className="ibric-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
