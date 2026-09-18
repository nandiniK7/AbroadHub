import { React, useState } from '../../shared/deps.js';
import { ChevronRight, LogOut, UserPlus, Grid2X2, UserX, Lock, Trash2, Palette, HelpCircle, ShieldCheck, Star, Smartphone, Sun, Moon } from 'lucide-react';
import { api } from '../../api.js';
import { GOOGLE_PLAY_URL } from '../../shared/config.js';

function SettingsPage({
  user,
  setUser,
  logout,
  nav,
  theme,
  setTheme,
  toast
}){

  const [sheet,setSheet]=useState(null); // 'private' | 'delete' | 'theme' | 'help'
  const [deletePassword,setDeletePassword]=useState('');
  const [deleteError,setDeleteError]=useState('');
  const [deleting,setDeleting]=useState(false);
  const [supportMessage,setSupportMessage]=useState('');
  const [supportSent,setSupportSent]=useState(false);
  const [savingPrivacy,setSavingPrivacy]=useState(false);

  const requireUser=fn=>()=>{
    if(!user){ toast?.('Log in to manage this setting.'); return; }
    fn();
  };

  const rows=[
    { label:'Follow Requests', desc:'Manage pending follow requests', onClick:requireUser(()=>nav('followrequests')) },
    { label:'My Listings', desc:'Manage your posted jobs, properties & events', onClick:requireUser(()=>nav('mylistings')) },
    { label:'Collections', desc:'View saved listings and events', onClick:()=>nav('collections') },
    { label:'Blocked', desc:"Manage users you've restricted", onClick:requireUser(()=>nav('blocked')) }
  ];

  const switchPrivacy=async()=>{
    if(!user)return;
    setSavingPrivacy(true);
    try{
      const result=await api.updateProfile({ privateAccount: !user.privateAccount });
      setUser?.(result.user);
      setSheet(null);
      toast?.(result.user.privateAccount?'Your account is now private':'Your account is now public');
    }catch(err){
      toast?.(err.message||'Unable to update privacy');
    }finally{
      setSavingPrivacy(false);
    }
  };

  const deleteAccount=async()=>{
    setDeleteError('');
    if(!deletePassword){ setDeleteError('Enter your password to confirm.'); return; }
    setDeleting(true);
    try{
      await api.deleteAccount(deletePassword);
      setSheet(null);
      logout();
    }catch(err){
      setDeleteError(err.message||'Unable to delete account');
    }finally{
      setDeleting(false);
    }
  };

  const sendSupport=async()=>{
    if(!supportMessage.trim())return;
    try{
      await api.sendSupportRequest(supportMessage.trim());
      setSupportSent(true);
      setSupportMessage('');
    }catch(err){
      toast?.(err.message||'Unable to send your message');
    }
  };

  return (
    <main className="inner-page settings-page">

      <h3>Account</h3>

      {rows.map(r=>(
        <button className="list-row settings-row" key={r.label} onClick={r.onClick}>
          <span className="settings-row-text">
            <b>{r.label}</b>
            <small>{r.desc}</small>
          </span>
          <ChevronRight/>
        </button>
      ))}

      <button className="list-row" onClick={requireUser(()=>setSheet('private'))}>
        <span className="settings-row-text">
          <b>Private Account</b>
        </span>
        <span className={`mini-toggle ${user?.privateAccount?'on':''}`}><span/></span>
      </button>

      <button className="list-row" onClick={requireUser(()=>setSheet('delete'))}>
        <span className="danger-text">Delete Account</span>
        <Trash2 size={17} className="danger-text"/>
      </button>

      <h3>
        App Settings
      </h3>

      <button className="list-row" onClick={()=>setSheet('theme')}>
        <span>Theme</span>
        <span className="settings-value"><Smartphone size={14}/>{theme==='system'?'System':theme==='dark'?'Dark':'Light'}</span>
      </button>

      <h3>
        Support
      </h3>

      <button className="list-row" onClick={()=>{setSheet('help');setSupportSent(false);}}>
        <span>Help & Support</span>
        <ChevronRight/>
      </button>

      <button className="list-row" onClick={()=>toast?.('Privacy Policy page is coming soon.')}>
        <span>Privacy Policy</span>
        <ChevronRight/>
      </button>

      <button className="list-row" onClick={()=>window.open(GOOGLE_PLAY_URL,'_blank','noopener')}>
        <span>Rate Us</span>
        <ChevronRight/>
      </button>

      <button
        className="logout"
        onClick={logout}
      >
        <LogOut/>
        Log out
      </button>

      {sheet==='private'&&
        <div className="backdrop" onClick={()=>setSheet(null)}>
          <div className="confirm-sheet" onClick={e=>e.stopPropagation()}>
            <h2>{user?.privateAccount?'Switch to public Account':'Switch to private Account'}</h2>
            <p>{user?.privateAccount
              ? 'Your account will be public, and only all users can see your content.'
              : 'Your account will be private. Only people you approve can see your content.'}</p>
            <div className="confirm-sheet-actions">
              <button className="outline" onClick={()=>setSheet(null)}>Cancel</button>
              <button className="primary" disabled={savingPrivacy} onClick={switchPrivacy}>{savingPrivacy?'Please wait…':'Switch'}</button>
            </div>
          </div>
        </div>
      }

      {sheet==='delete'&&
        <div className="backdrop" onClick={()=>setSheet(null)}>
          <div className="confirm-sheet" onClick={e=>e.stopPropagation()}>
            <h2 className="danger-text">⚠ Delete Account</h2>
            <p>This action is permanent and cannot be undone. All your data, posts, and connections will be permanently deleted.</p>
            <input
              type="password"
              className="confirm-sheet-input"
              placeholder="Confirm your password"
              value={deletePassword}
              onChange={e=>setDeletePassword(e.target.value)}
            />
            {deleteError&&<div className="error">{deleteError}</div>}
            <div className="confirm-sheet-actions">
              <button className="outline" onClick={()=>setSheet(null)}>Cancel</button>
              <button className="primary danger-button" disabled={deleting} onClick={deleteAccount}>{deleting?'Deleting…':'Delete Account'}</button>
            </div>
          </div>
        </div>
      }

      {sheet==='theme'&&
        <div className="backdrop" onClick={()=>setSheet(null)}>
          <div className="bottom-sheet theme-sheet" onClick={e=>e.stopPropagation()}>
            <div className="sheet-handle"/>
            {[['system','System',Smartphone],['light','Light',Sun],['dark','Dark',Moon]].map(([value,label,Icon])=>(
              <button key={value} className={theme===value?'active':''} onClick={()=>{setTheme(value);setSheet(null);}}>
                <Icon/>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      }

      {sheet==='help'&&
        <div className="backdrop" onClick={()=>setSheet(null)}>
          <div className="bottom-sheet help-sheet" onClick={e=>e.stopPropagation()}>
            <div className="sheet-handle"/>
            <h2>Need Help? We're Here for You!</h2>
            <p>Describe your issue or question, and our support team will get back to you as soon as possible.</p>
            {supportSent ? (
              <div className="profile-save-message">Thanks — your message has been sent.</div>
            ) : (
              <>
                <textarea
                  className="help-textarea"
                  value={supportMessage}
                  onChange={e=>setSupportMessage(e.target.value)}
                  placeholder="Describe your issue or question"
                />
                <button className="primary" onClick={sendSupport} disabled={!supportMessage.trim()}>Send</button>
              </>
            )}
          </div>
        </div>
      }

    </main>
  );
}

export default SettingsPage;
