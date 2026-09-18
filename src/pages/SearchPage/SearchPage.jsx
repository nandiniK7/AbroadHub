import Avatar from '../../components/Avatar/Avatar.jsx';
import { React, useEffect, useMemo, useRef, useState, Plus, Bell, MessageCircle, MoreVertical, Heart, Search, BriefcaseBusiness, MapPin, UserCircle, Compass, HomeIcon, ChevronLeft, Edit3, Camera, ImageIcon, CalendarDays, Building2, X, Send, Bookmark, Share2, Users, Settings, LogOut, ChevronRight, Check, Trash2, Menu, Globe, Phone, Mail, Lock, Eye, EyeOff, Upload, SlidersHorizontal, ArrowLeft, UserPlus, MapPinned, LocateFixed, Sparkles, Sprout, ShoppingBag, ShoppingCart, HeartPulse, ShieldCheck, Scale, Flag, Utensils, Grid2X2, CORAL, festival, wordmark, splashLogo, categories, providers, seedJobs, seedPosts, seedNotifs, seedChats, seedPeople, load, save } from '../../shared/deps.js';
import { api } from '../../api.js';

function SearchPage({
  posts,
  onBack,
  openProfile,
  requireAuth,
  toast,
  // Query/tab are owned by App.jsx so they survive navigating away to a
  // profile and back (instead of resetting every time this page remounts).
  q: qProp,
  setQ: setQProp,
  tab: tabProp,
  setTab: setTabProp
}){

  const [qLocal,setQLocal]=useState('');
  const [tabLocal,setTabLocal]=useState('Posts');
  const q=qProp??qLocal;
  const setQ=setQProp??setQLocal;
  const tab=tabProp??tabLocal;
  const setTab=setTabProp??setTabLocal;

  const [followState,setFollowState]=useState({});

  // Accounts = real people who have posted; Provider = the AbroadHub
  // provider directory (kept consistent with the Providers page).
  const accountList=useMemo(()=>{
    const seen=new Map();
    posts.forEach(p=>{
      if(p.username && !seen.has(p.username)) seen.set(p.username,{n:p.name,u:p.username});
    });
    return [...seen.values()];
  },[posts]);

  const providerList=seedPeople;

  // Follow state starts unknown for every row — without this, a person you
  // already follow would show "Follow" until clicked, and clicking it would
  // silently unfollow them instead of reflecting reality. Hydrate the real
  // isFollowing status (already returned by /users/:username) for whichever
  // list is on screen, once per set of usernames.
  useEffect(()=>{
    if(tab!=='Accounts' && tab!=='Provider')return;
    const list=tab==='Accounts'?accountList:providerList;
    const unknown=list.filter(a=>!(a.u in followState));
    if(!unknown.length)return;
    let cancelled=false;
    Promise.all(unknown.map(a=>api.publicProfile(a.u).then(r=>[a.u,!!r.user?.isFollowing]).catch(()=>[a.u,false])))
      .then(entries=>{
        if(cancelled)return;
        setFollowState(x=>({...x,...Object.fromEntries(entries)}));
      });
    return ()=>{ cancelled=true; };
  },[tab,accountList,providerList]);

  const toggleFollow=async(username)=>{
    if(!requireAuth())return;
    try{
      const r=await api.toggleFollow(username);
      setFollowState(x=>({...x,[username]:r.user.isFollowing}));
    }catch(err){
      toast?.(err.message||'Unable to update follow status');
    }
  };

  const renderRows=list=>
    list
      .filter(a=>(a.n+a.u).toLowerCase().includes(q.toLowerCase()))
      .map(a=>(
        <div className="provider-row" key={a.u}>
          <button
            className="provider-row-identity"
            onClick={()=>openProfile(a.u)}
          >
            <Avatar text={a.n}/>
            <div>
              <b>{a.n}</b>
              <span>@{a.u}</span>
            </div>
          </button>

          <button
            className={`search-follow-btn${followState[a.u]?' following':''}`}
            onClick={()=>toggleFollow(a.u)}
          >
            {followState[a.u]?'Following':'Follow'}
          </button>
        </div>
      ));

  const matchingPosts=q.trim()
    ? posts.filter(p=>
        p.text.toLowerCase().includes(q.toLowerCase()) ||
        p.name.toLowerCase().includes(q.toLowerCase())
      )
    : [];

  const matchingAccounts=q.trim()
    ? accountList.filter(a=>(a.n+a.u).toLowerCase().includes(q.toLowerCase()))
    : [];

  return (
    <>
      <header className="header search-header">
        <button onClick={onBack} aria-label="Back">
          <ArrowLeft/>
        </button>
        <h1 className="header-title">Search</h1>
      </header>

      <main className="inner-page">

      <div className="search-head">

        <div className="search-input">

          <Search/>

          <input
            autoFocus
            value={q}
            onChange={
              e=>setQ(e.target.value)
            }
            placeholder="Search here"
          />

        </div>

      </div>

      <div className="tabs">

        {[
          'Posts',
          'Accounts',
          'Provider'
        ].map(
          t=>
            <button
              className={
                tab===t?'active':''
              }
              onClick={()=>setTab(t)}
              key={t}
            >
              {t}
            </button>
        )}

      </div>

      {tab==='Posts'&&
        <div className="search-results">
          {!q.trim() ? (
            <div className="search-empty-hint">Search for posts</div>
          ) : !matchingPosts.length ? (
            <div className="search-empty-hint">No posts found</div>
          ) : matchingPosts.map(
              p=>
                <article
                  className="result-post"
                  key={p.id}
                >

                  <Avatar
                    text={p.name}
                  />

                  <div>
                    <b>{p.name}</b>
                    <p>{p.text}</p>
                  </div>

                </article>
            )
          }
        </div>
      }

      {tab==='Accounts'&&
        <div className="provider-results">
          {!q.trim() ? (
            <div className="search-empty-hint">Search for accounts</div>
          ) : !matchingAccounts.length ? (
            <div className="search-empty-hint">No accounts found</div>
          ) : renderRows(accountList)}
        </div>
      }

      {tab==='Provider'&&
        <div className="provider-results">
          {renderRows(providerList)}
        </div>
      }

      </main>
    </>
  );
}

export default SearchPage;
