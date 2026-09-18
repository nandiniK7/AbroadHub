import { React, useEffect, useState } from '../../shared/deps.js';
import { ChevronLeft, Search, Phone, Navigation, Share2, Bookmark } from 'lucide-react';
import { api } from '../../api.js';

function Collections({ onBack, jobs, events, posts, toast }){
  const [saved,setSaved]=useState(null);
  const [q,setQ]=useState('');

  useEffect(()=>{
    api.saved().then(r=>setSaved(r.saved||[])).catch(()=>setSaved([]));
  },[]);

  const unsave=async item=>{
    try{
      await api.unsave(item.contentType,item.contentId);
      setSaved(s=>s.filter(x=>!(x.contentType===item.contentType&&x.contentId===item.contentId)));
    }catch(err){
      toast?.(err.message||'Unable to remove item');
    }
  };

  const resolved=(saved||[]).map(item=>{
    if(item.contentType==='job') return { item, kind:'job', data: jobs.find(j=>j.id===item.contentId) };
    if(item.contentType==='event') return { item, kind:'event', data: events.find(e=>e.id===item.contentId) };
    return { item, kind:'post', data: posts.find(p=>p.id===item.contentId) };
  }).filter(r=>r.data);

  const filtered=resolved.filter(r=>{
    const label=r.kind==='job'?r.data.title:r.kind==='event'?r.data.name:r.data.text;
    return String(label||'').toLowerCase().includes(q.toLowerCase());
  });

  return (
    <main className="inner-page">
      <div className="inner-header">
        <button onClick={onBack} aria-label="Back"><ChevronLeft/></button>
        <b className="push-right">Collections</b>
      </div>

      <div className="search-bar">
        <Search/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search Collections"/>
      </div>

      {saved===null&&<div className="empty-profile">Loading…</div>}

      {saved!==null&&!filtered.length&&
        <div className="empty-profile">Nothing saved yet. Tap the bookmark icon on a job, event or post to collect it here.</div>
      }

      {filtered.map(({item,kind,data})=>(
        <div className="collection-card" key={`${item.contentType}-${item.contentId}`}>
          <div className="collection-card-head">
            <b>{kind==='job'?data.title:kind==='event'?data.name:data.text?.slice(0,60)}</b>
            <button onClick={()=>unsave(item)} aria-label="Remove"><Bookmark fill="currentColor"/></button>
          </div>

          {kind==='job'&&<span>{data.company} · {data.location}</span>}
          {kind==='event'&&<span>{data.venue}</span>}
          {kind==='post'&&<span>{data.name}</span>}

          <div className="collection-card-actions">
            {kind==='job'&&data.mobile&&
              <a className="collection-action" href={`tel:${(data.mobileCode||'').replace(/\s/g,'')}${data.mobile}`}><Phone size={15}/>Call Now</a>
            }
            {kind==='event'&&data.venue&&
              <a className="collection-action" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/${encodeURIComponent(data.venue)}`}><Navigation size={15}/>Get Directions</a>
            }
          </div>
        </div>
      ))}
    </main>
  );
}

export default Collections;
