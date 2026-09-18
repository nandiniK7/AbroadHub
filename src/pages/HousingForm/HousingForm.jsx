import { React, useState, useEffect } from '../../shared/deps.js';
import { ChevronLeft, Camera, MapPin, X } from 'lucide-react';
import { api } from '../../api.js';

// Defined at module scope (not inside HousingForm) so it keeps a stable
// component identity across renders — a component redefined inside a
// parent's render body causes React to remount the subtree on every
// keystroke, which is what breaks input focus.
const Field=({label,required,children})=><label className="form-field"><span>{label}{required?' *':''}</span>{children}</label>;

const LISTING_TYPES=['Offering Rent','Seeking Rent','For Sale'];
const PROPERTY_TYPES=['Apartment','House','Townhouse','Condo','Single Room'];
const PRICE_UNITS=['Monthly','Weekly','One-time'];
const FURNISH_TYPES=['Furnished','Un Furnished','Semi-Furnished'];
const LANGUAGES=['English','Spanish','Hindi','Telugu','Tamil','Kannada','Malayalam','Bengali','Marathi','Gujarati','Punjabi','French','German','Mandarin','Arabic'];
const MAX_LANGUAGES=3;
const MAX_PHOTOS=8;

export default function HousingForm({ editItem, toast, onDone }) {
  const [d,setD]=useState(()=>editItem
    ? {
        title:editItem.title||'', listingType:editItem.listingType||LISTING_TYPES[0], propertyType:editItem.propertyType||PROPERTY_TYPES[0],
        description:editItem.description||'', sizeSqft:editItem.sizeSqft||'', beds:editItem.beds||0, baths:editItem.baths||0,
        price:editItem.price||'', priceUnit:editItem.priceUnit||PRICE_UNITS[0], furnishType:editItem.furnishType||FURNISH_TYPES[0],
        location:editItem.location||'', lat:editItem.lat??null, lon:editItem.lon??null, address:editItem.address||'',
        phone:editItem.phone||'', petsAllowed:!!editItem.petsAllowed, smokingAllowed:!!editItem.smokingAllowed
      }
    : {
        title:'', listingType:LISTING_TYPES[0], propertyType:PROPERTY_TYPES[0],
        description:'', sizeSqft:'', beds:0, baths:0,
        price:'', priceUnit:PRICE_UNITS[0], furnishType:FURNISH_TYPES[0],
        location:'', lat:null, lon:null, address:'',
        phone:'', petsAllowed:false, smokingAllowed:false
      }
  );
  const [langs,setLangs]=useState(editItem?.languages?editItem.languages.split(', ').filter(Boolean):[]);
  const [langOpen,setLangOpen]=useState(false);
  const [photos,setPhotos]=useState(()=>{
    if(editItem?.images?.length)return editItem.images;
    if(editItem?.photo)return [editItem.photo];
    return [];
  });
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [locationResults,setLocationResults]=useState([]);
  const [locationSearching,setLocationSearching]=useState(false);
  const [showLocationResults,setShowLocationResults]=useState(false);

  const set=(k,v)=>setD(x=>({...x,[k]:v}));

  useEffect(()=>{
    const value=d.location.trim();
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
  },[d.location]);

  const toggleLang=l=>{
    setLangs(x=>{
      if(x.includes(l))return x.filter(v=>v!==l);
      if(x.length>=MAX_LANGUAGES){ toast?.(`You can select up to ${MAX_LANGUAGES} languages.`); return x; }
      return [...x,l];
    });
  };

  const submit=async e=>{
    e.preventDefault(); setError('');
    if(!d.title.trim()||!d.propertyType||!d.beds||!d.baths||!d.price||!d.priceUnit||!d.furnishType||!d.location.trim()){
      setError('Please complete all required fields.');
      return;
    }
    if(!photos.length){
      setError('Please add at least one photo.');
      return;
    }
    setBusy(true);
    try{
      const payload={...d,images:photos,photo:photos[0],languages:langs.join(', ')};
      if(editItem){
        const result=await api.updateProperty(editItem.id,payload);
        toast?.('Listing updated');
      }else{
        const result=await api.createProperty(payload);
        toast?.('Property listing posted successfully');
      }
      onDone?.();
    }catch(err){ setError(err.message); }
    finally{ setBusy(false); }
  };

  return <>
    <header className="header listing-form-header">
      <button type="button" onClick={()=>onDone?.()} aria-label="Back"><ChevronLeft/></button>
      <h1 className="header-title">Property Listing</h1>
      <button className="form-top-action push-right" type="button" onClick={submit}>{editItem?'Save':'Post'}</button>
    </header>
    <main className="form-page event-form-page">
      <form onSubmit={submit}>
        <Field label="Property Title" required><input value={d.title} onChange={e=>set('title',e.target.value)} placeholder="e.g. 2BHK Apartment in Downtown" maxLength={80}/></Field>
        <Field label="Listing Type" required><select value={d.listingType} onChange={e=>set('listingType',e.target.value)}>{LISTING_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
        <Field label="Property Type" required><select value={d.propertyType} onChange={e=>set('propertyType',e.target.value)}>{PROPERTY_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
        <Field label="Description"><textarea value={d.description} onChange={e=>set('description',e.target.value)} placeholder="Describe the property..." maxLength={1500}/></Field>
        <Field label="Property Size (sq ft)"><input type="number" min="0" value={d.sizeSqft} onChange={e=>set('sizeSqft',e.target.value)} placeholder="e.g. 1100"/></Field>

        <div className="housing-form-row">
          <Field label="Beds" required><input type="number" min="0" value={d.beds} onChange={e=>set('beds',Number(e.target.value))}/></Field>
          <Field label="Baths" required><input type="number" min="0" value={d.baths} onChange={e=>set('baths',Number(e.target.value))}/></Field>
        </div>

        <Field label="Price" required><input type="number" min="0" value={d.price} onChange={e=>set('price',e.target.value)} placeholder="e.g. 35000"/></Field>
        <Field label="Price Unit" required><select value={d.priceUnit} onChange={e=>set('priceUnit',e.target.value)}>{PRICE_UNITS.map(t=><option key={t}>{t}</option>)}</select></Field>
        <Field label="Furnish Type" required><select value={d.furnishType} onChange={e=>set('furnishType',e.target.value)}>{FURNISH_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>

        <Field label="Search Property Location" required>
          <div className="jobs-location-wrap">
            <input
              value={d.location}
              onChange={e=>{ set('location',e.target.value); setShowLocationResults(true); }}
              onFocus={()=>setShowLocationResults(true)}
              placeholder="Search by area, landmark, colony..."
            />
            {showLocationResults&&(d.location.trim().length>=2||locationSearching)&&(
              <div className="location-results">
                {locationSearching&&<div className="location-result muted">Searching…</div>}
                {!locationSearching&&locationResults.map(item=>(
                  <button type="button" className="location-result" key={item.place_id} onClick={()=>{ setD(x=>({...x,location:item.display_name,lat:Number(item.lat),lon:Number(item.lon)})); setShowLocationResults(false); }}>
                    <MapPin size={16}/><span>{item.display_name}</span>
                  </button>
                ))}
                {!locationSearching&&!locationResults.length&&<div className="location-result muted">No matching locations found.</div>}
              </div>
            )}
          </div>
        </Field>

        <Field label="Full Address"><input value={d.address} onChange={e=>set('address',e.target.value)} placeholder="Street, building, apartment no., etc."/></Field>
        <Field label="Phone Number"><input type="tel" value={d.phone} onChange={e=>set('phone',e.target.value)} placeholder="+1234567890"/></Field>

        <span className="filter-group-label">Features</span>
        <div className="housing-toggle-row">
          <label className={`event-toggle-row ${d.petsAllowed?'on':''}`}>
            <span>Pets Allowed</span>
            <button type="button" className="event-toggle-switch" role="switch" aria-checked={d.petsAllowed} onClick={()=>set('petsAllowed',!d.petsAllowed)}><span className="event-toggle-knob"/></button>
          </label>
          <label className={`event-toggle-row ${d.smokingAllowed?'on':''}`}>
            <span>Smoking Allowed</span>
            <button type="button" className="event-toggle-switch" role="switch" aria-checked={d.smokingAllowed} onClick={()=>set('smokingAllowed',!d.smokingAllowed)}><span className="event-toggle-knob"/></button>
          </label>
        </div>

        <Field label="I can speak">
          <div className="lang-picker">
            <button type="button" className="lang-picker-trigger" onClick={()=>setLangOpen(v=>!v)}>
              {langs.length?`${langs.length} selected`:'Select languages'}
            </button>
            {langs.length>0&&
              <div className="lang-chips">
                {langs.map(l=>(
                  <span className="lang-chip" key={l}>{l}<button type="button" onClick={()=>toggleLang(l)} aria-label={`Remove ${l}`}><X size={12}/></button></span>
                ))}
              </div>
            }
            {langOpen&&
              <div className="lang-picker-panel">
                {LANGUAGES.map(l=>(
                  <label className="lang-picker-option" key={l}>
                    <input type="checkbox" checked={langs.includes(l)} onChange={()=>toggleLang(l)} disabled={!langs.includes(l)&&langs.length>=MAX_LANGUAGES}/>
                    {l}
                  </label>
                ))}
              </div>
            }
          </div>
        </Field>

        <Field label="Photos" required>
          <div className="multi-photo-grid">
            {photos.map((src,i)=>(
              <div className="multi-photo-thumb" key={i}>
                <img src={src} alt=""/>
                {i===0&&<span className="multi-photo-primary-badge">Primary</span>}
                <button type="button" className="multi-photo-remove" aria-label="Remove photo" onClick={()=>setPhotos(x=>x.filter((_,idx)=>idx!==i))}><X size={14}/></button>
              </div>
            ))}
            {photos.length<MAX_PHOTOS&&
              <div className="multi-photo-add" onClick={()=>document.getElementById('housing-photo-input').click()}>
                <Camera/>
                <span>Add Photos</span>
              </div>
            }
          </div>
          <input
            id="housing-photo-input"
            hidden
            type="file"
            accept="image/*"
            multiple
            onChange={e=>{
              const files=Array.from(e.target.files||[]).slice(0,MAX_PHOTOS-photos.length);
              e.target.value='';
              if(!files.length)return;
              Promise.all(files.map(f=>new Promise((resolve,reject)=>{
                const r=new FileReader();
                r.onload=()=>resolve(r.result);
                r.onerror=reject;
                r.readAsDataURL(f);
              }))).then(results=>{
                setPhotos(x=>[...x,...results].slice(0,MAX_PHOTOS));
              });
            }}
          />
        </Field>

        {error&&<div className="error" role="alert">{error}</div>}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? (editItem?'Saving…':'Posting…') : (editItem?'Save Changes':'Post Listing')}
        </button>
      </form>
    </main>
  </>;
}
