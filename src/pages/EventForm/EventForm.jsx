import { React, useState, useEffect } from '../../shared/deps.js';
import { ChevronLeft, CalendarDays, Camera, X, MapPin } from 'lucide-react';
import { api } from '../../api.js';

// Defined at module scope (not inside EventForm) so it keeps a stable
// component identity across renders — defining it inside the component
// body was the root cause of inputs losing focus after every keystroke
// (React remounted the whole subtree because "Field" was a new function
// on every render).
const Field=({label,required,children})=><label className="form-field"><span>{label}{required?' *':''}</span>{children}</label>;

const EVENT_TYPES=['Party & NightLife','Cultural & Festival','Business & Networking','Workshops & Classes','Comedy','Music & Concert','Sports','Travel & Outdoor','Education & Job'];
const AUDIENCES=['All','Adults','Kids','Family'];
const LANGUAGES=['English','Spanish','Hindi','Telugu','Tamil','Kannada','Malayalam','Bengali','Marathi','Gujarati','Punjabi','French','German','Mandarin','Arabic'];
const MAX_LANGUAGES=3;

export default function EventForm({ toast, onDone, onCreated }) {
  const [d,setD]=useState({ name:'', type:EVENT_TYPES[0], description:'', mode:'Offline', audience:'All', start:'', end:'', phone:'', venue:'', lat:null, lon:null, instructions:'', website:'', booking:'' });
  const [price,setPrice]=useState('');
  const [langs,setLangs]=useState([]);
  const [langOpen,setLangOpen]=useState(false);
  const [paid,setPaid]=useState(false); const [photo,setPhoto]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const [venueResults,setVenueResults]=useState([]);
  const [venueSearching,setVenueSearching]=useState(false);
  const [showVenueResults,setShowVenueResults]=useState(false);

  const set=(k,v)=>setD(x=>({...x,[k]:v}));

  useEffect(()=>{
    const value=d.venue.trim();
    if(!value||value.length<2){ setVenueResults([]); return; }
    const timer=setTimeout(async()=>{
      try{
        setVenueSearching(true);
        const res=await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(value)}`);
        const data=await res.json();
        setVenueResults(Array.isArray(data)?data:[]);
      }catch{ setVenueResults([]); }
      finally{ setVenueSearching(false); }
    },450);
    return ()=>clearTimeout(timer);
  },[d.venue]);

  const toggleLang=l=>{
    setLangs(x=>{
      if(x.includes(l))return x.filter(v=>v!==l);
      if(x.length>=MAX_LANGUAGES){ toast?.(`You can select up to ${MAX_LANGUAGES} languages.`); return x; }
      return [...x,l];
    });
  };

  const submit=async e=>{
    e.preventDefault(); setError('');
    if(!d.name.trim()||!d.type||!d.description.trim()||!d.start||!d.phone.trim()||!d.venue.trim()){setError('Please complete all required fields.');return;}
    setBusy(true);
    try{
      const result=await api.createEvent({...d,paid,price:paid?price:null,photo,languages:langs.join(', ')});
      toast?.('Event posted successfully');
      onCreated?.(result.event);
      onDone?.();
    }catch(err){setError(err.message)}
    finally{setBusy(false)}
  };

  return <main className="form-page event-form-page">
    <div className="inner-header"><button type="button" onClick={()=>onDone?.()} aria-label="Back"><ChevronLeft/></button><button className="form-top-action push-right" type="button" onClick={submit}>Post</button></div>
    <form onSubmit={submit}>
      <Field label="Event Name" required><input value={d.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Startup Networking Night" maxLength={50}/></Field>
      <Field label="Event Type" required><select value={d.type} onChange={e=>set('type',e.target.value)}>{EVENT_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
      <Field label="Description" required><textarea value={d.description} onChange={e=>set('description',e.target.value)} placeholder="Describe the event..." maxLength={1500}/></Field>
      <Field label="Event Mode" required><select value={d.mode} onChange={e=>set('mode',e.target.value)}><option>Offline</option><option>Online</option><option>Hybrid</option></select></Field>
      <Field label="Audience Type" required><select value={d.audience} onChange={e=>set('audience',e.target.value)}>{AUDIENCES.map(a=><option key={a}>{a}</option>)}</select></Field>
      <label className={`event-toggle-row ${paid?'on':''}`}><span>It's Paid</span><button type="button" className="event-toggle-switch" role="switch" aria-checked={paid} onClick={()=>setPaid(v=>!v)}><span className="event-toggle-knob"/></button></label>
      {paid&&<Field label="Price (USD)" required><input type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} placeholder="e.g. 25"/></Field>}
      <Field label="Start Date & Time" required><div className="input-with-icon"><input type="datetime-local" value={d.start} onChange={e=>set('start',e.target.value)}/><CalendarDays/></div></Field>
      <Field label="End Date & Time"><div className="input-with-icon"><input type="datetime-local" value={d.end} onChange={e=>set('end',e.target.value)}/><CalendarDays/></div></Field>
      <Field label="Phone Number" required><input type="tel" value={d.phone} onChange={e=>set('phone',e.target.value)} placeholder="+1234567890"/></Field>

      <Field label="Search Venue Location" required>
        <div className="jobs-location-wrap">
          <input
            value={d.venue}
            onChange={e=>{ set('venue',e.target.value); setShowVenueResults(true); }}
            onFocus={()=>setShowVenueResults(true)}
            placeholder="Search by name, college, landmark..."
          />
          {showVenueResults&&(d.venue.trim().length>=2||venueSearching)&&(
            <div className="location-results">
              {venueSearching&&<div className="location-result muted">Searching…</div>}
              {!venueSearching&&venueResults.map(item=>(
                <button type="button" className="location-result" key={item.place_id} onClick={()=>{ setD(x=>({...x,venue:item.display_name,lat:Number(item.lat),lon:Number(item.lon)})); setShowVenueResults(false); }}>
                  <MapPin size={16}/><span>{item.display_name}</span>
                </button>
              ))}
              {!venueSearching&&!venueResults.length&&<div className="location-result muted">No matching locations found.</div>}
            </div>
          )}
        </div>
      </Field>

      <Field label="Instructions"><input value={d.instructions} onChange={e=>set('instructions',e.target.value)} placeholder="Street, building, floor, etc."/></Field>
      <Field label="Website URL"><input type="url" value={d.website} onChange={e=>set('website',e.target.value)} placeholder="https://..."/></Field>
      <Field label="Booking Link"><input type="url" value={d.booking} onChange={e=>set('booking',e.target.value)} placeholder="https://..."/></Field>

      <Field label={`Languages hosted in (max ${MAX_LANGUAGES})`}>
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

      <label className="photo-upload">
        <span>Photos *</span>
        <div onClick={()=>document.getElementById('event-photo-input').click()}>
          {photo ? <img className="photo-upload-preview" src={photo} alt=""/> : <Camera/>}
          <span>{photo?'Photo selected':'Add event photo'}</span>
        </div>
        <input id="event-photo-input" hidden type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>setPhoto(r.result);r.readAsDataURL(f)}}/>
      </label>

      {error&&<div className="error" role="alert">{error}</div>}
      <button className="primary" type="submit" disabled={busy}>{busy?'Posting…':'Post Event'}</button>
    </form>
  </main>;
}
