import { React, useEffect, useState } from '../../shared/deps.js';
import { ChevronLeft, MoreVertical, Globe, MessageCircle, Heart } from 'lucide-react';
import Avatar from '../../components/Avatar/Avatar.jsx';
import ShareSheet from '../../components/ShareSheet/ShareSheet.jsx';
import { api } from '../../api.js';

function ProviderProfile({ username, posts=[], onBack, nav, requireAuth, toast, openConversation }){
  const [profile,setProfile]=useState(null);
  const [error,setError]=useState('');
  const [menuOpen,setMenuOpen]=useState(false);
  const [shareOpen,setShareOpen]=useState(false);
  const [confirmSheet,setConfirmSheet]=useState(null); // 'report' | 'block' | null
  const [busy,setBusy]=useState(false);
  const [tab,setTab]=useState('Posts');

  const load=()=>{
    api.publicProfile(username).then(r=>setProfile(r.user)).catch(err=>setError(err.message||'User not found'));
  };

  useEffect(()=>{ setProfile(null); setError(''); setTab('Posts'); load(); },[username]);

  const toggleFollow=async()=>{
    if(!requireAuth())return;
    setBusy(true);
    try{ const r=await api.toggleFollow(username); setProfile(r.user); }
    catch(err){ toast?.(err.message||'Unable to update follow status'); }
    finally{ setBusy(false); }
  };

  const message=async()=>{
    if(!requireAuth())return;
    try{
      const r=await api.startConversation(username);
      openConversation?.(r.conversationId,r.user);
    }
    catch(err){ toast?.(err.message||'Unable to open conversation'); }
  };

  const confirmBlock=async()=>{
    if(!requireAuth())return;
    try{
      const r=await api.toggleBlock(username);
      setProfile(r.user);
      toast?.(r.user.isBlocked?'User blocked':'User unblocked');
    }catch(err){
      toast?.(err.message||'Unable to update block status');
    }
    setConfirmSheet(null);
    setMenuOpen(false);
  };

  const confirmReport=async()=>{
    if(!requireAuth())return;
    try{
      const r=await api.reportUser(username);
      toast?.(r.message||'Thanks — we received your report.');
    }catch(err){
      toast?.(err.message||'Unable to report user');
    }
    setConfirmSheet(null);
    setMenuOpen(false);
  };

  const copyLink=async()=>{
    try{ await navigator.clipboard.writeText(`${window.location.origin}/u/${username}`); toast?.('Link copied'); }
    catch{ toast?.('Unable to copy link'); }
    setMenuOpen(false);
  };

  if(error){
    return (
      <main className="inner-page">
        <div className="inner-header">
          <button onClick={onBack} aria-label="Back"><ChevronLeft/></button>
        </div>
        <div className="empty-profile">{error}</div>
      </main>
    );
  }

  if(!profile){
    return (
      <main className="inner-page">
        <div className="inner-header">
          <button onClick={onBack} aria-label="Back"><ChevronLeft/></button>
        </div>
        <div className="empty-profile">Loading profile…</div>
      </main>
    );
  }

  const userPosts=posts.filter(p=>p.username===profile.username);
  const userPhotos=userPosts.filter(p=>p.image);

  return (
    <main className="inner-page provider-profile-page">
      <div className="inner-header">
        <button onClick={onBack} aria-label="Back"><ChevronLeft/></button>
        <b className="provider-profile-username">{profile.username}</b>
        <button className="push-right" onClick={()=>setMenuOpen(true)} aria-label="Menu"><MoreVertical/></button>
      </div>

      <div className="profile-reference-info">
        <Avatar src={profile.avatar} text={profile.name}/>
        <div className="profile-reference-name">
          <h2>{profile.name}</h2>
          {profile.languages&&<p className="profile-reference-languages"><Globe/>{profile.languages}</p>}
        </div>
      </div>

      {profile.bio&&<p className="profile-reference-bio">{profile.bio}</p>}

      <div className="profile-reference-stats">
        <span><b>{profile.followers}</b> Followers</span>
        <span><b>{profile.following}</b> Following</span>
      </div>

      {!profile.isMe&&
        <div className="profile-reference-actions">
          <button onClick={toggleFollow} disabled={busy} className={profile.isFollowing?'following':''}>
            {profile.isFollowing?'Following':'Follow'}
          </button>
          <button onClick={message}><MessageCircle size={16}/>Message</button>
        </div>
      }

      <div className="provider-profile-tabs">
        <button className={tab==='Posts'?'active':''} onClick={()=>setTab('Posts')}>Posts</button>
        <button className={tab==='Photos'?'active':''} onClick={()=>setTab('Photos')}>Photos</button>
      </div>

      <div className="provider-profile-posts">
        {tab==='Posts'&&(
          userPosts.length===0 ? (
            <div className="empty-profile">No posts yet</div>
          ) : userPosts.map(p=>(
            <article className="profile-feed-post" key={p.id}>
              <div className="profile-feed-head">
                <Avatar src={profile.avatar} text={p.name}/>
                <div>
                  <b>{p.name}</b>
                  <span>{p.handle}</span>
                </div>
              </div>
              {p.text&&<p>{p.text}</p>}
              {p.image&&<img src={p.image} alt=""/>}
              {p.video&&<video src={p.video} controls playsInline/>}
              <div className="profile-feed-actions">
                <Heart/> <span>{p.likes||0}</span>
              </div>
            </article>
          ))
        )}

        {tab==='Photos'&&(
          userPhotos.length===0 ? (
            <div className="empty-profile">No photos yet</div>
          ) : (
            <div className="explore-masonry">
              {userPhotos.map(p=>(
                <div className="explore-card" key={p.id} style={{cursor:'default'}}>
                  <img src={p.image} alt=""/>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {menuOpen&&
        <div className="backdrop" onClick={()=>setMenuOpen(false)}>
          <div className="context-menu" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setMenuOpen(false)}>View Profile</button>
            <button onClick={copyLink}>Copy link</button>
            <button onClick={()=>{setMenuOpen(false);setShareOpen(true);}}>Share to</button>
            {!profile.isMe&&<button className="danger" onClick={()=>setConfirmSheet('report')}>Report User</button>}
            {!profile.isMe&&<button className="danger" onClick={()=>setConfirmSheet('block')}>{profile.isBlocked?'Unblock':'Block'}</button>}
          </div>
        </div>
      }

      {confirmSheet&&
        <div className="backdrop" onClick={()=>setConfirmSheet(null)}>
          <div className="confirm-sheet" onClick={e=>e.stopPropagation()}>
            {confirmSheet==='report' ? (
              <>
                <h2 className="danger-text">Report {profile.name}?</h2>
                <p>This lets our team know something about this account needs review. This won't notify {profile.name}.</p>
                <div className="confirm-sheet-actions">
                  <button className="outline" onClick={()=>setConfirmSheet(null)}>Cancel</button>
                  <button className="primary danger-button" onClick={confirmReport}>Report</button>
                </div>
              </>
            ) : (
              <>
                <h2 className="danger-text">{profile.isBlocked?'Unblock':'Block'} {profile.name}?</h2>
                <p>{profile.isBlocked
                  ? `${profile.name} will be able to see your profile and message you again.`
                  : `${profile.name} won't be able to message you or see your profile.`}</p>
                <div className="confirm-sheet-actions">
                  <button className="outline" onClick={()=>setConfirmSheet(null)}>Cancel</button>
                  <button className="primary danger-button" onClick={confirmBlock}>{profile.isBlocked?'Unblock':'Block'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      }

      {shareOpen&&
        <ShareSheet
          title={`${profile.name} on AbroadHub`}
          url={`${window.location.origin}/u/${username}`}
          close={()=>setShareOpen(false)}
          onSent={(conversationId,convoUser)=>openConversation?.(conversationId,convoUser)}
          requireAuth={requireAuth}
        />
      }
    </main>
  );
}

export default ProviderProfile;
