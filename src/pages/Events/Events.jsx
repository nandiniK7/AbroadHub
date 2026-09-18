import { React, useEffect, useState } from '../../shared/deps.js';
import { Plus, Grid2X2, Search, MapPin, MapPinned, LocateFixed, SlidersHorizontal, ArrowUpDown, Bookmark, Share2, CalendarDays, X, ChevronLeft, Check } from 'lucide-react';
import { api } from '../../api.js';
import ShareSheet from '../../components/ShareSheet/ShareSheet.jsx';

const EVENT_TYPES=['All','Party & NightLife','Cultural & Festival','Business & Networking','Workshops & Classes','Comedy','Music & Concert','Sports','Travel & Outdoor','Education & Job'];
const EVENT_MODES=['All','Offline','Online','Hybrid'];
const AUDIENCES=['All','Adults','Kids','Family'];
const PRICING=['All','Free Events','Paid Events'];
const SORTS=[
  ['popular','Most Popular'],
  ['price-high','Price: High to Low'],
  ['price-low','Price: Low to High'],
  ['nearest','Nearest']
];

function distanceKm(pos,ev){
  if(!pos||ev.lat==null||ev.lon==null)return Infinity;
  const R=6371;
  const dLat=(ev.lat-pos.lat)*Math.PI/180;
  const dLon=(ev.lon-pos.lon)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(pos.lat*Math.PI/180)*Math.cos(ev.lat*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function formatDate(iso){
  if(!iso)return '';
  const d=new Date(iso);
  if(isNaN(d))return '';
  return d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
}

function Events({ user, nav, requireAuth, toast, openConversation }){
  const [events,setEvents]=useState([]);
  const [loading,setLoading]=useState(true);
  const [q,setQ]=useState('');
  const [location,setLocation]=useState('');
  const [locationResults,setLocationResults]=useState([]);
  const [locationSearching,setLocationSearching]=useState(false);
  const [showLocationResults,setShowLocationResults]=useState(false);
  const [locationDenied,setLocationDenied]=useState(false);
  const [userPos,setUserPos]=useState(null);

  const [filters,setFilters]=useState({type:'All',mode:'All',audience:'All',pricing:'All'});
  const [draftFilters,setDraftFilters]=useState(filters);
  const [filterOpen,setFilterOpen]=useState(false);
  const [sortOpen,setSortOpen]=useState(false);
  const [sort,setSort]=useState('popular');

  const [saved,setSaved]=useState(()=>new Set());
  const [savedCount,setSavedCount]=useState(0);
  const [shareEvent,setShareEvent]=useState(null);

  const loadEvents=()=>{
    api.events().then(r=>{ setEvents(r.events||[]); setLoading(false); }).catch(()=>setLoading(false));
  };
  useEffect(()=>{ loadEvents(); },[]);

  useEffect(()=>{
    if(!user){ setSaved(new Set()); setSavedCount(0); return; }
    api.saved('event').then(r=>{
      const items=r.saved||[];
      setSaved(new Set(items.map(s=>s.contentId)));
      setSavedCount(items.length);
    }).catch(()=>{});
  },[user]);

  useEffect(()=>{
    const value=location.trim();
    if(!value||value.length<2){ setLocationResults([]); return; }
    const timer=setTimeout(async()=>{
      try{
        setLocationSearching(true);
        const res=await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(value)}`);
        const data=await res.json();
        setLocationResults(Array.isArray(data)?data:[]);
      }catch{ setLocationResults([]); }
      finally{ setLocationSearching(false); }
    },450);
    return ()=>clearTimeout(timer);
  },[location]);

  const useCurrentLocation=()=>{
    if(!navigator.geolocation){ setLocationDenied(true); return; }
    navigator.geolocation.getCurrentPosition(
      async pos=>{
        setUserPos({lat:pos.coords.latitude,lon:pos.coords.longitude});
        setLocationDenied(false);
        try{
          const res=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          const data=await res.json();
          setLocation(data.display_name||`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        }catch{
          setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        }
        setShowLocationResults(false);
      },
      ()=>setLocationDenied(true),
      {enableHighAccuracy:true,timeout:10000}
    );
  };

  const toggleSaved=async id=>{
    if(!requireAuth())return;
    const isSaved=saved.has(id);
    setSaved(prev=>{ const next=new Set(prev); isSaved?next.delete(id):next.add(id); return next; });
    setSavedCount(c=>isSaved?Math.max(0,c-1):c+1);
    try{ isSaved ? await api.unsave('event',id) : await api.save('event',id); }
    catch{
      setSaved(prev=>{ const next=new Set(prev); isSaved?next.add(id):next.delete(id); return next; });
      setSavedCount(c=>isSaved?c+1:Math.max(0,c-1));
    }
  };

  const applyFilters=()=>{ setFilters(draftFilters); setFilterOpen(false); };
  const clearFilters=()=>{ const cleared={type:'All',mode:'All',audience:'All',pricing:'All'}; setDraftFilters(cleared); setFilters(cleared); };

  const filtered=events.filter(e=>{
    const query=q.trim().toLowerCase();
    const matchesQuery=!query || `${e.name} ${e.description} ${e.venue}`.toLowerCase().includes(query);
    const matchesLocation=!location.trim() || String(e.venue||'').toLowerCase().includes(location.trim().toLowerCase());
    const matchesType=filters.type==='All' || e.type===filters.type;
    const matchesMode=filters.mode==='All' || e.mode===filters.mode;
    const matchesAudience=filters.audience==='All' || e.audience===filters.audience;
    const matchesPricing=filters.pricing==='All' || (filters.pricing==='Free Events' ? !e.paid : e.paid);
    return matchesQuery && matchesLocation && matchesType && matchesMode && matchesAudience && matchesPricing;
  });

  const sorted=[...filtered].sort((a,b)=>{
    if(sort==='price-high') return (b.price||0)-(a.price||0);
    if(sort==='price-low') return (a.price||0)-(b.price||0);
    if(sort==='popular') return (b.savedCount||0)-(a.savedCount||0);
    if(sort==='nearest') return distanceKm(userPos,a)-distanceKm(userPos,b);
    return new Date(b.postedAt)-new Date(a.postedAt);
  });

  const activeFilterCount=Object.values(filters).filter(v=>v!=='All').length;

  return (
    <main className="inner-page events-page">

      <div className="topline events-topline">
        <button onClick={()=>nav('nearby')} aria-label="Back"><ChevronLeft/></button>
        <div>
          <button className="events-collections-btn" onClick={()=>nav('collections')} aria-label="Collections">
            <Grid2X2 size={16}/><span>{savedCount}</span>
          </button>
          <button onClick={()=>{ if(!requireAuth())return; nav('events-create'); }} aria-label="Create event">
            <Plus/>
          </button>
        </div>
      </div>

      <div className="jobs-location-wrap">
        <div className="location-pill jobs-location-input-wrap">
          <MapPin/>
          <input
            value={location}
            onChange={e=>{ setLocation(e.target.value); setShowLocationResults(true); }}
            onFocus={()=>setShowLocationResults(true)}
            placeholder="Tap to select location"
            aria-label="Search location"
          />
          <button type="button" className="location-current-button" onClick={useCurrentLocation} aria-label="Use current location" title="Use current location">
            <MapPinned/>
          </button>
        </div>
        {showLocationResults&&(location.trim().length>=2||locationSearching)&&(
          <div className="location-results">
            {locationSearching&&<div className="location-result muted">Searching…</div>}
            {!locationSearching&&locationResults.map(item=>(
              <button type="button" className="location-result" key={item.place_id} onClick={()=>{ setLocation(item.display_name); setUserPos({lat:Number(item.lat),lon:Number(item.lon)}); setShowLocationResults(false); }}>
                <MapPin size={16}/><span>{item.display_name}</span>
              </button>
            ))}
            {!locationSearching&&!locationResults.length&&<div className="location-result muted">No matching locations found.</div>}
          </div>
        )}
        {locationDenied&&<div className="location-denied-note">Location access was denied — enter a location manually above instead.</div>}
      </div>

      <div className="search-bar">
        <Search/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search Events.."/>
      </div>

      <div className="events-toolbar">
        <button className={`events-pill ${activeFilterCount?'active':''}`} onClick={()=>{ setDraftFilters(filters); setFilterOpen(true); }}>
          <SlidersHorizontal size={14}/> Filter By {activeFilterCount>0&&`(${activeFilterCount})`}
        </button>
        <button className="events-pill active" onClick={()=>setSortOpen(true)}>
          {SORTS.find(([v])=>v===sort)?.[1]} <X size={13} onClick={e=>{e.stopPropagation();setSort('popular');}}/>
        </button>
      </div>

      <h3 className="events-section-title">{location.trim()?`Events near ${location.trim()}`:'Near You'}</h3>

      {loading&&<div className="empty-profile">Loading events…</div>}

      {!loading&&!sorted.length&&
        <div className="jobs-empty">No events found. Try a different search or filter.</div>
      }

      <div className="event-grid">
        {sorted.map(ev=>{
          const dist=userPos&&ev.lat!=null?distanceKm(userPos,ev):null;
          return (
            <article className="event-card" key={ev.id}>
              <div className="event-card-media">
                {ev.photo ? <img src={ev.photo} alt=""/> : <div className="event-card-media-placeholder"><CalendarDays size={26}/></div>}
                <button className="event-card-save" onClick={()=>toggleSaved(ev.id)} aria-label={saved.has(ev.id)?'Remove from saved':'Save event'}>
                  <Bookmark fill={saved.has(ev.id)?'currentColor':'none'}/>
                </button>
              </div>
              <div className="event-card-body">
                <b>{ev.name}</b>
                <span className="event-card-meta">
                  {dist!=null?`${dist.toFixed(1)} km away`:ev.venue}
                  {' · '}{formatDate(ev.start)}
                </span>
                <div className="event-card-footer">
                  <b className="event-card-price">{ev.paid ? (ev.price?`$${ev.price}`:'Paid') : 'Free'}</b>
                  <button className="event-card-share" onClick={()=>setShareEvent(ev)} aria-label="Share event"><Share2 size={15}/></button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {filterOpen&&
        <div className="backdrop" onClick={()=>setFilterOpen(false)}>
          <div className="jobs-filter-sheet" onClick={e=>e.stopPropagation()}>
            <div className="jobs-filter-head">
              <button onClick={()=>setFilterOpen(false)} aria-label="Close"><X size={20}/></button>
              <b>Filter Events</b>
              <span/>
            </div>

            <span className="filter-group-label">Event Type</span>
            <div className="filter-chip-row">
              {EVENT_TYPES.map(t=>(
                <button key={t} className={draftFilters.type===t?'active':''} onClick={()=>setDraftFilters(f=>({...f,type:t}))}>
                  {draftFilters.type===t&&<Check size={13}/>}{t}
                </button>
              ))}
            </div>

            <span className="filter-group-label">Event Mode</span>
            <div className="filter-chip-row">
              {EVENT_MODES.map(m=>(
                <button key={m} className={draftFilters.mode===m?'active':''} onClick={()=>setDraftFilters(f=>({...f,mode:m}))}>
                  {draftFilters.mode===m&&<Check size={13}/>}{m}
                </button>
              ))}
            </div>

            <span className="filter-group-label">Audience</span>
            <div className="filter-chip-row">
              {AUDIENCES.map(a=>(
                <button key={a} className={draftFilters.audience===a?'active':''} onClick={()=>setDraftFilters(f=>({...f,audience:a}))}>
                  {draftFilters.audience===a&&<Check size={13}/>}{a}
                </button>
              ))}
            </div>

            <span className="filter-group-label">Pricing</span>
            <div className="filter-chip-row">
              {PRICING.map(p=>(
                <button key={p} className={draftFilters.pricing===p?'active':''} onClick={()=>setDraftFilters(f=>({...f,pricing:p}))}>
                  {draftFilters.pricing===p&&<Check size={13}/>}{p}
                </button>
              ))}
            </div>

            <div className="jobs-filter-footer">
              <button className="outline" onClick={clearFilters}>Reset</button>
              <button className="primary" onClick={applyFilters}>Apply</button>
            </div>
          </div>
        </div>
      }

      {sortOpen&&
        <div className="backdrop" onClick={()=>setSortOpen(false)}>
          <div className="bottom-sheet" onClick={e=>e.stopPropagation()}>
            <div className="sheet-handle"/>
            <b className="sort-sheet-title">Sorting</b>
            {SORTS.map(([value,label])=>(
              <button key={value} className={sort===value?'active':''} onClick={()=>{ setSort(value); setSortOpen(false); if(value==='nearest'&&!userPos)useCurrentLocation(); }}>
                <ArrowUpDown size={16}/><span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      }

      {shareEvent&&
        <ShareSheet
          title={shareEvent.name}
          url={`${window.location.origin}/events/${shareEvent.id}`}
          close={()=>setShareEvent(null)}
          onSent={(conversationId,convoUser)=>openConversation?.(conversationId,convoUser)}
          requireAuth={requireAuth}
        />
      }

    </main>
  );
}

export default Events;
