import { React, useEffect, useState } from '../../shared/deps.js';
import {
  ChevronLeft, ChevronRight, Grid2X2, Plus, Search, MapPin, MapPinned, Bookmark, Share2, Phone,
  MessageCircle, X, Building2, BedDouble, Bath, SlidersHorizontal, ArrowUpDown,
  MoreVertical, Edit3, Trash2, ChevronDown
} from 'lucide-react';
import { api } from '../../api.js';
import ShareSheet from '../../components/ShareSheet/ShareSheet.jsx';

const LISTING_TYPES=['All','Offering Rent','Seeking Rent','For Sale'];
const PROPERTY_TYPES=['Any','Apartment','House','Townhouse','Condo','Single Room'];
const FURNISH_TYPES=['Any','Furnished','Un Furnished','Semi-Furnished'];
const SORTS=[
  ['recent','Most Recent'],
  ['price-low','Price: Low to High'],
  ['price-high','Price: High to Low'],
  ['nearest','Nearest']
];

function distanceMi(pos,p){
  if(!pos||p.lat==null||p.lon==null)return null;
  const R=3958.8;
  const dLat=(p.lat-pos.lat)*Math.PI/180;
  const dLon=(p.lon-pos.lon)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(pos.lat*Math.PI/180)*Math.cos(p.lat*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

const emptyFilters={
  listingType:'All', propertyType:'Any', furnishType:'Any',
  priceMin:0, priceMax:100000, distance:100, beds:0, baths:0
};

function Housing({ nav, user, requireAuth, toast, openConversation, openProfile, onEdit }){

  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [q,setQ]=useState('');
  const [location,setLocation]=useState('');
  const [locationResults,setLocationResults]=useState([]);
  const [locationSearching,setLocationSearching]=useState(false);
  const [showLocationResults,setShowLocationResults]=useState(false);
  const [userPos,setUserPos]=useState(null);

  const [saved,setSaved]=useState(()=>new Set());
  const [savedCount,setSavedCount]=useState(0);
  const [shareItem,setShareItem]=useState(null);
  const [detailItem,setDetailItem]=useState(null);
  const [detailTab,setDetailTab]=useState('overview');
  const [manageOpen,setManageOpen]=useState(false);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [deleting,setDeleting]=useState(false);
  const [lightboxIndex,setLightboxIndex]=useState(null);

  const [filters,setFilters]=useState(emptyFilters);
  const [draftFilters,setDraftFilters]=useState(emptyFilters);
  const [filterOpen,setFilterOpen]=useState(false);
  const [sortOpen,setSortOpen]=useState(false);
  const [sort,setSort]=useState('recent');

  const load=()=>{
    setLoading(true);
    api.properties().then(r=>{ setItems(r.properties||[]); setLoading(false); })
      .catch(()=>{ setLoading(false); toast?.('Unable to load housing listings right now.'); });
  };
  useEffect(()=>{ load(); },[]);

  useEffect(()=>{
    if(!user){ setSaved(new Set()); setSavedCount(0); return; }
    api.saved('property').then(r=>{
      setSaved(new Set((r.saved||[]).map(s=>s.contentId)));
      setSavedCount((r.saved||[]).length);
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
    if(!navigator.geolocation){ toast?.('Location is not available on this device/browser.'); return; }
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
    try{ isSaved ? await api.unsave('property',id) : await api.save('property',id); }
    catch{
      setSaved(prev=>{ const next=new Set(prev); isSaved?next.add(id):next.delete(id); return next; });
      setSavedCount(c=>isSaved?c+1:Math.max(0,c-1));
      toast?.('Unable to update saved listings right now.');
    }
  };

  const messageOwner=async(item,e)=>{
    e?.stopPropagation();
    if(!requireAuth())return;
    if(!item.postedByUsername || item.postedByUsername===user?.username){
      toast?.('No owner to message for this listing.');
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
  const callOwner=(item,e)=>{
    e?.stopPropagation();
    if(!item.phone) toast?.('No phone number listed for this property.');
  };

  const closeDetail=()=>{ setDetailItem(null); setManageOpen(false); setConfirmDelete(false); setDetailTab('overview'); setLightboxIndex(null); };
  const editProperty=item=>{ setManageOpen(false); closeDetail(); onEdit?.(item); };

  const confirmDeleteProperty=async()=>{
    if(!detailItem)return;
    setDeleting(true);
    try{
      await api.deleteProperty(detailItem.id);
      setItems(prev=>prev.filter(it=>it.id!==detailItem.id));
      toast?.('Listing deleted');
      closeDetail();
    }catch(err){
      toast?.(err.message||'Unable to delete this listing right now.');
    }finally{
      setDeleting(false);
    }
  };

  const applyFilters=()=>{ setFilters(draftFilters); setFilterOpen(false); };
  const clearFilters=()=>{ setDraftFilters(emptyFilters); setFilters(emptyFilters); };

  const query=q.trim().toLowerCase();
  const locationQuery=location.trim().toLowerCase();

  let filtered=items.filter(it=>{
    const matchesQuery=!query || `${it.title} ${it.description}`.toLowerCase().includes(query);
    const itLocation=String(it.location||'').toLowerCase();
    const matchesLocation=!locationQuery || itLocation.includes(locationQuery) || locationQuery.includes(itLocation);
    const matchesListingType=filters.listingType==='All' || it.listingType===filters.listingType;
    const matchesPropertyType=filters.propertyType==='Any' || it.propertyType===filters.propertyType;
    const matchesFurnish=filters.furnishType==='Any' || it.furnishType===filters.furnishType;
    const price=it.price ?? 0;
    const matchesPrice=price>=filters.priceMin && (filters.priceMax>=100000 || price<=filters.priceMax);
    const matchesBeds=!filters.beds || it.beds>=filters.beds;
    const matchesBaths=!filters.baths || it.baths>=filters.baths;
    const dist=distanceMi(userPos,it);
    const matchesDistance=filters.distance>=100 || dist==null || dist<=filters.distance;
    return matchesQuery && matchesLocation && matchesListingType && matchesPropertyType && matchesFurnish && matchesPrice && matchesBeds && matchesBaths && matchesDistance;
  });

  filtered=[...filtered].sort((a,b)=>{
    if(sort==='price-low')return (a.price||0)-(b.price||0);
    if(sort==='price-high')return (b.price||0)-(a.price||0);
    if(sort==='nearest'){
      const da=distanceMi(userPos,a), db=distanceMi(userPos,b);
      if(da==null)return 1; if(db==null)return -1;
      return da-db;
    }
    return new Date(b.createdAt)-new Date(a.createdAt);
  });

  const activeFilterCount=[
    filters.listingType!=='All', filters.propertyType!=='Any', filters.furnishType!=='Any',
    filters.priceMin>0, filters.priceMax<100000, filters.distance<100, filters.beds>0, filters.baths>0
  ].filter(Boolean).length;

  return (
    <>
      <header className="header housing-header">
        <button onClick={()=>nav('nearby')} aria-label="Back"><ChevronLeft/></button>
        <h1 className="header-title">Housing</h1>
        <div className="home-header-icons">
          <button onClick={()=>{ if(!requireAuth())return; nav('housing-create'); }} aria-label="Post a property">
            <Plus/>
          </button>
          <button className="events-collections-btn" onClick={()=>nav('collections')} aria-label="Collections">
            <Grid2X2 size={16}/><span>{savedCount}</span>
          </button>
        </div>
      </header>

      <main className="inner-page jobs-page housing-page">

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
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search villas / Apartments / Sale Properties"/>
        </div>

        <div className="housing-chip-row">
          <button className={`events-pill ${activeFilterCount?'active':''}`} onClick={()=>{ setDraftFilters(filters); setFilterOpen(true); }}>
            <SlidersHorizontal size={13}/> Filter By {activeFilterCount>0&&`(${activeFilterCount})`} <ChevronDown size={13}/>
          </button>
          {LISTING_TYPES.map(t=>(
            <button
              key={t}
              className={filters.listingType===t?'active':''}
              onClick={()=>setFilters(f=>({...f,listingType:t}))}
            >{t}</button>
          ))}
        </div>

        <h3>{location.trim() ? `Housing in ${location.trim()}` : 'Near You'}</h3>

        {loading&&<div className="empty-profile">Loading listings…</div>}

        {!loading&&!filtered.length&&
          <div className="category-listing-empty">
            <div className="category-listing-empty-icon"><Building2 size={30}/></div>
            <b>No housing listings yet</b>
            <span>{items.length ? 'Try a different search or filter.' : 'Be the first to post a property.'}</span>
            {!items.length&&
              <button className="primary" onClick={()=>{ if(!requireAuth())return; nav('housing-create'); }}>
                <Plus size={16}/> Add Listing
              </button>
            }
          </div>
        }

        <div className="housing-grid">
          {filtered.map(item=>{
            const dist=distanceMi(userPos,item);
            const primaryImage=item.images?.[0]||item.photo;
            return (
              <article className="property-card" key={item.id} onClick={()=>setDetailItem(item)}>
                <div className="property-card-media">
                  {primaryImage
                    ? <img src={primaryImage} alt=""/>
                    : <div className="property-card-media-fallback"><Building2 size={28}/></div>
                  }
                  <button
                    className="property-card-save"
                    onClick={e=>{ e.stopPropagation(); toggleSaved(item.id); }}
                    aria-label={saved.has(item.id)?'Remove saved listing':'Save listing'}
                  >
                    <Bookmark fill={saved.has(item.id)?'currentColor':'none'}/>
                  </button>
                  {item.postedByUsername && item.postedByUsername!==user?.username &&
                    <button className="property-card-message" onClick={e=>messageOwner(item,e)}>Message Owner</button>
                  }
                </div>
                <div className="property-card-body">
                  <div className="property-card-head">
                    <b>{item.title}</b>
                    <span className="property-card-price">
                      {item.price?`$${item.price>=1000?`${Math.round(item.price/1000)}K`:item.price}`:'—'}
                      {item.priceUnit&&<small>/{item.priceUnit.toLowerCase()}</small>}
                    </span>
                  </div>
                  {dist!=null&&<span className="property-card-distance">{dist.toFixed(1)} miles from you</span>}
                  <div className="property-card-meta">
                    {item.beds>0&&<span><BedDouble size={14}/>{item.beds} beds</span>}
                    {item.baths>0&&<span><Bath size={14}/>{item.baths} baths</span>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {filtered.length>0&&
          <button className="housing-sort-fab" onClick={()=>setSortOpen(true)}>
            <ArrowUpDown size={15}/> Sorting
          </button>
        }

      </main>

      {filterOpen&&
        <div className="backdrop" onClick={()=>setFilterOpen(false)}>
          <div className="jobs-filter-sheet" onClick={e=>e.stopPropagation()}>
            <div className="jobs-filter-head">
              <button onClick={()=>setFilterOpen(false)} aria-label="Close"><X size={20}/></button>
              <b>Filters</b>
              <span/>
            </div>

            <span className="filter-group-label">Listing Type</span>
            <div className="filter-chip-row">
              {LISTING_TYPES.map(t=>(
                <button key={t} className={draftFilters.listingType===t?'active':''} onClick={()=>setDraftFilters(f=>({...f,listingType:t}))}>{t}</button>
              ))}
            </div>

            <span className="filter-group-label">Price Range (${draftFilters.priceMin.toLocaleString()} – ${draftFilters.priceMax.toLocaleString()})</span>
            <div className="dual-range">
              <input type="range" min="0" max="100000" step="500" value={draftFilters.priceMin}
                onChange={e=>setDraftFilters(f=>({...f,priceMin:Math.min(Number(e.target.value),f.priceMax)}))}/>
              <input type="range" min="0" max="100000" step="500" value={draftFilters.priceMax}
                onChange={e=>setDraftFilters(f=>({...f,priceMax:Math.max(Number(e.target.value),f.priceMin)}))}/>
            </div>

            <span className="filter-group-label">Within Distance ({draftFilters.distance>=100?'Any':`${draftFilters.distance} miles`})</span>
            <input type="range" min="1" max="100" step="1" className="single-range" value={draftFilters.distance}
              onChange={e=>setDraftFilters(f=>({...f,distance:Number(e.target.value)}))}/>

            <span className="filter-group-label">Features</span>
            <div className="stepper-row">
              <span>Beds</span>
              <div className="stepper">
                <button type="button" onClick={()=>setDraftFilters(f=>({...f,beds:Math.max(0,f.beds-1)}))}>−</button>
                <b>{draftFilters.beds}</b>
                <button type="button" onClick={()=>setDraftFilters(f=>({...f,beds:f.beds+1}))}>+</button>
              </div>
            </div>
            <div className="stepper-row">
              <span>Baths</span>
              <div className="stepper">
                <button type="button" onClick={()=>setDraftFilters(f=>({...f,baths:Math.max(0,f.baths-1)}))}>−</button>
                <b>{draftFilters.baths}</b>
                <button type="button" onClick={()=>setDraftFilters(f=>({...f,baths:f.baths+1}))}>+</button>
              </div>
            </div>

            <span className="filter-group-label">Property Type</span>
            <div className="filter-chip-row">
              {PROPERTY_TYPES.map(t=>(
                <button key={t} className={draftFilters.propertyType===t?'active':''} onClick={()=>setDraftFilters(f=>({...f,propertyType:t}))}>{t}</button>
              ))}
            </div>

            <span className="filter-group-label">Furnished Type</span>
            <div className="filter-chip-row">
              {FURNISH_TYPES.map(t=>(
                <button key={t} className={draftFilters.furnishType===t?'active':''} onClick={()=>setDraftFilters(f=>({...f,furnishType:t}))}>{t}</button>
              ))}
            </div>

            <div className="jobs-filter-footer">
              <button className="outline" onClick={clearFilters}>Reset</button>
              <button className="primary" onClick={applyFilters}>Apply Filters</button>
            </div>
          </div>
        </div>
      }

      {sortOpen&&
        <div className="backdrop" onClick={()=>setSortOpen(false)}>
          <div className="bottom-sheet" onClick={e=>e.stopPropagation()}>
            <div className="sheet-handle"/>
            <b className="sort-sheet-title">Sort By</b>
            {SORTS.map(([value,label])=>(
              <button key={value} className={sort===value?'active':''} onClick={()=>{
                if(value==='nearest'&&!userPos){ useCurrentLocation(); }
                setSort(value); setSortOpen(false);
              }}>
                <ArrowUpDown size={16}/><span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      }

      {detailItem&&
        <div className="backdrop" onClick={closeDetail}>
          <div className="job-detail-sheet housing-detail-sheet" onClick={e=>e.stopPropagation()}>
            <div className="housing-detail-media">
              {(detailItem.images?.[0]||detailItem.photo)
                ? <img src={detailItem.images?.[0]||detailItem.photo} alt="" onClick={()=>setLightboxIndex(0)} style={{cursor:'zoom-in'}}/>
                : <div className="property-card-media-fallback"><Building2 size={40}/></div>
              }
              <div className="housing-detail-toolbar">
                <button className="close" onClick={closeDetail} aria-label="Close"><ChevronLeft/></button>
                <div className="housing-detail-toolbar-right">
                  <button
                    className="category-listing-detail-save"
                    onClick={()=>toggleSaved(detailItem.id)}
                    aria-label={saved.has(detailItem.id)?'Remove saved listing':'Save listing'}
                  >
                    <Bookmark fill={saved.has(detailItem.id)?'currentColor':'none'}/>
                  </button>
                  <button className="category-listing-detail-save" onClick={()=>setShareItem(detailItem)} aria-label="Share">
                    <Share2/>
                  </button>
                  {detailItem.postedByUsername===user?.username&&
                    <button className="category-listing-manage housing-manage" onClick={()=>setManageOpen(v=>!v)} aria-label="Manage listing">
                      <MoreVertical/>
                    </button>
                  }
                  {manageOpen&&
                    <div className="context-menu category-listing-manage-menu housing-manage-menu" onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>editProperty(detailItem)}><Edit3 size={16}/> Edit Listing</button>
                      <button className="danger" onClick={()=>{ setManageOpen(false); setConfirmDelete(true); }}><Trash2 size={16}/> Delete Listing</button>
                    </div>
                  }
                </div>
              </div>
              <div className="housing-detail-media-info">
                <b>{detailItem.title}</b>
                <span className="housing-detail-price">
                  {detailItem.price?`$${detailItem.price.toLocaleString()}`:'Price on request'}
                </span>
                {distanceMi(userPos,detailItem)!=null&&
                  <span className="housing-detail-distance"><MapPin size={12}/>{distanceMi(userPos,detailItem).toFixed(1)} Miles Away</span>
                }
              </div>
            </div>

            <div className="provider-profile-tabs housing-detail-tabs">
              <button className={detailTab==='overview'?'active':''} onClick={()=>setDetailTab('overview')}>Overview</button>
              <button className={detailTab==='details'?'active':''} onClick={()=>setDetailTab('details')}>Details</button>
            </div>

            {detailTab==='overview'&&
              <>
                <div className="job-detail-section">
                  <b>Description</b>
                  <p>{detailItem.description||'No description provided.'}</p>
                  <small className="housing-listed-date">Listed: {new Date(detailItem.createdAt).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}</small>
                </div>

                <div className="job-detail-section">
                  <b>Location</b>
                  <div className="housing-map-placeholder"><MapPin size={22}/></div>
                  <p><MapPin size={14}/>{detailItem.address||detailItem.location}</p>
                </div>

                {detailItem.postedByUsername&&
                  <div className="housing-posted-by">
                    <b>Posted by</b>
                    <div className="housing-posted-by-row">
                      <div className="housing-posted-by-identity">
                        <div className="housing-posted-by-avatar">{(detailItem.postedByUsername||'?')[0].toUpperCase()}</div>
                        <span>{detailItem.postedByUsername}</span>
                      </div>
                      <button className="outline" onClick={()=>openProfile?.(detailItem.postedByUsername)}>View Profile</button>
                    </div>
                  </div>
                }

                {(detailItem.images?.length>0||detailItem.photo)&&
                  <div className="job-detail-section">
                    <b>Photos</b>
                    <div className="housing-photos-row">
                      {(detailItem.images?.length>0?detailItem.images:[detailItem.photo]).map((src,i)=>(
                        <img key={i} src={src} alt="" onClick={()=>setLightboxIndex(i)}/>
                      ))}
                    </div>
                  </div>
                }
              </>
            }

            {detailTab==='details'&&
              <div className="job-detail-section housing-details-grid">
                <div><span>Property Type</span><b>{detailItem.propertyType||'—'}</b></div>
                <div><span>Listing Type</span><b>{detailItem.listingType||'—'}</b></div>
                <div><span>Beds</span><b>{detailItem.beds||0}</b></div>
                <div><span>Baths</span><b>{detailItem.baths||0}</b></div>
                <div><span>Size</span><b>{detailItem.sizeSqft?`${detailItem.sizeSqft} sq ft`:'—'}</b></div>
                <div><span>Furnish Type</span><b>{detailItem.furnishType||'—'}</b></div>
                <div><span>Pets Allowed</span><b>{detailItem.petsAllowed?'Yes':'No'}</b></div>
                <div><span>Smoking Allowed</span><b>{detailItem.smokingAllowed?'Yes':'No'}</b></div>
                {detailItem.languages&&<div><span>Languages</span><b>{detailItem.languages}</b></div>}
              </div>
            }

            <div className="job-detail-actions">
              <button onClick={e=>messageOwner(detailItem,e)}><MessageCircle size={16}/>Message Now</button>
              {callTarget(detailItem) ? (
                <a className="primary" href={callTarget(detailItem)}><Phone size={16}/>Call Now</a>
              ) : (
                <button className="primary" onClick={e=>callOwner(detailItem,e)}><Phone size={16}/>Call Now</button>
              )}
            </div>

            {confirmDelete&&
              <div className="backdrop" onClick={()=>setConfirmDelete(false)}>
                <div className="confirm-sheet" onClick={e=>e.stopPropagation()}>
                  <h2 className="danger-text">Delete {detailItem.title}?</h2>
                  <p>This removes the listing permanently. This can't be undone.</p>
                  <div className="confirm-sheet-actions">
                    <button className="outline" onClick={()=>setConfirmDelete(false)} disabled={deleting}>Cancel</button>
                    <button className="primary danger-button" onClick={confirmDeleteProperty} disabled={deleting}>{deleting?'Deleting…':'Delete'}</button>
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
          url={`${window.location.origin}/housing/${shareItem.id}`}
          close={()=>setShareItem(null)}
          onSent={(conversationId,convoUser)=>openConversation?.(conversationId,convoUser)}
          requireAuth={requireAuth}
        />
      }

      {lightboxIndex!=null&&detailItem&&(()=>{
        const photos=detailItem.images?.length>0?detailItem.images:[detailItem.photo].filter(Boolean);
        if(!photos.length)return null;
        const idx=((lightboxIndex%photos.length)+photos.length)%photos.length;
        return (
          <div className="housing-lightbox" onClick={()=>setLightboxIndex(null)}>
            <button className="housing-lightbox-close" onClick={()=>setLightboxIndex(null)} aria-label="Close photo"><X/></button>
            <img src={photos[idx]} alt="" onClick={e=>e.stopPropagation()}/>
            {photos.length>1&&
              <>
                <button className="housing-lightbox-nav prev" onClick={e=>{ e.stopPropagation(); setLightboxIndex(idx-1); }} aria-label="Previous photo"><ChevronLeft/></button>
                <button className="housing-lightbox-nav next" onClick={e=>{ e.stopPropagation(); setLightboxIndex(idx+1); }} aria-label="Next photo"><ChevronRight/></button>
                <div className="housing-lightbox-count">{idx+1} / {photos.length}</div>
              </>
            }
          </div>
        );
      })()}
    </>
  );
}

export default Housing;
