import Avatar from '../../components/Avatar/Avatar.jsx';
import { React, useEffect, useState } from '../../shared/deps.js';
import { ChevronLeft, Search, MapPin, MapPinned } from 'lucide-react';
import { api } from '../../api.js';

function distanceKm(pos,p){
  if(!pos||p.lat==null||p.lon==null)return null;
  const R=6371;
  const dLat=(p.lat-pos.lat)*Math.PI/180;
  const dLon=(p.lon-pos.lon)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(pos.lat*Math.PI/180)*Math.cos(p.lat*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function Providers({ profession, onBack, openProfile, requireAuth, toast, user }){

  const [q,setQ]=useState('');
  const [providers,setProviders]=useState([]);
  const [loading,setLoading]=useState(true);
  const [followState,setFollowState]=useState({});

  const [tab,setTab]=useState('popular'); // 'popular' | 'nearby'
  const [userPos,setUserPos]=useState(null);
  const [locating,setLocating]=useState(false);

  const [location,setLocation]=useState('');
  const [locationResults,setLocationResults]=useState([]);
  const [locationSearching,setLocationSearching]=useState(false);
  const [showLocationResults,setShowLocationResults]=useState(false);

  const load=()=>{
    setLoading(true);
    api.providers(profession).then(r=>{ setProviders(r.providers||[]); setLoading(false); })
      .catch(()=>{ setLoading(false); toast?.('Unable to load providers right now.'); });
  };
  useEffect(()=>{ load(); },[profession]);

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
    if(!navigator.geolocation){ toast?.('Location is not available on this device/browser.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos=>{
        setUserPos({lat:pos.coords.latitude,lon:pos.coords.longitude});
        try{
          const res=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          const data=await res.json();
          setLocation(data.display_name||`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        }catch{
          setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        }
        setLocating(false);
        setShowLocationResults(false);
      },
      ()=>{ toast?.('Location access was denied.'); setLocating(false); },
      {enableHighAccuracy:true,timeout:10000}
    );
  };

  const toggleFollow=async username=>{
    if(!requireAuth())return;
    try{
      const r=await api.toggleFollow(username);
      setFollowState(x=>({...x,[username]:r.user.isFollowing}));
    }catch(err){
      toast?.(err.message||'Unable to update follow status');
    }
  };

  const openNearby=()=>{
    setTab('nearby');
    if(!userPos)useCurrentLocation();
  };

  const query=q.trim().toLowerCase();
  // The viewer's own account is intentionally included here (not filtered
  // out) — a provider must be able to find their own account discoverable
  // under their category, same as anyone else's.
  let filtered=providers.filter(p=>
    !query || `${p.name} ${p.username}`.toLowerCase().includes(query)
  );

  if(tab==='nearby'){
    filtered=filtered.filter(p=>p.lat!=null&&p.lon!=null);
    filtered=[...filtered].sort((a,b)=>distanceKm(userPos,a)-distanceKm(userPos,b));
  }else{
    filtered=[...filtered].sort((a,b)=>(b.followers||0)-(a.followers||0));
  }

  return (
    <>
      <header className="header providers-header">
        <button onClick={onBack} aria-label="Back"><ChevronLeft/></button>
        <h1 className="header-title">{profession}</h1>
      </header>

      <main className="inner-page list-page providers-page">

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
        </div>

        <div className="search-bar">
          <Search/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search professionals..."/>
        </div>

        <div className="providers-tab-row">
          <button className={tab==='popular'?'active':''} onClick={()=>setTab('popular')}>Popular</button>
          <button className={tab==='nearby'?'active':''} onClick={openNearby} disabled={locating}>
            {locating?'Locating…':'Nearby'}
          </button>
        </div>

        {loading&&<div className="empty-profile">Loading providers…</div>}

        {!loading&&!filtered.length&&
          <div className="category-listing-empty">
            <b>No {profession} providers yet</b>
            <span>
              {tab==='nearby'
                ? `No one has shared their location as a ${profession} yet.`
                : `Be the first — add "${profession}" as your occupation in your profile.`}
            </span>
          </div>
        }

        {!loading&&filtered.map(p=>{
          const dist=tab==='nearby'?distanceKm(userPos,p):null;
          const following=followState[p.username]??p.isFollowing;
          return (
            <div className="provider-row" key={p.username}>
              <Avatar src={p.avatar} text={p.name}/>
              <div className="provider-row-body">
                <button className="provider-row-name" onClick={()=>openProfile?.(p.username)}>
                  <b>{p.name}</b>
                </button>
                <div className="provider-row-meta">
                  <button
                    className={`provider-row-follow ${following?'following':''}`}
                    onClick={()=>toggleFollow(p.username)}
                  >
                    {following ? 'Following' : 'Follow'}
                  </button>
                  {dist!=null&&<span className="provider-row-distance"><MapPin size={12}/>{dist.toFixed(1)} miles away</span>}
                </div>
              </div>
            </div>
          );
        })}

      </main>
    </>
  );
}

export default Providers;
