import { React, useEffect, useMemo, useRef, useState, Plus, Bell, MessageCircle, MoreVertical, Heart, Search, BriefcaseBusiness, MapPin, UserCircle, Compass, HomeIcon, ChevronLeft, Edit3, Camera, ImageIcon, CalendarDays, Building2, X, Send, Bookmark, Share2, Users, Settings, LogOut, ChevronRight, Check, Trash2, Menu, Globe, Phone, Mail, Lock, Eye, EyeOff, Upload, SlidersHorizontal, ArrowLeft, UserPlus, MapPinned, LocateFixed, Sparkles, Sprout, ShoppingBag, ShoppingCart, HeartPulse, ShieldCheck, Scale, Flag, Utensils, Grid2X2, CORAL, festival, wordmark, splashLogo, categories, providers, seedJobs, seedPosts, seedNotifs, seedChats, load, save } from '../../shared/deps.js';

function Categories({
  nav
}){
  const [q,setQ]=useState('');

  const openBusiness=c=>{
    if(c==='Events'){ nav('events'); return; }
    nav(`nearby-category:${c}`);
  };

  const filteredBusiness=categories.filter(c=>c.toLowerCase().includes(q.toLowerCase()));
  const filteredProviders=providers.filter(c=>c.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <header className="header categories-header">
        <button onClick={()=>nav('nearby')} aria-label="Back"><ChevronLeft/></button>
        <h1 className="header-title">Categories</h1>
      </header>

      <main className="inner-page list-page">

      <div className="search-bar">

        <Search/>

        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Search services or Providers"
        />

      </div>

      <h3 className="categories-section-title">Business</h3>

      {filteredBusiness.map(
        c=>
          <button
            className="list-row"
            key={c}
            onClick={()=>openBusiness(c)}
          >

            <span>{c}</span>

            <ChevronRight/>

          </button>
      )}

      <h3 className="categories-section-title">
        Service Providers
      </h3>

      {filteredProviders.map(
        c=>
          <button
            className="list-row"
            key={c}
            onClick={()=>nav(`provider-category:${c}`)}
          >

            <span>{c}</span>

            <ChevronRight/>

          </button>
      )}

      </main>
    </>
  );
}

export default Categories;
