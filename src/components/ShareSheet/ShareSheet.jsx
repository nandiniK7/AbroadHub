import { React, useState } from '../../shared/deps.js';
import { Link2, Share2, MessageCircle, ChevronLeft } from 'lucide-react';
import Avatar from '../Avatar/Avatar.jsx';
import { api } from '../../api.js';

const DIRECTORY = [
  { n: 'Emma', u: 'emma' },
  { n: 'prof test', u: 'prof_test' },
  { n: 'Lily', u: 'lily' },
  { n: 'sham_cyprus', u: 'sham_cyprus' },
  { n: "Airbnb's", u: 'airbnbs' }
];

// Reusable share sheet used by jobs, events, posts and profiles.
// - Copy Link: clipboard
// - Share To: native Web Share API, falls back to copy-link
// - Send in Message: picks a contact, creates/reuses a conversation and
//   sends the link as a real backend-persisted message
function ShareSheet({ title, url, close, onSent, requireAuth }) {
  const [step, setStep] = useState('menu');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const shareText = `${title}\n${url}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setNotice('Link copied');
    } catch {
      setNotice('Could not copy link');
    }
    setTimeout(close, 700);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, url }); close(); }
      catch { /* user dismissed the native sheet */ }
    } else {
      copyLink();
    }
  };

  const sendTo = async person => {
    if (!requireAuth()) return;
    setBusy(true);
    try {
      const { conversationId, user } = await api.startConversation(person.u);
      await api.sendMessage(conversationId, shareText);
      close();
      onSent?.(conversationId, user);
    } catch (err) {
      setNotice(err.message || 'Unable to send');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="backdrop" onClick={close}>
      <div className="share-sheet-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"/>
        {step === 'menu' ? (
          <>
            <button onClick={copyLink}><Link2 size={18}/> Copy link</button>
            <button onClick={nativeShare}><Share2 size={18}/> Share to</button>
            <button onClick={() => { if (requireAuth()) setStep('people'); }}><MessageCircle size={18}/> Send in message</button>
          </>
        ) : (
          <>
            <button className="share-sheet-back" onClick={() => setStep('menu')}><ChevronLeft size={18}/> Send to</button>
            {DIRECTORY.map(p => (
              <button key={p.u} className="share-sheet-person" onClick={() => sendTo(p)} disabled={busy}>
                <Avatar text={p.n}/>
                <span>{p.n}</span>
              </button>
            ))}
          </>
        )}
        {notice && <div className="share-sheet-notice">{notice}</div>}
      </div>
    </div>
  );
}

export default ShareSheet;
