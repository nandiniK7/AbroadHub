import { React, useEffect, useMemo, useRef, useState, Plus, Bell, MessageCircle, MoreVertical, Heart, Search, BriefcaseBusiness, MapPin, UserCircle, Compass, HomeIcon, ChevronLeft, Edit3, Camera, ImageIcon, CalendarDays, Building2, X, Send, Bookmark, Share2, Users, Settings, LogOut, ChevronRight, Check, Trash2, Menu, Globe, Phone, Mail, Lock, Eye, EyeOff, Upload, SlidersHorizontal, ArrowLeft, UserPlus, MapPinned, LocateFixed, Sparkles, Sprout, ShoppingBag, ShoppingCart, HeartPulse, ShieldCheck, Scale, Flag, Utensils, Grid2X2, FileText, CORAL, festival, wordmark, splashLogo, categories, providers, seedJobs, seedPosts, seedNotifs, seedChats, load, save } from '../../shared/deps.js';

function Nearby({
  nav
}){
  const [q,setQ]=useState('');

  const shown=[
    ['Beauty & Spa',Sparkles,'#F4E4F8','#B653C8'],
    ['Events',CalendarDays,'#FFF5D8','#F2A900'],
    ['Farms',Sprout,'#EAF5E6','#56B85A'],
    ['Fashion',ShoppingBag,'#F9E5EA','#E9367D'],
    ['Grocery Stores',ShoppingCart,'#E7F4E9','#3B9B4A'],
    ['Health Center',HeartPulse,'#FBE5E8','#E44747'],
    ['Insurance',ShieldCheck,'#E4F2E7','#45A857'],
    ['Legal Consultant',Scale,'#E8EBF8','#4A62B5'],
    ['Night Clubs',Flag,'#F0E3F6','#A54BC5'],
    ['Housing',Building2,'#E4F1F8','#2389C8'],
    ['Restaurants',Utensils,'#FFF0DA','#F58A00'],
    ['Tax Filing',FileText,'#FDECEA','#D2503A'],
    ['More',Grid2X2,'#F3F3F3','#888888']
  ];

  const visible=shown.filter(([c])=>c.toLowerCase().includes(q.toLowerCase()) || c==='More');

  const openCategory=label=>{
    if(label==='More'){ nav('categories'); return; }
    if(label==='Events'){ nav('events'); return; }
    if(label==='Housing'){ nav('housing'); return; }
    nav(`nearby-category:${label}`);
  };

  return (
    <main className="inner-page nearby-page">
      <button className="nearby-location" type="button">
        <MapPinned size={18}/>
        <span>1-5, 1-5, Telangana, India</span>
        <LocateFixed size={20}/>
      </button>

      <div className="nearby-search">
        <Search size={19}/>
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Search for all categories"
        />
      </div>

      <div className="category-grid">
        {visible.map(([c,Icon,bg,color])=>(
          <button
            key={c}
            type="button"
            onClick={()=>openCategory(c)}
          >
            <div className="cat-icon" style={{background:bg,color}}>
              <Icon size={27}/>
            </div>
            <span>{c}</span>
          </button>
        ))}
      </div>
    </main>
  );
}

export default Nearby;
