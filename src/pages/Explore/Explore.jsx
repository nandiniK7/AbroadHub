import { React, useEffect, useMemo, useState } from '../../shared/deps.js';
import { Search, X, Bookmark, Share2, CalendarDays } from 'lucide-react';
import { api } from '../../api.js';
import ShareSheet from '../../components/ShareSheet/ShareSheet.jsx';

function Explore({
  posts,
  events,
  user,
  requireAuth,
  nav,
  openConversation,
  toast
}){

  const [saved,setSaved]=useState(()=>new Set());
  const [detailItem,setDetailItem]=useState(null);
  const [shareItem,setShareItem]=useState(null);

  useEffect(()=>{
    if(!user){ setSaved(new Set()); return; }
    Promise.all([api.saved('post'),api.saved('event')]).then(([p,e])=>{
      const next=new Set();
      (p.saved||[]).forEach(s=>next.add(`post:${s.contentId}`));
      (e.saved||[]).forEach(s=>next.add(`event:${s.contentId}`));
      setSaved(next);
    }).catch(()=>{});
  },[user]);

  // Unified explore feed built from real application data — posts and
  // events that actually have an image. No placeholder or repeated
  // filler images.
  const items=useMemo(()=>{
    const postItems=posts.filter(p=>p.image).map(p=>({
      key:`post:${p.id}`, type:'post', id:p.id, image:p.image,
      title:p.text||p.name, subtitle:p.name, raw:p
    }));
    const eventItems=events.filter(e=>e.photo).map(e=>({
      key:`event:${e.id}`, type:'event', id:e.id, image:e.photo,
      title:e.name, subtitle:e.venue, raw:e
    }));
    return [...postItems,...eventItems];
  },[posts,events]);

  const toggleSaved=async item=>{
    if(!requireAuth())return;
    const isSaved=saved.has(item.key);
    setSaved(prev=>{ const next=new Set(prev); isSaved?next.delete(item.key):next.add(item.key); return next; });
    try{ isSaved ? await api.unsave(item.type,item.id) : await api.save(item.type,item.id); }
    catch{ setSaved(prev=>{ const next=new Set(prev); isSaved?next.add(item.key):next.delete(item.key); return next; }); }
  };

  const openItem=item=>{
    if(item.type==='event'){ setDetailItem(item); return; }
    nav('home');
  };

  return (
    <main className="explore-page">

      <div className="explore-search-row">
        <button type="button" className="search-bar explore-search-bar explore-search-trigger" onClick={()=>nav('search')}>
          <Search size={18}/>
          <span className="explore-search-placeholder">Search Here...</span>
        </button>
      </div>

      {!items.length ? (
        <div className="home-search-empty explore-empty">
          <Search size={28}/>
          <b>No results found</b>
          <span>Posts and events with photos will show up here.</span>
        </div>
      ) : (
        <div className="explore-masonry">
          {items.map(item=>(
            <button className="explore-card" key={item.key} onClick={()=>openItem(item)}>
              <img src={item.image} alt=""/>
              {item.type==='event'&&
                <span className="explore-card-badge"><CalendarDays size={11}/> Event</span>
              }
              <span className="explore-card-overlay">
                <b>{item.title}</b>
                {item.subtitle&&<span>{item.subtitle}</span>}
              </span>
            </button>
          ))}
        </div>
      )}

      {detailItem&&
        <div className="backdrop" onClick={()=>setDetailItem(null)}>
          <div className="explore-detail-sheet" onClick={e=>e.stopPropagation()}>
            <button className="close" onClick={()=>setDetailItem(null)}><X/></button>
            <img className="explore-detail-image" src={detailItem.image} alt=""/>
            <div className="explore-detail-body">
              <b>{detailItem.title}</b>
              {detailItem.subtitle&&<span>{detailItem.subtitle}</span>}
              <div className="explore-detail-actions">
                <button onClick={()=>toggleSaved(detailItem)}>
                  <Bookmark fill={saved.has(detailItem.key)?'currentColor':'none'} size={16}/>
                  {saved.has(detailItem.key)?'Saved':'Save'}
                </button>
                <button onClick={()=>setShareItem(detailItem)}><Share2 size={16}/>Share</button>
                <button onClick={()=>{ setDetailItem(null); nav('events'); }}>View in Events</button>
              </div>
            </div>
          </div>
        </div>
      }

      {shareItem&&
        <ShareSheet
          title={shareItem.title}
          url={`${window.location.origin}/${shareItem.type}s/${shareItem.id}`}
          close={()=>setShareItem(null)}
          onSent={(conversationId,convoUser)=>openConversation?.(conversationId,convoUser)}
          requireAuth={requireAuth}
        />
      }

    </main>
  );
}

export default Explore;
