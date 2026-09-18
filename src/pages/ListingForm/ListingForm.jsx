import { React, useState, useEffect } from '../../shared/deps.js';
import { ChevronLeft, Camera, MapPin } from 'lucide-react';
import { api } from '../../api.js';
import ImageCropModal from '../../components/ImageCropModal/ImageCropModal.jsx';

// Defined at module scope (not inside ListingForm) so it keeps a stable
// component identity across renders — a component redefined inside a
// parent's render body causes React to remount the subtree on every
// keystroke, which is what breaks input focus.
const Field=({label,required,children})=><label className="form-field"><span>{label}{required?' *':''}</span>{children}</label>;

export default function ListingForm({ category, editItem, toast, onDone, onCreated, onUpdated }) {
  const [d,setD]=useState(()=>editItem
    ? { title:editItem.title||'', description:editItem.description||'', phone:editItem.phone||'', location:editItem.location||'', lat:editItem.lat??null, lon:editItem.lon??null, price:editItem.price||'' }
    : { title:'', description:'', phone:'', location:'', lat:null, lon:null, price:'' }
  );
  const [photo,setPhoto]=useState(editItem?.photo||'');
  const [cropSrc,setCropSrc]=useState('');
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

  const submit=async e=>{
    e.preventDefault(); setError('');
    if(!d.title.trim()||!d.description.trim()||!d.location.trim()){ setError('Please complete all required fields.'); return; }
    setBusy(true);
    try{
      if(editItem){
        const result=await api.updateListing(editItem.id,{...d,photo});
        toast?.(`${category} listing updated`);
        onUpdated?.(result.listing);
      }else{
        const result=await api.createListing({...d,category,photo});
        toast?.(`${category} listing posted successfully`);
        onCreated?.(result.listing);
      }
      onDone?.();
    }catch(err){ setError(err.message); }
    finally{ setBusy(false); }
  };

  return <>
    <header className="header listing-form-header">
      <button type="button" onClick={()=>onDone?.()} aria-label="Back"><ChevronLeft/></button>
      <h1 className="header-title">{editItem?`Edit ${category}`:`Add ${category}`}</h1>
      <button className="form-top-action push-right" type="button" onClick={submit}>{editItem?'Save':'Post'}</button>
    </header>
    <main className="form-page event-form-page">
    <form onSubmit={submit}>
      <Field label="Name" required><input value={d.title} onChange={e=>set('title',e.target.value)} placeholder={`e.g. ${category} name`} maxLength={80}/></Field>
      <Field label="Description" required><textarea value={d.description} onChange={e=>set('description',e.target.value)} placeholder={`Describe this ${category.toLowerCase()}...`} maxLength={1500}/></Field>
      <Field label="Phone Number"><input type="tel" value={d.phone} onChange={e=>set('phone',e.target.value)} placeholder="+1234567890"/></Field>
      <Field label="Price / Pricing"><input value={d.price} onChange={e=>set('price',e.target.value)} placeholder="e.g. $$ or From $20"/></Field>

      <Field label="Location" required>
        <div className="jobs-location-wrap">
          <input
            value={d.location}
            onChange={e=>{ set('location',e.target.value); setShowLocationResults(true); }}
            onFocus={()=>setShowLocationResults(true)}
            placeholder="Search address, area, landmark..."
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

      <label className="photo-upload">
        <span>Photo</span>
        <div onClick={()=>document.getElementById('listing-photo-input').click()}>
          {photo ? <img className="photo-upload-preview" src={photo} alt=""/> : <Camera/>}
          <span>{photo?'Photo selected':'Add a photo (optional)'}</span>
        </div>
        <input
          id="listing-photo-input"
          hidden
          type="file"
          accept="image/*"
          onChange={e=>{
            const f=e.target.files?.[0];
            if(!f)return;
            const r=new FileReader();
            r.onload=()=>setCropSrc(r.result);
            r.readAsDataURL(f);
            e.target.value='';
          }}
        />
      </label>

      {error&&<div className="error" role="alert">{error}</div>}
      <button className="primary" type="submit" disabled={busy}>
        {busy ? (editItem?'Saving…':'Posting…') : (editItem?'Save Changes':`Post ${category}`)}
      </button>
    </form>
    </main>

    {cropSrc&&
      <ImageCropModal
        src={cropSrc}
        onCancel={()=>setCropSrc('')}
        onCropped={dataUrl=>{ setPhoto(dataUrl); setCropSrc(''); }}
      />
    }
  </>;
}
