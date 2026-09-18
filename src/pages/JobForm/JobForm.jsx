import { React, useEffect, useMemo, useRef, useState, Plus, Bell, MessageCircle, MoreVertical, Heart, Search, BriefcaseBusiness, MapPin, UserCircle, Compass, HomeIcon, ChevronLeft, Edit3, Camera, ImageIcon, CalendarDays, Building2, X, Send, Bookmark, Share2, Users, Settings, LogOut, ChevronRight, Check, Trash2, Menu, Globe, Phone, Mail, Lock, Eye, EyeOff, Upload, SlidersHorizontal, ArrowLeft, UserPlus, MapPinned, LocateFixed, Sparkles, Sprout, ShoppingBag, ShoppingCart, HeartPulse, ShieldCheck, Scale, Flag, Utensils, Grid2X2, CORAL, festival, wordmark, splashLogo, categories, providers, seedJobs, seedPosts, seedNotifs, seedChats, load, save } from '../../shared/deps.js';

// Module scope (not inside JobForm) — defining this inside the component
// body was the root cause of every field losing focus after one keystroke:
// React saw a brand-new "Field" function identity each render and
// remounted the whole subtree instead of updating it in place.
const Field=({label,children,full=true,error})=>(
  <label className={full?'job-field':'job-field half'}>
    <span>{label}</span>
    {children}
    {error&&<small className="field-error">{error}</small>}
  </label>
);

function JobForm({
  add,
  toast,
  onDone
}){
  const [d,setD]=useState({
    'Job Type *':'Full Time',
    'Work Type *':'Hybrid',
    'Section *':'Technical',
    'Country *':'United States',
    'Languages':''
  });

  const [logo,setLogo]=useState(null);
  const [errors,setErrors]=useState({});
  const [coords,setCoords]=useState({lat:null,lon:null});
  const [locationResults,setLocationResults]=useState([]);
  const [locationSearching,setLocationSearching]=useState(false);
  const [showLocationResults,setShowLocationResults]=useState(false);

  const countries=[
    'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda',
    'Argentina','Armenia','Australia','Austria','Azerbaijan','Bahamas','Bahrain',
    'Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan',
    'Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria',
    'Burkina Faso','Burundi','Cambodia','Cameroon','Canada','Cape Verde',
    'Central African Republic','Chad','Chile','China','Colombia','Comoros',
    'Congo','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic',
    'Denmark','Djibouti','Dominica','Dominican Republic','Ecuador','Egypt',
    'El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia',
    'Fiji','Finland','France','Gabon','Gambia','Georgia','Germany','Ghana',
    'Greece','Grenada','Guatemala','Guinea','Guyana','Haiti','Honduras',
    'Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel',
    'Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati',
    'Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia',
    'Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar','Malawi',
    'Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania',
    'Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro',
    'Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands',
    'New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia',
    'Norway','Oman','Pakistan','Palau','Panama','Papua New Guinea','Paraguay',
    'Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia',
    'Rwanda','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines',
    'Samoa','San Marino','Saudi Arabia','Senegal','Serbia','Seychelles',
    'Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands',
    'Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka',
    'Sudan','Suriname','Sweden','Switzerland','Syria','Taiwan','Tajikistan',
    'Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago',
    'Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine',
    'United Arab Emirates','United Kingdom','United States','Uruguay',
    'Uzbekistan','Vanuatu','Vatican City','Venezuela','Vietnam','Yemen',
    'Zambia','Zimbabwe'
  ];

  const languages=[
    'Afrikaans','Albanian','Amharic','Arabic','Armenian','Assamese','Azerbaijani',
    'Basque','Belarusian','Bengali','Bosnian','Bulgarian','Burmese','Catalan',
    'Chinese','Croatian','Czech','Danish','Dutch','English','Estonian','Filipino',
    'Finnish','French','Galician','Georgian','German','Greek','Gujarati','Hausa',
    'Hebrew','Hindi','Hungarian','Icelandic','Indonesian','Irish','Italian',
    'Japanese','Kannada','Kazakh','Khmer','Korean','Kyrgyz','Lao','Latvian',
    'Lithuanian','Macedonian','Malay','Malayalam','Marathi','Mongolian','Nepali',
    'Norwegian','Odia','Pashto','Persian','Polish','Portuguese','Punjabi',
    'Romanian','Russian','Serbian','Sinhala','Slovak','Slovenian','Somali',
    'Spanish','Swahili','Swedish','Tamil','Telugu','Thai','Turkish','Ukrainian',
    'Urdu','Uzbek','Vietnamese','Welsh','Zulu'
  ];

  const phoneCodes=[
    ['+1','United States / Canada'],
    ['+7','Russia / Kazakhstan'],
    ['+20','Egypt'],
    ['+27','South Africa'],
    ['+30','Greece'],
    ['+31','Netherlands'],
    ['+32','Belgium'],
    ['+33','France'],
    ['+34','Spain'],
    ['+36','Hungary'],
    ['+39','Italy'],
    ['+40','Romania'],
    ['+41','Switzerland'],
    ['+43','Austria'],
    ['+44','United Kingdom'],
    ['+45','Denmark'],
    ['+46','Sweden'],
    ['+47','Norway'],
    ['+48','Poland'],
    ['+49','Germany'],
    ['+51','Peru'],
    ['+52','Mexico'],
    ['+53','Cuba'],
    ['+54','Argentina'],
    ['+55','Brazil'],
    ['+56','Chile'],
    ['+57','Colombia'],
    ['+58','Venezuela'],
    ['+60','Malaysia'],
    ['+61','Australia'],
    ['+62','Indonesia'],
    ['+63','Philippines'],
    ['+64','New Zealand'],
    ['+65','Singapore'],
    ['+66','Thailand'],
    ['+81','Japan'],
    ['+82','South Korea'],
    ['+84','Vietnam'],
    ['+86','China'],
    ['+90','Turkey'],
    ['+91','India'],
    ['+92','Pakistan'],
    ['+93','Afghanistan'],
    ['+94','Sri Lanka'],
    ['+95','Myanmar'],
    ['+98','Iran'],
    ['+211','South Sudan'],
    ['+212','Morocco'],
    ['+213','Algeria'],
    ['+216','Tunisia'],
    ['+218','Libya'],
    ['+220','Gambia'],
    ['+221','Senegal'],
    ['+234','Nigeria'],
    ['+254','Kenya'],
    ['+255','Tanzania'],
    ['+256','Uganda'],
    ['+260','Zambia'],
    ['+263','Zimbabwe'],
    ['+971','UAE'],
    ['+972','Israel'],
    ['+973','Bahrain'],
    ['+974','Qatar'],
    ['+966','Saudi Arabia'],
    ['+977','Nepal']
  ];

  const set=(key,value)=>{
    setD(x=>({...x,[key]:value}));
    setErrors(x=>{
      const next={...x};
      delete next[key];
      return next;
    });
  };

  const [submitting,setSubmitting]=useState(false);

  useEffect(()=>{
    const value=(d['Job Location']||'').trim();
    setCoords(c=>value?c:{lat:null,lon:null});
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
  },[d['Job Location']]);

  const submit=async()=>{
    const required=[
      'Job Title',
      'Company Name',
      'Mobile Number',
      'Job Location',
      'Salary',
      'Min Experience',
      'Max Experience',
      'Job Type *',
      'Work Type *',
      'Section *',
      'Country *',
      'Job Description *'
    ];

    const next={};

    required.forEach(key=>{
      if(!String(d[key]||'').trim()){
        next[key]='This field is required';
      }
    });

    if(
      d['Min Experience'] &&
      d['Max Experience'] &&
      Number(d['Min Experience'])>Number(d['Max Experience'])
    ){
      next['Max Experience']='Max experience must be greater than or equal to Min experience';
    }

    if(Object.keys(next).length){
      setErrors(next);
      toast?.('Please complete all required details');
      return;
    }

    setSubmitting(true);

    try{
      await add({
        id:Date.now(),
        title:d['Job Title'].trim(),
        company:d['Company Name'].trim(),
        work:d['Work Type *'],
        type:d['Job Type *'],
        section:d['Section *'],
        country:d['Country *'],
        mobileCode:d.phoneCode||'+1',
        mobile:d['Mobile Number'].trim(),
        salary:d.Salary.trim(),
        minExperience:d['Min Experience'].trim(),
        maxExperience:d['Max Experience'].trim(),
        url:d.URL?.trim()||'',
        languages:d.Languages||'',
        description:d['Job Description *'].trim(),
        location:d['Job Location'].trim(),
        lat:coords.lat,
        lon:coords.lon,
        logo,
        posted:'just now'
      });

      toast?.('Job posted');
      navBack();
    }catch(err){
      toast?.(err.message || 'Unable to post job. Please try again.');
    }finally{
      setSubmitting(false);
    }
  };

  const navBack=()=>{
    onDone?.();
  };

  return (
    <main className="form-page job-form-page">

      <div className="inner-header job-form-header">
        <button onClick={navBack} aria-label="Back">
          <ChevronLeft/>
        </button>

        <button
          className="job-post-top push-right"
          onClick={submit}
          disabled={submitting}
        >
          {submitting?'Posting…':'Post'}
        </button>
      </div>

      <div className="job-logo-upload">
        <label className="job-logo-circle">
          {logo
            ? <img src={logo} alt="Company logo"/>
            : <ImageIcon size={34}/>
          }
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={e=>{
              const file=e.target.files?.[0];
              if(!file)return;
              const reader=new FileReader();
              reader.onload=()=>setLogo(reader.result);
              reader.readAsDataURL(file);
            }}
          />
        </label>
        <span>Company Logo</span>
        <small>(Optional)</small>
      </div>

      <Field label="Job Title" error={errors['Job Title']}>
        <input
          value={d['Job Title']||''}
          onChange={e=>set('Job Title',e.target.value)}
          placeholder="Job Title"
        />
      </Field>

      <Field label="Company Name" error={errors['Company Name']}>
        <input
          value={d['Company Name']||''}
          onChange={e=>set('Company Name',e.target.value)}
          placeholder="Company Name"
        />
      </Field>

      <div className="job-phone-row">
        <label className="job-phone-code">
          <select
            value={d.phoneCode||'+1'}
            onChange={e=>set('phoneCode',e.target.value)}
          >
            {phoneCodes.map(([code,name])=>
              <option key={code} value={code}>
                {code}
              </option>
            )}
          </select>
        </label>

        <Field label="Mobile Number" error={errors['Mobile Number']}>
          <input
            type="tel"
            value={d['Mobile Number']||''}
            onChange={e=>set('Mobile Number',e.target.value)}
            placeholder="Mobile Number"
          />
        </Field>
      </div>

      <Field label="Job Location" error={errors['Job Location']}>
        <div className="jobs-location-wrap">
          <input
            value={d['Job Location']||''}
            onChange={e=>{ set('Job Location',e.target.value); setShowLocationResults(true); }}
            onFocus={()=>setShowLocationResults(true)}
            placeholder="Job Location"
          />
          {showLocationResults&&(String(d['Job Location']||'').trim().length>=2||locationSearching)&&(
            <div className="location-results">
              {locationSearching&&<div className="location-result muted">Searching…</div>}
              {!locationSearching&&locationResults.map(item=>(
                <button type="button" className="location-result" key={item.place_id} onClick={()=>{
                  set('Job Location',item.display_name);
                  setCoords({lat:Number(item.lat),lon:Number(item.lon)});
                  setShowLocationResults(false);
                }}>
                  <MapPin size={16}/><span>{item.display_name}</span>
                </button>
              ))}
              {!locationSearching&&!locationResults.length&&<div className="location-result muted">No matching locations found.</div>}
            </div>
          )}
        </div>
      </Field>

      <Field label="Salary" error={errors['Salary']}>
        <input
          value={d.Salary||''}
          onChange={e=>set('Salary',e.target.value)}
          placeholder="Salary"
        />
      </Field>

      <div className="job-two-col">
        <Field label="Min Experience" error={errors['Min Experience']} full={false}>
          <input
            type="number"
            min="0"
            value={d['Min Experience']||''}
            onChange={e=>set('Min Experience',e.target.value)}
            placeholder="Min Experience"
          />
        </Field>

        <Field label="Max Experience" error={errors['Max Experience']} full={false}>
          <input
            type="number"
            min="0"
            value={d['Max Experience']||''}
            onChange={e=>set('Max Experience',e.target.value)}
            placeholder="Max Experience"
          />
        </Field>
      </div>

      <Field label="Job Type *" error={errors['Job Type *']}>
        <select
          value={d['Job Type *']}
          onChange={e=>set('Job Type *',e.target.value)}
        >
          <option>Full Time</option>
          <option>Part Time</option>
        </select>
      </Field>

      <Field label="Work Type *" error={errors['Work Type *']}>
        <select
          value={d['Work Type *']}
          onChange={e=>set('Work Type *',e.target.value)}
        >
          <option>On-site</option>
          <option>Remote</option>
          <option>Hybrid</option>
        </select>
      </Field>

      <Field label="Section *" error={errors['Section *']}>
        <select
          value={d['Section *']}
          onChange={e=>set('Section *',e.target.value)}
        >
          <option>Technical</option>
          <option>Non Technical</option>
        </select>
      </Field>

      <Field label="Country *" error={errors['Country *']}>
        <select
          value={d['Country *']}
          onChange={e=>set('Country *',e.target.value)}
        >
          {countries.map(c=>
            <option key={c}>{c}</option>
          )}
        </select>
      </Field>

      <Field label="URL" error={errors['URL']}>
        <input
          type="url"
          value={d.URL||''}
          onChange={e=>set('URL',e.target.value)}
          placeholder="URL"
        />
      </Field>

      <Field label="Job Description *" error={errors['Job Description *']}>
        <textarea
          value={d['Job Description *']||''}
          onChange={e=>set('Job Description *',e.target.value)}
          placeholder="Job Description"
        />
      </Field>

      <Field label="Languages" error={errors['Languages']}>
        <select
          value={d.Languages||''}
          onChange={e=>set('Languages',e.target.value)}
        >
          <option value="">Select languages</option>
          {languages.map(l=>
            <option key={l}>{l}</option>
          )}
        </select>
      </Field>

      <button
        className="primary job-post-bottom"
        onClick={submit}
        disabled={submitting}
      >
        {submitting?'Posting…':'Post Job'}
      </button>

    </main>
  );
}

export default JobForm;
