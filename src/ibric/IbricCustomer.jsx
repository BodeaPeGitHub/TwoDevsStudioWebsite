import { useProgram } from './program';
'use client';
import { useEffect, useState } from 'react';
import { api, post, CardPreview, Icon } from './shared';
import { CustomerPush } from './PushNotifications';
import './ibric.css';

// Share in-flight work across React's mount cycle. Web Locks also serialize the
// first membership request across tabs, so the next tab sees the saved cookie.
const preparations = new Map();
function prepareCard(base) {
  if (!preparations.has(base)) {
    const request = () => api(base, 'prepare', post({}));
    const pending = (navigator.locks ? navigator.locks.request(`${base}-card-preparation`, request) : request())
      .finally(() => preparations.delete(base));
    preparations.set(base, pending);
  }
  return preparations.get(base);
}

export default function IbricCustomer({ apiBase = '/api/ibric', assets = '/ibric/assets' }) {
  const { slug, brand, threshold: defaultThreshold } = useProgram();
  const [config, setConfig] = useState(null);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saveUrl, setSaveUrl] = useState('');
  const [pushBusy, setPushBusy] = useState(false);

  function receiveCard(data) {
    if (data.saveUrl && new URL(data.saveUrl).origin !== 'https://pay.google.com') {
      throw new Error('Linkul Google Wallet nu este disponibil.');
    }
    setConfig(data.config);
    setMember(data.member);
    setSaveUrl(data.saveUrl || '');
    setError(data.warning || '');
  }

  useEffect(() => {
    document.title = `${brand} · Cardul tău de fidelitate`;
    let active = true;
    prepareCard(apiBase)
      .then(data => { if (active) receiveCard(data); })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [apiBase, brand]);

  async function addCard() {
    if (busy || pushBusy) return;
    if (saveUrl) {
      window.location.assign(saveUrl);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await prepareCard(apiBase);
      receiveCard(data);
      if (data.saveUrl) window.location.assign(data.saveUrl);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  const threshold = member?.threshold ?? config?.threshold ?? defaultThreshold;
  const unavailable = !loading && config && !config.walletReady;

  return (
    <main className={`ibric-app ibric-enrollment ${slug}-app`}>
      <section className="ibric-enrollment-content" aria-labelledby="ibric-card-title">
        <img
          className="ibric-brand-logo"
          src={`${assets}/${slug}-logo.png`}
          width="180"
          height="100"
          alt={brand}
        />
        <h1 id="ibric-card-title">Cardul tău de fidelitate.</h1>
        <div className="ibric-enrollment-preview">
          <CardPreview
            coffees={member?.coffees ?? 0}
            threshold={threshold}
            assets={assets}
            assetBase={slug === 'cuc' ? config?.assetBase || '/cuc/wallet/v5' : threshold !== 9 ? config?.assetBase : undefined}
            name={member?.firstName}
          />
        </div>
        {slug === 'cuc' && <p className="cuc-rule">Cumpără {threshold} cafele. A {threshold + 1}-a e din partea noastră.<br />Arată QR-ul baristei la fiecare comandă.</p>}
        {(slug === 'cuc' || (member && config?.pushReady)) && <CustomerPush compact apiBase={apiBase} publicKey={config?.pushPublicKey} available={!!member && !!config?.pushReady} preparing={loading} onBusyChange={setPushBusy} />}
        <button
          className="ibric-button ibric-enrollment-button"
          onClick={addCard}
          disabled={loading || busy || pushBusy || unavailable}
          aria-busy={loading || busy || pushBusy}
        >
          {loading || busy ? 'Pregătim cardul…' : pushBusy ? 'Actualizăm preferința…' : 'Vreau cardul meu'}
          <Icon name="arrow" size={20} />
        </button>
        <p className="ibric-enrollment-wallet">Adaugă în Portofel Google</p>
        {slug === 'cuc' && <p className="cuc-place"><a href="https://www.instagram.com/cuc.space/" target="_blank" rel="noreferrer">@cuc.space</a> · Napoca 5, Cluj-Napoca</p>}
        {unavailable && <p className="ibric-error" role="status">Salvarea cardurilor nu este disponibilă momentan.</p>}
        {error && <p className="ibric-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
