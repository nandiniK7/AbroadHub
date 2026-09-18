import { React, useEffect, useMemo, useRef, useState, Plus, Bell, MessageCircle, MoreVertical, Heart, Search, BriefcaseBusiness, MapPin, UserCircle, Compass, HomeIcon, ChevronLeft, Edit3, Camera, ImageIcon, CalendarDays, Building2, X, Send, Bookmark, Share2, Users, Settings, LogOut, ChevronRight, Check, Trash2, Menu, Globe, Phone, Mail, Lock, Eye, EyeOff, Upload, SlidersHorizontal, ArrowLeft, UserPlus, MapPinned, LocateFixed, Sparkles, Sprout, ShoppingBag, ShoppingCart, HeartPulse, ShieldCheck, Scale, Flag, Utensils, Grid2X2, CORAL, festival, wordmark, splashLogo, categories, providers, seedJobs, seedPosts, seedNotifs, seedChats, load, save } from '../../shared/deps.js';
import { api } from '../../api.js';
import ShareSheet from '../../components/ShareSheet/ShareSheet.jsx';

const SECTIONS=[['All','All'],['Technical','Technical'],['Non Technical','Non-Technical']];
const DATE_POSTED=[['Any Time','Any Time'],['Past 24 hours','last 24h'],['Past Week','Past Week'],['Past Month','Past Month']];
const WORK_TYPES=[['All','All'],['On-site','On-Site'],['Remote','Remote'],['Hybrid','Hybrid']];
const JOB_TYPES=[['All','All'],['Full Time','Full-Time'],['Part Time','Part-Time'],['Contract','Contract'],['Internship','Internship']];
const EXP_YEARS=Array.from({length:21},(_, i)=>String(i));

function parseNumber(str){
  const m=String(str||'').match(/[\d.]+/);
  return m?Number(m[0]):null;
}
function withinDatePosted(job,filter){
  if(filter==='Any Time'||!job.createdAt)return true;
  const days=(Date.now()-new Date(job.createdAt).getTime())/86400000;
  if(filter==='Past 24 hours')return days<=1;
  if(filter==='Past Week')return days<=7;
  if(filter==='Past Month')return days<=31;
  return true;
}

function Jobs({
  jobs,
  user,
  nav,
  requireAuth,
  toast,
  openConversation,
  // Owned by App.jsx so the header's bookmark toggle (same row as the
  // "Jobs" title) can control this page's filtering.
  showSavedOnly: showSavedOnlyProp,
  setShowSavedOnly: setShowSavedOnlyProp
}){
  const [q,setQ]=useState('');
  const [saved,setSaved]=useState(()=>new Set());
  const [showSavedOnlyLocal,setShowSavedOnlyLocal]=useState(false);
  const showSavedOnly=showSavedOnlyProp??showSavedOnlyLocal;
  const setShowSavedOnly=setShowSavedOnlyProp??setShowSavedOnlyLocal;
  const [location,setLocation]=useState('');
  const [locationLoading,setLocationLoading]=useState(false);
  const [locationResults,setLocationResults]=useState([]);
  const [locationSearching,setLocationSearching]=useState(false);
  const [showLocationResults,setShowLocationResults]=useState(false);
  const [shareJob,setShareJob]=useState(null);
  const [detailJob,setDetailJob]=useState(null);

  const [filterOpen,setFilterOpen]=useState(false);
  const [sectionFilter,setSectionFilter]=useState('All');
  const [expMin,setExpMin]=useState('0');
  const [expMax,setExpMax]=useState('20');
  const [datePosted,setDatePosted]=useState('Any Time');
  const [workTypeFilter,setWorkTypeFilter]=useState('All');
  const [employmentFilter,setEmploymentFilter]=useState('All');

  const activeFilterCount=[sectionFilter!=='All',expMin!=='0',expMax!=='20',datePosted!=='Any Time',workTypeFilter!=='All',employmentFilter!=='All'].filter(Boolean).length;

  const resetFilters=()=>{
    setSectionFilter('All'); setExpMin('0'); setExpMax('20');
    setDatePosted('Any Time'); setWorkTypeFilter('All'); setEmploymentFilter('All');
  };

  useEffect(()=>{
    if(!user){ setSaved(new Set()); return; }
    api.saved('job').then(r=>{
      setSaved(new Set((r.saved||[]).map(s=>s.contentId)));
    }).catch(()=>{});
  },[user]);

  useEffect(()=>{
    const value=location.trim();
    if(!value || value.length<2){
      setLocationResults([]);
      setLocationSearching(false);
      return;
    }

    const timer=setTimeout(async()=>{
      try{
        setLocationSearching(true);
        const res=await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(value)}`
        );
        const data=await res.json();
        setLocationResults(Array.isArray(data)?data:[]);
      }catch{
        setLocationResults([]);
      }finally{
        setLocationSearching(false);
      }
    },450);

    return ()=>clearTimeout(timer);
  },[location]);

  const toggleSaved=async(id,e)=>{
    e?.stopPropagation();
    if(!requireAuth())return;

    const isSaved=saved.has(id);
    setSaved(prev=>{
      const next=new Set(prev);
      isSaved ? next.delete(id) : next.add(id);
      return next;
    });

    try{
      isSaved ? await api.unsave('job',id) : await api.save('job',id);
    }catch{
      setSaved(prev=>{
        const next=new Set(prev);
        isSaved ? next.add(id) : next.delete(id);
        return next;
      });
    }
  };

  const messageJob=async(j,e)=>{
    e?.stopPropagation();
    if(!requireAuth())return;
    if(!j.postedByUsername || j.postedByUsername===user?.username){
      toast?.('No poster to message for this job.');
      return;
    }
    try{
      const r=await api.startConversation(j.postedByUsername);
      openConversation?.(r.conversationId,r.user);
    }catch(err){
      toast?.(err.message || 'Unable to open conversation.');
    }
  };

  const callTarget=j=>j.mobile ? `tel:${(j.mobileCode||'').replace(/\s/g,'')}${j.mobile}` : null;

  const callJob=(j,e)=>{
    e?.stopPropagation();
    if(!j.mobile) toast?.('No phone number listed for this job.');
  };

  const selectLocation=()=>{
    if(!navigator.geolocation){
      setShowLocationResults(true);
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async pos=>{
        try{
          const res=await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          );
          const data=await res.json();
          setLocation(data.display_name || `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        }catch{
          setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        }finally{
          setLocationLoading(false);
          setShowLocationResults(false);
        }
      },
      ()=>{
        setLocationLoading(false);
        setShowLocationResults(true);
      },
      {enableHighAccuracy:true,timeout:10000}
    );
  };

  const locationQuery=location.trim().toLowerCase();
  const jobQuery=q.trim().toLowerCase();

  const filtered=jobs.filter(j=>{
    const jobLocation=String(j.location||'').toLowerCase();
    const matchesLocation=!locationQuery ||
      jobLocation.includes(locationQuery) ||
      locationQuery.includes(jobLocation);

    const matchesJobSearch=!jobQuery ||
      (
        String(j.title||'')+
        String(j.company||'')+
        String(j.location||'')
      )
      .toLowerCase()
      .includes(jobQuery);

    const matchesSaved=!showSavedOnly || saved.has(j.id);
    const matchesSection=sectionFilter==='All' || j.section===sectionFilter;
    const matchesWorkType=workTypeFilter==='All' || j.work===workTypeFilter;
    const matchesEmployment=employmentFilter==='All' || j.type===employmentFilter;
    const matchesDate=withinDatePosted(j,datePosted);

    const expLow=parseNumber(j.minExperience);
    const matchesExpMin=expMin==='0' || (expLow!=null && expLow>=Number(expMin));
    const expHigh=parseNumber(j.maxExperience);
    const matchesExpMax=expMax==='20' || (expHigh!=null && expHigh<=Number(expMax));

    return matchesLocation && matchesJobSearch && matchesSaved && matchesSection &&
      matchesWorkType && matchesEmployment && matchesDate && matchesExpMin && matchesExpMax;
  });

  const openDetail=j=>setDetailJob(j);

  return (
    <main className="inner-page jobs-page">

      <div className="jobs-location-wrap">
        <div className="location-pill jobs-location-input-wrap">
          <MapPin/>
          <input
            value={location}
            onChange={e=>{
              setLocation(e.target.value);
              setShowLocationResults(true);
            }}
            onFocus={()=>setShowLocationResults(true)}
            placeholder="Search location..."
            aria-label="Search location"
          />
          <button
            type="button"
            className="location-current-button"
            onClick={selectLocation}
            aria-label="Use current location"
            title="Use current location"
          >
            <MapPinned/>
          </button>
        </div>

        {showLocationResults && (location.trim().length>=2 || locationSearching) && (
          <div className="location-results">
            {locationSearching && <div className="location-result muted">Searching locations...</div>}

            {!locationSearching && locationResults.map(item=>(
              <button
                type="button"
                className="location-result"
                key={item.place_id}
                onClick={()=>{
                  setLocation(item.display_name);
                  setShowLocationResults(false);
                }}
              >
                <MapPin size={16}/>
                <span>{item.display_name}</span>
              </button>
            ))}

            {!locationSearching && !locationResults.length && (
              <div className="location-result muted">No matching locations found.</div>
            )}
          </div>
        )}
      </div>

      <div className="search-bar">
        <Search/>
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Search jobs..."
        />
      </div>

      <div className="jobs-section-head">
        <h3>{showSavedOnly ? 'Saved Jobs' : location.trim() ? `Jobs in ${location.trim()}` : 'Recently Posted'}</h3>
        <button
          className={`jobs-filter-icon-btn${activeFilterCount?' active':''}`}
          onClick={()=>setFilterOpen(true)}
          aria-label="Filter jobs"
        >
          <SlidersHorizontal size={17}/>
          {activeFilterCount>0&&<span className="jobs-filter-count">{activeFilterCount}</span>}
        </button>
      </div>

      <div className="job-grid">
        {filtered.map(j=>(
          <article className="job-card" key={j.id} onClick={()=>openDetail(j)}>
            <div className="job-head">
              <div>
                <h2>{j.title}</h2>
                <p>{j.company}</p>
              </div>
              <button
                onClick={e=>toggleSaved(j.id,e)}
                aria-label={saved.has(j.id) ? 'Remove saved job' : 'Save job'}
              >
                <Bookmark fill={saved.has(j.id) ? "currentColor" : "none"}/>
              </button>
            </div>

            <div className="badges">
              <span>{j.work}</span>
              <span>{j.salary}</span>
            </div>

            <p><MapPin size={15}/>{j.location}</p>
            <p>{j.description}</p>
            <small>Posted {j.posted}</small>

            <div className="job-actions" onClick={e=>e.stopPropagation()}>
              {callTarget(j) ? (
                <a href={callTarget(j)}><Phone/>Call Now</a>
              ) : (
                <button onClick={e=>callJob(j,e)}><Phone/>Call Now</button>
              )}
              <button onClick={e=>messageJob(j,e)}><MessageCircle/>Message</button>
              <button onClick={e=>{ e.stopPropagation(); setShareJob(j); }}><Share2/>Share</button>
            </div>
          </article>
        ))}
      </div>

      {!filtered.length && showSavedOnly && (
        <div className="jobs-empty">
          No saved jobs yet. Tap the bookmark on a job to save it.
        </div>
      )}

      {!filtered.length && !showSavedOnly && (
        <div className="jobs-empty">
          No jobs match your search and filters.
        </div>
      )}

      {filterOpen&&
        <div className="backdrop" onClick={()=>setFilterOpen(false)}>
          <div className="jobs-filter-sheet" onClick={e=>e.stopPropagation()}>
            <div className="jobs-filter-head">
              <button onClick={()=>setFilterOpen(false)} aria-label="Close"><X size={20}/></button>
              <b>Filters</b>
              <span/>
            </div>

            <div className="jobs-filter-segmented">
              {SECTIONS.map(([value,label])=>(
                <button key={value} className={sectionFilter===value?'active':''} onClick={()=>setSectionFilter(value)}>{label}</button>
              ))}
            </div>

            <span className="filter-group-label">Experience</span>
            <div className="jobs-filter-exp-row">
              <select value={expMin} onChange={e=>setExpMin(e.target.value)} aria-label="Minimum experience">
                {EXP_YEARS.map(y=><option key={y} value={y}>{y}yrs</option>)}
              </select>
              <span>—</span>
              <select value={expMax} onChange={e=>setExpMax(e.target.value)} aria-label="Maximum experience">
                {EXP_YEARS.map(y=><option key={y} value={y}>{y}yrs</option>)}
              </select>
            </div>

            <span className="filter-group-label">Date Posted</span>
            <div className="filter-chip-row">
              {DATE_POSTED.map(([value,label])=>(
                <button key={value} className={datePosted===value?'active':''} onClick={()=>setDatePosted(value)}>
                  {datePosted===value&&<Check size={13}/>}{label}
                </button>
              ))}
            </div>

            <span className="filter-group-label">Work Type</span>
            <div className="filter-chip-row">
              {WORK_TYPES.map(([value,label])=>(
                <button key={value} className={workTypeFilter===value?'active':''} onClick={()=>setWorkTypeFilter(value)}>
                  {workTypeFilter===value&&<Check size={13}/>}{label}
                </button>
              ))}
            </div>

            <span className="filter-group-label">Job Type</span>
            <div className="filter-chip-row">
              {JOB_TYPES.map(([value,label])=>(
                <button key={value} className={employmentFilter===value?'active':''} onClick={()=>setEmploymentFilter(value)}>
                  {employmentFilter===value&&<Check size={13}/>}{label}
                </button>
              ))}
            </div>

            <div className="jobs-filter-footer">
              <button className="outline" onClick={resetFilters}>Reset</button>
              <button className="primary" onClick={()=>setFilterOpen(false)}>Apply</button>
            </div>
          </div>
        </div>
      }

      {detailJob&&
        <div className="backdrop" onClick={()=>setDetailJob(null)}>
          <div className="job-detail-sheet" onClick={e=>e.stopPropagation()}>
            <button className="close" onClick={()=>setDetailJob(null)}><X/></button>
            <div className="job-detail-logo">{detailJob.logo?<img src={detailJob.logo} alt=""/>:<Building2 size={28}/>}</div>
            <h2>{detailJob.title}</h2>
            <span className="job-detail-company">{detailJob.company}</span>

            <div className="badges job-detail-badges">
              <span>{detailJob.work}</span>
              <span>{detailJob.salary}</span>
              {detailJob.type&&<span>{detailJob.type}</span>}
            </div>

            <div className="job-detail-section">
              <b>Job Description</b>
              <p>{detailJob.description}</p>
            </div>

            {(detailJob.minExperience||detailJob.maxExperience)&&
              <div className="job-detail-section">
                <b>Experience</b>
                <p>{detailJob.minExperience||'0'}–{detailJob.maxExperience||'–'} years</p>
              </div>
            }

            <div className="job-detail-section">
              <b>Location</b>
              <p><MapPin size={14}/>{detailJob.location}</p>
            </div>

            {detailJob.postedByUsername&&
              <div className="job-detail-posted-by">
                Posted by <b>@{detailJob.postedByUsername}</b> · {detailJob.posted}
              </div>
            }

            <div className="job-detail-actions">
              <button onClick={e=>messageJob(detailJob,e)}><MessageCircle size={16}/>Message Now</button>
              {callTarget(detailJob) ? (
                <a className="primary" href={callTarget(detailJob)}><Phone size={16}/>Call Now</a>
              ) : (
                <button className="primary" onClick={e=>callJob(detailJob,e)}><Phone size={16}/>Call Now</button>
              )}
            </div>
          </div>
        </div>
      }

      {shareJob&&
        <ShareSheet
          title={`${shareJob.title} at ${shareJob.company}${shareJob.location?` — ${shareJob.location}`:''}`}
          url={`${window.location.origin}/jobs/${shareJob.id}`}
          close={()=>setShareJob(null)}
          onSent={(conversationId,convoUser)=>openConversation?.(conversationId,convoUser)}
          requireAuth={requireAuth}
        />
      }

    </main>
  );
}

export default Jobs;
