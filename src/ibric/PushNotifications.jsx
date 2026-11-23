import { useProgram } from './program';
import { useEffect, useState } from 'react';
import { api, post, Icon } from './shared';

export const supportsPush = () => typeof window !== 'undefined' && window.isSecureContext &&
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function applicationKey(value) {
  const bytes = atob(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '='));
  return Uint8Array.from(bytes, c => c.charCodeAt(0));
}

export function CustomerPush({ apiBase, publicKey, compact = false, available = true, preparing = false, onBusyChange }) {
  const { slug, brand } = useProgram();
  const [registration, setRegistration] = useState(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [retry, setRetry] = useState(0);
  const supported = supportsPush();
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);

  useEffect(() => {
    if (!supported || !available) return;
    let stopped = false;
    const prepare = async () => {
      try {
        await navigator.serviceWorker.register(`/${slug}/push-sw.js`, { scope: `/${slug}` });
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.getSubscription();
        if (stopped) return;
        setRegistration(reg);
        setBlocked(Notification.permission === 'denied');
        if (subscription) {
          if (Notification.permission === 'denied') {
            await api(apiBase, 'push/unsubscribe', post({ endpoint: subscription.endpoint }));
          } else {
            const status = await api(apiBase, 'push/status', post({ endpoint: subscription.endpoint }));
            if (!stopped) setSubscribed(status.subscribed);
          }
        }
      } catch (e) { if (!stopped) setError(e.message); }
    };
    prepare();
    return () => { stopped = true; };
  }, [apiBase, supported, available, slug, retry]);

  const enable = async () => {
    if (busy || !registration || !available || !publicKey) return;
    setBusy(true); setError(''); setNotice('');
    try {
      // Ask immediately within the button gesture, before any async network work.
      const permission = await Notification.requestPermission();
      setBlocked(permission === 'denied');
      if (permission !== 'granted') {
        setNotice(permission === 'denied' ? 'Notificările sunt blocate în setările browserului.' : 'Poți activa notificările oricând.');
        return;
      }
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const existing = subscription.options.applicationServerKey;
        const wanted = applicationKey(publicKey);
        if (existing && (existing.byteLength !== wanted.length || new Uint8Array(existing).some((v, i) => v !== wanted[i]))) {
          await api(apiBase, 'push/unsubscribe', post({ endpoint: subscription.endpoint }));
          if (!await subscription.unsubscribe()) throw new Error('Reîncearcă activarea notificărilor.');
          subscription = null;
        }
      }
      subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationKey(publicKey) });
      await api(apiBase, 'push/subscribe', post({ subscription: subscription.toJSON(), applicationServerKey: publicKey, consent: `${slug}-offers-v1` }));
      setSubscribed(true);
      setNotice(`Notificările ${brand} sunt activate în acest browser.`);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const disable = async () => {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Stop server delivery first, even if browser unsubscription fails.
        await api(apiBase, 'push/unsubscribe', post({ endpoint: subscription.endpoint }));
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setNotice(`Nu vei mai primi notificări ${brand} în acest browser.`);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const preview = async () => {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) { setSubscribed(false); throw new Error('Reactivează notificările în acest browser.'); }
      await api(apiBase, 'push/preview', post({ endpoint: subscription.endpoint }));
      setNotice('Previzualizarea a fost acceptată de serviciul push. Verifică notificările telefonului.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  if (compact) {
    if (!supported && slug !== 'cuc') return null;
    return <div className="ibric-push-checkbox">
      <label><input type="checkbox" checked={subscribed} disabled={busy || blocked || !supported || !available || !registration}
        onChange={event => event.target.checked ? enable() : disable()} aria-describedby="ibric-push-description" />
        <span>Vreau oferte și noutăți {brand}</span></label>
      <p id="ibric-push-description">Opțional, prin notificări în browser. Poți dezactiva oricând.</p>
      {!supported && <p>Notificările nu sunt disponibile în acest browser. Deschide pagina într-un browser compatibil pentru a le activa.</p>}
      {supported && !available && <p role="status">{preparing ? 'Pregătim opțiunea de notificări…' : 'Notificările nu sunt disponibile momentan. Reîncarcă pagina pentru a reîncerca.'}</p>}
      {busy && <p role="status">Actualizăm preferința…</p>}
      {blocked && <p>Notificările sunt blocate. Le poți permite din setările browserului.</p>}
      {error && <><p className="ibric-error" role="alert">{error}</p>
        <button className="ibric-text-link" disabled={busy} onClick={() => { setError(''); setRetry(v => v + 1); }}>Reîncearcă</button></>}
      {notice && <p role="status">{notice}</p>}
      {subscribed && <details><summary>Opțiuni notificări</summary>
        <button className="ibric-text-link" disabled={busy} onClick={preview}>Trimite o previzualizare</button></details>}
    </div>;
  }
  return <section className="ibric-push-optin" aria-labelledby="ibric-push-title">
    <Icon name="bell" size={24} />
    <h2 id="ibric-push-title">O veste bună, lângă cafeaua ta.</h2>
    <p>Primește oferte și noutăți {brand} prin browser, inclusiv când pagina este închisă. Este opțional și te poți dezabona oricând.</p>
    {!supported ? <p className="ibric-help">Notificările nu sunt disponibile în acest browser. Pe Android, deschide pagina în Chrome, în afara aplicației care a scanat QR-ul.</p>
      : <>
        {blocked && <p className="ibric-help">Permite notificările pentru acest site din setările browserului, apoi reîncarcă pagina.</p>}
        {subscribed ? <div className="ibric-push-actions"><span className="ibric-pill">Notificări activate</span>
          <button className="ibric-button secondary" disabled={busy} onClick={preview}>Trimite o previzualizare</button>
          <button className="ibric-text-link" disabled={busy} onClick={disable}>Dezactivează notificările</button></div>
          : <button className="ibric-button secondary" disabled={busy || blocked || !supported || !available || !registration} onClick={enable}>
            {busy ? 'Se activează…' : registration ? 'Activează notificările' : 'Pregătim notificările…'}</button>}
        {error && <><p className="ibric-error" role="alert">{error}</p><button className="ibric-text-link" disabled={busy} onClick={() => { setError(''); setRetry(v => v + 1); }}>Reîncearcă</button></>}
        {notice && <p className="ibric-help" role="status">{notice}</p>}
      </>}
  </section>;
}

export function StaffPush({ apiBase, member }) {
  const { slug, brand } = useProgram();
  const [data, setData] = useState(null);
  const [header, setHeader] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all');
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let stopped = false, timer;
    const load = async () => {
      try {
        const response = await api(apiBase, 'admin/push');
        if (!stopped) { setData(response); timer = setTimeout(load, 15000); }
      } catch (e) { if (!stopped) setError(e.message); }
    };
    load();
    return () => { stopped = true; clearTimeout(timer); };
  }, [apiBase, reload]);

  const review = e => {
    e.preventDefault(); setError(''); setNotice('');
    const payload = { header: header.trim(), body: body.trim(), memberId: audience === 'member' ? member?.id : null };
    if (audience === 'member' && !payload.memberId) { setError('Selectează mai întâi un client.'); return; }
    const fingerprint = JSON.stringify(payload);
    let previous;
    try { previous = JSON.parse(sessionStorage.getItem(`${slug}.pendingPush`) || 'null'); } catch { /* Storage may be unavailable. */ }
    const requestId = previous?.fingerprint === fingerprint ? previous.requestId : crypto.randomUUID();
    setConfirmation({ ...payload, fingerprint, requestId, name: audience === 'member' ? member.name : null });
  };

  const send = async () => {
    if (busy || !confirmation) return;
    setBusy(true); setError('');
    try {
      try { sessionStorage.setItem(`${slug}.pendingPush`, JSON.stringify(confirmation)); } catch { /* The button remains locked during the request. */ }
      const response = await api(apiBase, 'admin/push/send', { ...post(confirmation), signal: AbortSignal.timeout(90000) });
      setData(response);
      try { sessionStorage.removeItem(`${slug}.pendingPush`); } catch { /* Optional storage. */ }
      setConfirmation(null); setHeader(''); setBody('');
      setNotice(response.warning || 'Notificarea a fost salvată. Trimiterea continuă automat către browserele abonate.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return <section className="ibric-panel ibric-web-push-panel">
    <span className="ibric-eyebrow">NOTIFICĂRI PRIN BROWSER</span>
    <div className="ibric-panel-title"><h2><Icon name="bell" /> Notificări web</h2>
      <button className="ibric-text-link" disabled={busy} onClick={() => { setError(''); setReload(v => v + 1); }}>Reîncarcă</button></div>
    <p>Trimite un titlu și un mesaj pe telefon, prin browser. Doar clienții care au activat separat notificările pe pagina {brand} pot primi aceste mesaje.</p>
    <p className="ibric-help">{data ? `${data.subscribers} browsere abonate` : 'Se încarcă abonamentele…'}. Acceptarea de către serviciul push nu confirmă afișarea sau citirea pe telefon.</p>
    {data && !data.ready && <p className="ibric-error">Trimiterea notificărilor web nu este configurată momentan.</p>}
    {error && <p className="ibric-error" role="alert">{error}</p>}
    {notice && <p className="ibric-alert" role="status">{notice}</p>}
    {confirmation ? <div className="ibric-push-confirm">
      <h3>Confirmă notificarea</h3>
      <p>{confirmation.memberId ? `Către browserele abonate ale clientului ${confirmation.name}.` : `Către toate browserele abonate la notificările ${brand}.`}</p>
      <div className="ibric-message-preview"><strong>{confirmation.header}</strong><p>{confirmation.body}</p></div>
      <div className="ibric-push-actions"><button className="ibric-button" disabled={busy} onClick={send}>{busy ? 'Se trimite…' : 'Trimite notificarea web'}</button>
        <button className="ibric-button secondary" disabled={busy} onClick={() => setConfirmation(null)}>Înapoi</button></div>
    </div> : <form onSubmit={review}>
      <label>Destinatari<select value={audience} onChange={e => setAudience(e.target.value)}>
        <option value="all">Toate browserele abonate</option>
        <option value="member" disabled={!member}>{member ? `Clientul selectat: ${member.name}` : 'Selectează un client pentru mesaj individual'}</option>
      </select></label>
      <label>Titlu<input required maxLength={60} value={header} onChange={e => setHeader(e.target.value)} placeholder="O cafea bună te așteaptă" /></label>
      <label>Mesaj<textarea required maxLength={1000} rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder={`Scrie oferta sau noutatea ${brand}…`} /></label>
      <button className="ibric-button" disabled={busy || !data?.ready || !data?.subscribers || !header.trim() || !body.trim()}>Revizuiește notificarea <Icon name="arrow" /></button>
    </form>}
    <div className="ibric-history">
      {data?.campaigns.map(c => <article key={c.id}><span className={`ibric-history-dot ${c.pending ? '' : 'done'}`} /><div>
        <strong>{c.header}</strong><p>{c.body}</p><small>{new Date(c.createdAt).toLocaleString('ro-RO')} · {c.memberId ? 'Client individual' : 'Toți abonații'}</small>
        <p className="ibric-help">{c.accepted} acceptate de serviciul push · {c.pending} în așteptare · {c.failed} eșuate · {c.skipped} omise / expirate</p>
      </div></article>)}
    </div>
  </section>;
}
