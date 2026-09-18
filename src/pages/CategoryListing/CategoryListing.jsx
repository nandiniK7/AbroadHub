import { React, useEffect, useState } from '../../shared/deps.js';
import {
  ChevronLeft, Grid2X2, Plus, Search, MapPin, MapPinned, Bookmark, Share2, Phone,
  MessageCircle, X, Building2, Sparkles, Sprout, ShoppingBag, ShoppingCart, HeartPulse, ShieldCheck, Scale, Flag, Utensils,
  MoreVertical, Edit3, Trash2
} from 'lucide-react';
import { api } from '../../api.js';
import ShareSheet from '../../components/ShareSheet/ShareSheet.jsx';

const ICONS = {
  'Restaurants': Utensils,
  'Groceries': ShoppingCart,
  'Grocery Stores': ShoppingCart,
  'Farms': Sprout,
  'Fashion': ShoppingBag,
  'Night Clubs': Flag,
  'Real Estate': Building2,
  'Legal Consultant': Scale,
  'Beauty & Spa': Sparkles,
  'Health Center': HeartPulse,
  'Insurance': ShieldCheck
};

// A real user account (account_type='business', discovered via the new
// /businesses route) reshaped to the same fields the existing listing card
// UI already renders, so business accounts and manually-created listings
// can share one grid with minimal branching.
function businessToListingShape(u){
  return {
    id:`biz:${u.username}`, username:u.username, isBusinessAccount:true,
    title:u.businessName||u.name, description:u.bio||'',
    phone:u.phone||'', phoneCode:u.phoneCode||'',
    location:u.location||'', lat:u.lat??null, lon:u.lon??null,
    price:'', photo:u.avatar||'',
    postedByUsername:u.username, posted:'',
    businessFields:u.businessFields||{}
  };
}

function CategoryListing({ category, nav, user, requireAuth, toast, openConversation, openProfile, onEdit }){
  const CategoryIcon = ICONS[category] || Building2;

  const [items,setItems]=useState([]);
  const [businessItems,setBusinessItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [q,setQ]=useState('');
  const [location,setLocation]=useState('');
  const [locationResults,setLocationResults]=useState([]);
  const [locationSearching,setLocationSearching]=useState(false);
  const [showLocationResults,setShowLocationResults]=useState(false);

  const [saved,setSaved]=useState(()=>new Set());
  const [savedCount,setSavedCount]=useState(0);
  const [shareItem,setShareItem]=useState(null);
  const [detailItem,setDetailItem]=useState(null);
  const [manageOpen,setManageOpen]=useState(false);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [deleting,setDeleting]=useState(false);

  const load=()=>{
    setLoading(true);
    api.listings(category).then(r=>{ setItems(r.listings||[]); setLoading(false); })
      .catch(()=>{ setLoading(false); toast?.('Unable to load listings right now.'); });
    api.businesses(category).then(r=>{
      setBusinessItems((r.businesses||[]).map(businessToListingShape));
    }).catch(()=>{ setBusinessItems([]); });
  };
  useEffect(()=>{ load(); },[category]);

  useEffect(()=>{
    if(!user){ setSaved(new Set()); setSavedCount(0); return; }
    api.saved('listing').then(r=>{
      const own=(r.saved||[]).filter(s=>items.some(it=>it.id===s.contentId));
      setSaved(new Set((r.saved||[]).map(s=>s.contentId)));
      setSavedCount((r.saved||[]).length);
    }).catch(()=>{});
  },[user,items]);

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
    navigator.geolocation.getCurrentPosition(
      async pos=>{
        try{
          const res=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          const data=await res.json();
          setLocation(data.display_name||`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        }catch{
          setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        }
        setShowLocationResults(false);
      },
      ()=>toast?.('Location access was denied.'),
      {enableHighAccuracy:true,timeout:10000}
    );
  };

  const toggleSaved=async id=>{
    if(!requireAuth())return;
    const isSaved=saved.has(id);
    setSaved(prev=>{ const next=new Set(prev); isSaved?next.delete(id):next.add(id); return next; });
    setSavedCount(c=>isSaved?Math.max(0,c-1):c+1);
    try{ isSaved ? await api.unsave('listing',id) : await api.save('listing',id); }
    catch{
      setSaved(prev=>{ const next=new Set(prev); isSaved?next.add(id):next.delete(id); return next; });
      setSavedCount(c=>isSaved?c+1:Math.max(0,c-1));
      toast?.('Unable to update saved listings right now.');
    }
  };

  const messageListing=async(item,e)=>{
    e?.stopPropagation();
    if(!requireAuth())return;
    if(!item.postedByUsername || item.postedByUsername===user?.username){
      toast?.('No poster to message for this listing.');
      return;
    }
    try{
      const r=await api.startConversation(item.postedByUsername);
      openConversation?.(r.conversationId,r.user);
    }catch(err){
      toast?.(err.message || 'Unable to open conversation.');
    }
  };

  const callTarget=item=>item.phone ? `tel:${(item.phoneCode||'').replace(/\s/g,'')}${item.phone}` : null;
  const callListing=(item,e)=>{
    e?.stopPropagation();
    if(!item.phone) toast?.('No phone number listed for this business.');
  };

  const closeDetail=()=>{ setDetailItem(null); setManageOpen(false); setConfirmDelete(false); };

  const editListing=item=>{
    setManageOpen(false);
    closeDetail();
    onEdit?.(item);
  };

  const confirmDeleteListing=async()=>{
    if(!detailItem)return;
    setDeleting(true);
    try{
      await api.deleteListing(detailItem.id);
      setItems(prev=>prev.filter(it=>it.id!==detailItem.id));
      toast?.('Listing deleted');
      closeDetail();
    }catch(err){
      toast?.(err.message||'Unable to delete this listing right now.');
    }finally{
      setDeleting(false);
    }
  };

  const query=q.trim().toLowerCase();
  const locationQuery=location.trim().toLowerCase();
  const filtered=[...items,...businessItems].filter(it=>{
    const matchesQuery=!query || `${it.title} ${it.description}`.toLowerCase().includes(query);
    const itLocation=String(it.location||'').toLowerCase();
    const matchesLocation=!locationQuery || itLocation.includes(locationQuery) || locationQuery.includes(itLocation);
    return matchesQuery && matchesLocation;
  });

  return (
    <>
      <header className="header category-listing-header">
        <button onClick={()=>nav('nearby')} aria-label="Back"><ChevronLeft/></button>
        <h1 className="header-title">{category}</h1>
        <div className="home-header-icons">
          <button className="events-collections-btn" onClick={()=>nav('collections')} aria-label="Collections">
            <Grid2X2 size={16}/><span>{savedCount}</span>
          </button>
          <button onClick={()=>{ if(!requireAuth())return; nav(`nearby-category-create:${category}`); }} aria-label={`Add a ${category} listing`}>
            <Plus/>
          </button>
        </div>
      </header>

      <main className="inner-page jobs-page category-listing-page">

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
              <button type="button" className="location-result" key={item.place_id} onClick={()=>{ setLocation(item.display_name); setShowLocationResults(false); }}>
                <MapPin size={16}/><span>{item.display_name}</span>
              </button>
            ))}
            {!locationSearching&&!locationResults.length&&<div className="location-result muted">No matching locations found.</div>}
          </div>
        )}
      </div>

      <div className="search-bar">
        <Search/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder={`Search ${category}...`}/>
      </div>

      <h3>{location.trim() ? `${category} in ${location.trim()}` : `${category} Near You`}</h3>

      {loading&&<div className="empty-profile">Loading {category.toLowerCase()}…</div>}

      {!loading&&!filtered.length&&
        <div className="category-listing-empty">
          <div className="category-listing-empty-icon"><CategoryIcon size={30}/></div>
          <b>No {category.toLowerCase()} yet</b>
          <span>{items.length ? 'Try a different search or location.' : `Discover local ${category.toLowerCase()} or add your own listing.`}</span>
          {!items.length&&
            <button className="primary" onClick={()=>{ if(!requireAuth())return; nav(`nearby-category-create:${category}`); }}>
              <Plus size={16}/> Add {category}
            </button>
          }
        </div>
      }

      <div className="job-grid">
        {filtered.map(item=>(
          <article
            className="job-card category-listing-card"
            key={item.id}
            onClick={()=>{
              if(item.isBusinessAccount){ openProfile?.(item.username); return; }
              setDetailItem(item); setManageOpen(false); setConfirmDelete(false);
            }}
          >
            {item.photo
              ? <img className="category-listing-photo" src={item.photo} alt=""/>
              : <div className="category-listing-photo category-listing-photo-fallback"><CategoryIcon size={26}/></div>
            }
            <div className="job-head">
              <div>
                <h2>{item.title}</h2>
                {item.price&&<p>{item.price}</p>}
              </div>
              {!item.isBusinessAccount&&
                <button onClick={e=>{ e.stopPropagation(); toggleSaved(item.id); }} aria-label={saved.has(item.id)?'Remove saved listing':'Save listing'}>
                  <Bookmark fill={saved.has(item.id)?'currentColor':'none'}/>
                </button>
              }
            </div>

            <p><MapPin size={15}/>{item.location}</p>
            <p>{item.description}</p>
            {!item.isBusinessAccount&&<small>Posted {item.posted}</small>}

            <div className="job-actions" onClick={e=>e.stopPropagation()}>
              {callTarget(item) ? (
                <a href={callTarget(item)}><Phone/>Call Now</a>
              ) : (
                <button onClick={e=>callListing(item,e)}><Phone/>Call Now</button>
              )}
              <button onClick={e=>messageListing(item,e)}><MessageCircle/>Message</button>
              <button onClick={e=>{ e.stopPropagation(); setShareItem(item); }}><Share2/>Share</button>
            </div>
          </article>
        ))}
      </div>

      {detailItem&&
        <div className="backdrop" onClick={closeDetail}>
          <div className="job-detail-sheet" onClick={e=>e.stopPropagation()}>
            <div className="category-listing-detail-toolbar">
              <button
                className="category-listing-detail-save"
                onClick={()=>toggleSaved(detailItem.id)}
                aria-label={saved.has(detailItem.id)?'Remove saved listing':'Save listing'}
              >
                <Bookmark fill={saved.has(detailItem.id)?'currentColor':'none'}/>
              </button>
              {detailItem.postedByUsername===user?.username&&
                <button className="category-listing-manage" onClick={()=>setManageOpen(v=>!v)} aria-label="Manage listing">
                  <MoreVertical/>
                </button>
              }
              <button className="close" onClick={closeDetail}><X/></button>
            </div>

            {manageOpen&&
              <div className="context-menu category-listing-manage-menu" onClick={e=>e.stopPropagation()}>
                <button onClick={()=>editListing(detailItem)}><Edit3 size={16}/> Edit Listing</button>
                <button className="danger" onClick={()=>{ setManageOpen(false); setConfirmDelete(true); }}><Trash2 size={16}/> Delete Listing</button>
              </div>
            }

            {detailItem.photo
              ? <img className="category-listing-detail-photo" src={detailItem.photo} alt=""/>
              : <div className="job-detail-logo"><CategoryIcon size={28}/></div>
            }
            <h2>{detailItem.title}</h2>
            {detailItem.price&&<span className="job-detail-company">{detailItem.price}</span>}

            <div className="job-detail-section">
              <b>About</b>
              <p>{detailItem.description}</p>
            </div>

            <div className="job-detail-section">
              <b>Location</b>
              <p><MapPin size={14}/>{detailItem.location}</p>
            </div>

            {detailItem.postedByUsername&&
              <div className="job-detail-posted-by">
                Posted by <b>@{detailItem.postedByUsername}</b> · {detailItem.posted}
              </div>
            }

            <div className="job-detail-actions">
              <button onClick={e=>messageListing(detailItem,e)}><MessageCircle size={16}/>Message Now</button>
              {callTarget(detailItem) ? (
                <a className="primary" href={callTarget(detailItem)}><Phone size={16}/>Call Now</a>
              ) : (
                <button className="primary" onClick={e=>callListing(detailItem,e)}><Phone size={16}/>Call Now</button>
              )}
            </div>

            {confirmDelete&&
              <div className="backdrop" onClick={()=>setConfirmDelete(false)}>
                <div className="confirm-sheet" onClick={e=>e.stopPropagation()}>
                  <h2 className="danger-text">Delete {detailItem.title}?</h2>
                  <p>This removes the listing permanently. This can't be undone.</p>
                  <div className="confirm-sheet-actions">
                    <button className="outline" onClick={()=>setConfirmDelete(false)} disabled={deleting}>Cancel</button>
                    <button className="primary danger-button" onClick={confirmDeleteListing} disabled={deleting}>{deleting?'Deleting…':'Delete'}</button>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }

      {shareItem&&
        <ShareSheet
          title={`${shareItem.title}${shareItem.location?` — ${shareItem.location}`:''}`}
          url={shareItem.isBusinessAccount
            ? `${window.location.origin}/u/${shareItem.username}`
            : `${window.location.origin}/listings/${shareItem.id}`}
          close={()=>setShareItem(null)}
          onSent={(conversationId,convoUser)=>openConversation?.(conversationId,convoUser)}
          requireAuth={requireAuth}
        />
      }

      </main>
    </>
  );
}

export default CategoryListing;
