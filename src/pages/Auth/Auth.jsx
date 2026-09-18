import { React, useState, useEffect, useRef, splashLogo } from '../../shared/deps.js';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, UserPlus, Check } from 'lucide-react';
import { api } from '../../api.js';

function passwordChecks(pw) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw)
  };
}
function passwordStrength(pw, checks) {
  if (!pw) return null;
  const passed = Object.values(checks).filter(Boolean).length;
  if (passed >= 5 && pw.length >= 10) return 'strong';
  if (passed >= 4) return 'medium';
  return 'weak';
}
const REQUIREMENTS = [
  ['length', 'At least 8 characters'],
  ['upper', 'Uppercase letter'],
  ['lower', 'Lowercase letter'],
  ['number', 'Number'],
  ['special', 'Special character']
];

export default function Auth({ mode = 'login', extra = null, onBack, onSuccess, onRequestSignup }) {
  const [view, setView] = useState(mode);
  const [name, setName] = useState(extra?.name || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const tokenRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const resetMessages = () => { setError(''); setNotice(''); };

  const isNewPasswordView = view === 'signup' || view === 'reset';
  const checks = passwordChecks(password);
  const allChecksPass = Object.values(checks).every(Boolean);
  const strength = passwordStrength(password, checks);
  const confirmMismatch = isNewPasswordView && confirmPassword.length > 0 && confirmPassword !== password;

  // Autofocus the first meaningful field whenever the screen changes, so
  // moving between login/signup/forgot/reset feels intentional rather than
  // leaving focus stranded on whatever button was just clicked.
  useEffect(() => {
    const target = view === 'signup' ? nameRef : view === 'reset' ? tokenRef : emailRef;
    target.current?.focus();
  }, [view]);

  const focusNext = ref => e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    ref?.current?.focus();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    resetMessages();

    if (isNewPasswordView) {
      if (!allChecksPass) { setError('Please meet all password requirements.'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    }

    setBusy(true);
    try {
      if (view === 'signup') {
        await api.register({ ...(extra || {}), name, email, password });
        setNotice('Account created successfully. Please log in.');
        setView('login'); setPassword(''); setConfirmPassword(''); setPasswordTouched(false);
      } else if (view === 'login') {
        const result = await api.login({ email, password });
        localStorage.setItem('ah_token', result.token);
        onSuccess(result.user);
      } else if (view === 'forgot') {
        const result = await api.forgotPassword(email);
        if (result.resetToken) {
          setToken(result.resetToken);
          setNotice('Reset token generated for testing. Enter a new password below.');
          setView('reset');
        } else setNotice(result.message);
      } else {
        const result = await api.resetPassword({ token, password });
        setNotice(result.message);
        setPassword(''); setConfirmPassword(''); setPasswordTouched(false); setToken(''); setView('login');
      }
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const title = view === 'signup' ? 'Create your account' : view === 'forgot' ? 'Forgot password?' : view === 'reset' ? 'Create a new password' : 'Welcome back';
  const subtitle = view === 'signup' ? 'Join the AbroadHub community.' : view === 'forgot' ? 'Enter your email and we will prepare a reset flow.' : view === 'reset' ? 'Use the reset token generated for your test account.' : 'Log in to continue to AbroadHub.';

  const submitDisabled = busy || (isNewPasswordView && (!allChecksPass || password !== confirmPassword));

  return (
    <main className="auth-page">
      <div className="auth-card">
        <button className="auth-back" type="button" onClick={onBack} aria-label="Back"><ArrowLeft /></button>
        <div className="auth-brand"><img className="auth-brand-logo" src={splashLogo} alt=""/><strong>AbroadHub</strong></div>
        <h1>{title}</h1><p>{subtitle}</p>
        {view==='signup' && extra?.accountType==='business' &&
          <div className="auth-notice" role="status">Setting up your {extra.category} account{extra.location?` in ${extra.location.split(',')[0]}`:''}.</div>
        }
        <form onSubmit={submit}>
          {view === 'signup' &&
            <label>Name
              <input ref={nameRef} value={name} onChange={e=>setName(e.target.value)} onKeyDown={focusNext(emailRef)} placeholder="Your name" autoComplete="name" required />
            </label>
          }
          {view !== 'reset' &&
            <label>Email
              <input ref={emailRef} type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={focusNext(passwordRef)} placeholder="you@example.com" autoComplete={view === 'login' ? 'username' : 'email'} required />
            </label>
          }
          {view === 'reset' &&
            <label>Reset token
              <input ref={tokenRef} value={token} onChange={e=>setToken(e.target.value)} onKeyDown={focusNext(passwordRef)} placeholder="Paste reset token" autoComplete="one-time-code" required />
            </label>
          }
          {view !== 'forgot' &&
            <label>Password
              <div className="password">
                <input
                  ref={passwordRef}
                  type={show?'text':'password'}
                  value={password}
                  onChange={e=>{ setPassword(e.target.value); setPasswordTouched(true); resetMessages(); }}
                  onKeyDown={isNewPasswordView ? focusNext(confirmRef) : undefined}
                  placeholder="Minimum 8 characters"
                  autoComplete={view==='login'?'current-password':'new-password'}
                  required
                />
                <button type="button" onClick={()=>setShow(v=>!v)} aria-label={show?'Hide password':'Show password'}>{show?<EyeOff/>:<Eye/>}</button>
              </div>
            </label>
          }

          {isNewPasswordView && passwordTouched &&
            <div className="password-requirements">
              <div className="password-requirements-list">
                {REQUIREMENTS.map(([key,label])=>(
                  <span key={key} className={checks[key]?'met':''}>
                    <Check size={13}/>{label}
                  </span>
                ))}
              </div>
              {strength &&
                <div className={`password-strength password-strength-${strength}`}>
                  <div className="password-strength-bar"><span/></div>
                  <small>Password strength: {strength.charAt(0).toUpperCase()+strength.slice(1)}</small>
                </div>
              }
            </div>
          }

          {isNewPasswordView &&
            <label>Confirm Password
              <div className="password">
                <input
                  ref={confirmRef}
                  type={showConfirm?'text':'password'}
                  value={confirmPassword}
                  onChange={e=>{ setConfirmPassword(e.target.value); resetMessages(); }}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                />
                <button type="button" onClick={()=>setShowConfirm(v=>!v)} aria-label={showConfirm?'Hide password':'Show password'}>{showConfirm?<EyeOff/>:<Eye/>}</button>
              </div>
              {confirmMismatch && <span className="password-mismatch">Passwords do not match.</span>}
            </label>
          }

          {error && <div className="error" role="alert">{error}</div>}
          {notice && <div className="auth-notice" role="status">{notice}</div>}
          <button className="primary auth-submit" disabled={submitDisabled} type="submit">{busy?'Please wait…':view==='signup'?'Create account':view==='forgot'?'Send reset':view==='reset'?'Update password':'Log in'}</button>
        </form>
        {view === 'login' && <button className="auth-link" onClick={()=>{resetMessages();setView('forgot')}}><Lock size={15}/> Forgot password?</button>}
        {view === 'login' && <div className="auth-switch">Don't have an account? <button onClick={()=>{resetMessages(); onRequestSignup ? onRequestSignup() : setView('signup');}}><UserPlus size={15}/> Sign up</button></div>}
        {view === 'signup' && <div className="auth-switch">Already have an account? <button onClick={()=>{resetMessages();setView('login')}}>Log in</button></div>}
        {(view === 'forgot' || view === 'reset') && <button className="auth-link" onClick={()=>{resetMessages();setView('login')}}>Back to login</button>}
      </div>
    </main>
  );
}
