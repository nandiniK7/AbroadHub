import Avatar from '../../components/Avatar/Avatar.jsx';
import { React, useEffect, useMemo, useRef, useState, Plus, Bell, MessageCircle, MoreVertical, Heart, Search, BriefcaseBusiness, MapPin, UserCircle, Compass, HomeIcon, ChevronLeft, Edit3, Camera, ImageIcon, CalendarDays, Building2, X, Send, Bookmark, Share2, Users, Settings, LogOut, ChevronRight, Check, Trash2, Menu, Globe, Phone, Mail, Lock, Eye, EyeOff, Upload, SlidersHorizontal, ArrowLeft, UserPlus, MapPinned, LocateFixed, Sparkles, Sprout, ShoppingBag, ShoppingCart, HeartPulse, ShieldCheck, Scale, Flag, Utensils, Grid2X2, CORAL, festival, wordmark, splashLogo, categories, providers, seedJobs, seedPosts, seedNotifs, seedChats, seedPeople, load, save } from '../../shared/deps.js';
import { api } from '../../api.js';

const EMPTY_MESSAGE = 'Say hello and start a conversation! 😊';

function timeAgo(iso){
  const diff=Date.now()-new Date(iso).getTime();
  const mins=Math.floor(diff/60000);
  if(mins<1)return 'now';
  if(mins<60)return `${mins}m ago`;
  const hrs=Math.floor(mins/60);
  if(hrs<24)return `${hrs}h ago`;
  return `${Math.floor(hrs/24)}d ago`;
}

function Inbox({
  user,
  onBack,
  toast,
  openProfile,
  // Set by App.jsx when arriving from "Message" on a job/profile/share —
  // { conversationId, user } so the chat opens immediately instead of
  // landing on the bare conversation list.
  target,
  onTargetConsumed
}){

  const [conversations,setConversations]=useState([]);
  const [loading,setLoading]=useState(true);
  const [selId,setSelId]=useState(null);
  // Holds the other participant even before the conversation shows up in
  // the list (avoids a race where the newly created conversation hasn't
  // been re-fetched yet but the user is already meant to be looking at it).
  const [selUser,setSelUser]=useState(null);
  const [msgs,setMsgs]=useState([]);
  const [msgsLoading,setMsgsLoading]=useState(false);
  const [draft,setDraft]=useState('');
  const [composing,setComposing]=useState(false);
  const [sendError,setSendError]=useState('');
  const messagesEndRef=useRef(null);

  const loadConversations=()=>{
    return api.conversations().then(r=>{
      setConversations(r.conversations||[]);
      setLoading(false);
      return r.conversations||[];
    }).catch(()=>{ setLoading(false); return []; });
  };

  useEffect(()=>{ loadConversations(); },[]);

  const openConversation=(id,otherUser)=>{
    setSelId(id);
    setSelUser(otherUser||conversations.find(c=>c.id===id)?.user||null);
    setComposing(false);
    setSendError('');
    setMsgsLoading(true);
    api.messages(id).then(r=>setMsgs(r.messages||[])).catch(()=>{
      setMsgs([]);
      toast?.('Unable to load this conversation right now.');
    }).finally(()=>setMsgsLoading(false));
  };

  const backToList=()=>{
    setSelId(null);
    setSelUser(null);
    setMsgs([]);
    setSendError('');
  };

  useEffect(()=>{
    if(!target)return;
    openConversation(target.conversationId,target.user);
    loadConversations();
    onTargetConsumed?.();
  },[target]);

  useEffect(()=>{
    messagesEndRef.current?.scrollIntoView({block:'end'});
  },[msgs,selId]);

  const sendMessage=async()=>{
    if(!draft.trim()||!selId)return;
    const text=draft.trim();
    setDraft('');
    setSendError('');
    try{
      const r=await api.sendMessage(selId,text);
      setMsgs(m=>[...m,r.message]);
      loadConversations();
    }catch(err){
      setDraft(text);
      setSendError(err.message||'Unable to send message. Please try again.');
    }
  };

  const startChat=async person=>{
    try{
      const r=await api.startConversation(person.u);
      openConversation(r.conversationId,r.user);
      loadConversations();
    }catch(err){
      toast?.(err.message||'Unable to start conversation');
    }
  };

  const existingUsernames=new Set(conversations.map(c=>c.user?.username));
  const availablePeople=seedPeople.filter(p=>!existingUsernames.has(p.u));
  const selected=selId ? { id:selId, user:selUser } : null;

  if(!user){
    return (
      <>
        <header className="header inbox-header">
          <button onClick={onBack} aria-label="Back"><ChevronLeft/></button>
          <h1 className="header-title">Inbox</h1>
        </header>
        <main className="inner-page inbox-page">
          <div className="empty-profile">Log in to view your messages.</div>
        </main>
      </>
    );
  }

  // A conversation is open: show a dedicated full chat screen (not the
  // list underneath it) with its own back button that returns to the
  // conversation list rather than leaving Inbox entirely.
  if(selected){
    const otherUser=selected.user;
    return (
      <>
        <header className="header inbox-header chat-header">
          <button onClick={backToList} aria-label="Back to conversations">
            <ChevronLeft/>
          </button>

          <button
            className="chat-header-identity"
            onClick={()=>otherUser?.username && openProfile?.(otherUser.username)}
            disabled={!otherUser?.username}
          >
            <Avatar src={otherUser?.avatar} text={otherUser?.name||'?'}/>
            <div>
              <b>{otherUser?.name||'Unknown user'}</b>
              {otherUser?.username&&<span>@{otherUser.username}</span>}
            </div>
          </button>

          {otherUser?.username&&
            <button
              className="push-right chat-header-chevron"
              onClick={()=>openProfile?.(otherUser.username)}
              aria-label="View profile"
            >
              <ChevronRight/>
            </button>
          }
        </header>

        <main className="inner-page inbox-page chat-open">

        <div className="messages-body">

          {msgsLoading&&<div className="chat-empty">Loading messages…</div>}

          {!msgsLoading&&msgs.length===0&&
            <div className="chat-empty">{EMPTY_MESSAGE}</div>
          }

          {!msgsLoading&&msgs.map(
            m=>
              <div
                className={
                  'message '+(m.mine?'me':'them')
                }
                key={m.id}
              >
                {m.text}
              </div>
          )}

          <div ref={messagesEndRef}/>

        </div>

        <div className="message-input">

          {sendError&&<div className="message-input-error">{sendError}</div>}

          <input
            value={draft}
            onChange={
              e=>setDraft(e.target.value)
            }
            onKeyDown={
              e=>{
                if(
                  e.key==='Enter'&&
                  draft.trim()
                ){
                  sendMessage();
                }
              }
            }
            placeholder="Type your message"
            aria-label="Type your message"
          />

          <button
            onClick={sendMessage}
            disabled={!draft.trim()}
            aria-label="Send message"
          >
            <Send/>
          </button>

        </div>

        </main>
      </>
    );
  }

  return (
    <>
      <header className="header inbox-header">
        <button onClick={onBack} aria-label="Back">
          <ChevronLeft/>
        </button>

        <h1 className="header-title">Inbox</h1>

        <button
          className="push-right"
          aria-label="New message"
          onClick={()=>setComposing(v=>!v)}
        >
          <Edit3/>
        </button>
      </header>

      <main className="inner-page inbox-page">

      {composing&&
        <div className="inbox-compose">
          <span className="inbox-compose-label">Start a new conversation</span>

          {availablePeople.length===0 ? (
            <div className="inbox-compose-empty">
              You're already chatting with everyone.
            </div>
          ) : availablePeople.map(
            p=>
              <button
                key={p.u}
                className="inbox-compose-row"
                onClick={()=>startChat(p)}
              >
                <Avatar text={p.n}/>
                <div>
                  <b>{p.n}</b>
                  <span>@{p.u}</span>
                </div>
              </button>
          )}
        </div>
      }

      {loading&&<div className="empty-profile">Loading conversations…</div>}

      {!loading&&
        <div className="chat-list">

          {conversations.map(
            c=>
              <button
                key={c.id}
                onClick={()=>openConversation(c.id)}
              >

                <Avatar
                  src={c.user?.avatar}
                  text={c.user?.name||'?'}
                />

                <div>

                  <b>{c.user?.name||'Unknown'}</b>

                  <p>{c.lastMessage||'Tap to chat'}</p>

                </div>

                <small>
                  {timeAgo(c.lastMessageAt)}
                </small>

              </button>
          )}

          {!conversations.length&&!composing&&
            <div className="empty-profile">No conversations yet. Tap the compose icon to start one.</div>
          }

        </div>
      }

      </main>
    </>
  );
}

export default Inbox;
