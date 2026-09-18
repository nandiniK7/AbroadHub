import Avatar from '../../components/Avatar/Avatar.jsx';
import { api } from '../../api.js';
import { React, useEffect, useMemo, useRef, useState, Plus, Bell, MessageCircle, MoreVertical, Heart, Search, BriefcaseBusiness, MapPin, UserCircle, Compass, HomeIcon, ChevronLeft, Edit3, Camera, ImageIcon, CalendarDays, Building2, X, Send, Bookmark, Share2, Users, Settings, LogOut, ChevronRight, Check, Trash2, Menu, Globe, Phone, Mail, Lock, Eye, EyeOff, Upload, SlidersHorizontal, ArrowLeft, UserPlus, MapPinned, LocateFixed, Sparkles, Sprout, ShoppingBag, ShoppingCart, HeartPulse, ShieldCheck, Scale, Flag, Utensils, Grid2X2, CORAL, festival, wordmark, splashLogo, categories, providers, seedJobs, seedPosts, seedNotifs, seedChats, load, save } from '../../shared/deps.js';

function EditProfile({
  user,
  setUser,
  onBack
}){

  const input=useRef(null);

  const [d,setD]=useState({
    name:'',
    username:'',
    email:'',
    phone:'',
    bio:'',
    website:'',
    country:'India',
    gender:'',
    occupation:'',
    languages:'',
    location:'',
    lat:null,
    lon:null,
    ...(user||{})
  });

  const [photo,setPhoto]=useState(
    user?.avatar || user?.profilePhoto || ''
  );

  const [saved,setSaved]=useState(false);
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);

  const [locationResults,setLocationResults]=useState([]);
  const [locationSearching,setLocationSearching]=useState(false);
  const [showLocationResults,setShowLocationResults]=useState(false);

  useEffect(()=>{
    const value=(d.location||'').trim();
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

  const useCurrentLocation=()=>{
    if(!navigator.geolocation)return;
    navigator.geolocation.getCurrentPosition(
      async pos=>{
        try{
          const res=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          const data=await res.json();
          setD(x=>({...x,location:data.display_name||`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,lat:pos.coords.latitude,lon:pos.coords.longitude}));
        }catch{
          setD(x=>({...x,location:`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,lat:pos.coords.latitude,lon:pos.coords.longitude}));
        }
        setSaved(false);
        setShowLocationResults(false);
      },
      ()=>{},
      {enableHighAccuracy:true,timeout:10000}
    );
  };

  const choosePhoto=e=>{
    const f=e.target.files?.[0];
    if(!f)return;
    if(!f.type.startsWith('image/'))return;

    const reader=new FileReader();
    reader.onload=()=>{
      setPhoto(reader.result);
      setSaved(false);
    };
    reader.readAsDataURL(f);
  };

  const update=(key,value)=>{
    setD(prev=>({
      ...prev,
      [key]:value
    }));
    setSaved(false);
  };

  const saveChanges=async()=>{
    const updated={
      ...d,
      avatar:photo || '',
      profilePhoto:photo || ''
    };

    setError('');
    setSaving(true);

    try{
      const result=await api.updateProfile(updated);
      setUser(result.user);
      save('ah_currentUser',result.user);
      setSaved(true);
      setTimeout(()=>onBack(),350);
    }catch(err){
      setSaved(false);
      setError(
        err.status===401
          ? 'Your session has expired. Please log in again to save changes.'
          : (err.message || 'Unable to save profile. Please try again.')
      );
    }finally{
      setSaving(false);
    }
  };

  const rowsBeforeGender=[
    ['Name','name'],
    ['Username','username'],
    ['Email','email','locked'],
    ['Phone','phone'],
    ['Bio','bio'],
    ['Website','website'],
    ['Country','country','locked']
  ];

  const rowsAfterGender=[
    ['Occupation','occupation'],
    ['Languages','languages']
  ];

  const GENDER_OPTIONS=['Female','Male','Other'];

  return (
    <main className="edit-profile-page">

      <div className="edit-profile-header">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
        >
          <ChevronLeft/>
        </button>
        <h1>Edit Profile</h1>
      </div>

      <div className="edit-profile-photo-section">
        <button
          type="button"
          className="edit-profile-photo-button"
          onClick={()=>input.current?.click()}
          aria-label="Change profile picture"
        >
          <Avatar
            src={photo}
            text={d.name}
          />
        </button>

        <input
          hidden
          ref={input}
          type="file"
          accept="image/*"
          onChange={choosePhoto}
        />

        <button
          type="button"
          className="edit-profile-picture-link"
          onClick={()=>input.current?.click()}
        >
          Edit profile picture
        </button>

        {photo&&
          <button
            type="button"
            className="remove-profile-photo-link"
            onClick={()=>{
              setPhoto('');
              if(input.current)input.current.value='';
              setSaved(false);
            }}
          >
            Remove photo
          </button>
        }
      </div>

      <div className="profile-edit-fields">
        {rowsBeforeGender.map(([label,key,locked])=>(
          <label
            key={key}
            className={`profile-edit-row ${locked?'locked':''}`}
          >
            <span>{label}</span>
            <div className="profile-edit-value">
              <input
                value={d[key]||''}
                disabled={!!locked}
                onChange={e=>update(key,e.target.value)}
                placeholder={key==='bio'?'':key==='website'?'':''}
              />
              {locked&&<Lock/>}
            </div>
          </label>
        ))}

        <label className="profile-edit-row">
          <span>Gender</span>
          <div className="profile-edit-value">
            <select value={d.gender||''} onChange={e=>update('gender',e.target.value)}>
              <option value="">Add Gender</option>
              {GENDER_OPTIONS.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </label>

        {rowsAfterGender.map(([label,key,locked])=>(
          <label
            key={key}
            className={`profile-edit-row ${locked?'locked':''}`}
          >
            <span>{label}</span>
            <div className="profile-edit-value">
              <input
                value={d[key]||''}
                disabled={!!locked}
                onChange={e=>update(key,e.target.value)}
                placeholder={key==='occupation'?'Add Occupation':key==='languages'?'English, Telugu, Hindi':''}
                list={key==='occupation'?'occupation-suggestions':undefined}
              />
              {locked&&<Lock/>}
            </div>
          </label>
        ))}

        <datalist id="occupation-suggestions">
          {providers.map(p=><option key={p} value={p}/>)}
        </datalist>

        <label className="profile-edit-row profile-edit-location">
          <span>Location</span>
          <div className="profile-edit-value">
            <input
              value={d.location||''}
              onChange={e=>{ update('location',e.target.value); setShowLocationResults(true); }}
              onFocus={()=>setShowLocationResults(true)}
              placeholder="Add your location"
            />
            <button type="button" onClick={useCurrentLocation} aria-label="Use current location" title="Use current location">
              <MapPinned size={17}/>
            </button>
          </div>
          {showLocationResults&&((d.location||'').trim().length>=2||locationSearching)&&(
            <div className="location-results">
              {locationSearching&&<div className="location-result muted">Searching…</div>}
              {!locationSearching&&locationResults.map(item=>(
                <button type="button" className="location-result" key={item.place_id} onClick={()=>{ setD(x=>({...x,location:item.display_name,lat:Number(item.lat),lon:Number(item.lon)})); setSaved(false); setShowLocationResults(false); }}>
                  <MapPin size={16}/><span>{item.display_name}</span>
                </button>
              ))}
              {!locationSearching&&!locationResults.length&&<div className="location-result muted">No matching locations found.</div>}
            </div>
          )}
        </label>
      </div>

      {saved&&
        <div className="profile-save-message">
          Changes saved
        </div>
      }

      {error&&
        <div className="error profile-edit-error">
          {error}
        </div>
      }

      <button
        className="primary profile-save-button"
        type="button"
        onClick={saveChanges}
        disabled={saving}
      >
        {saving?'Saving…':'Save Changes'}
      </button>

    </main>
  );
}

export default EditProfile;
