import { React, useEffect, useMemo, useRef, useState, Plus, Bell, MessageCircle, MoreVertical, Heart, Search, BriefcaseBusiness, MapPin, UserCircle, Compass, HomeIcon, ChevronLeft, Edit3, Camera, ImageIcon, CalendarDays, Building2, X, Send, Bookmark, Share2, Users, Settings, LogOut, ChevronRight, Check, Trash2, Menu, Globe, Phone, Mail, Lock, Eye, EyeOff, Upload, SlidersHorizontal, ArrowLeft, UserPlus, MapPinned, LocateFixed, Sparkles, Sprout, ShoppingBag, ShoppingCart, HeartPulse, ShieldCheck, Scale, Flag, Utensils, Grid2X2, CORAL, festival, wordmark, splashLogo, categories, providers, seedJobs, seedPosts, seedNotifs, seedChats, load, save } from '../../shared/deps.js';

function Sidebar({
  page,
  nav,
  user,
  onAuth,
  onCreate,
  onLogout,
  unreadCount=0
}){

  const [collapsed,setCollapsed]=useState(false);

  const items=[
    ['home','Home',HomeIcon],
    ['explore','Explore',Compass],
    ['jobs','Jobs',BriefcaseBusiness],
    ['nearby','Nearby',MapPin],
    ['notifications','Notifications',Bell,unreadCount],
    ['inbox','Inbox',MessageCircle],
    ['profile','Profile',UserCircle]
  ];

  return (
    <aside
      className={
        'sidebar '+
        (collapsed?'collapsed':'')
      }
    >

      <div className="side-top">

        <img
          src={wordmark}
          alt="Abroad Hub"
        />

        <button
          onClick={()=>setCollapsed(!collapsed)}
        >
          <Menu/>
        </button>

      </div>

      <button
        className="sidebar-create"
        onClick={onCreate}
      >
        <Plus/>
        <span>Create</span>
      </button>

      {items.map(
        ([id,l,I,badge])=>
          <button
            className={
              page===id?'active':''
            }
            onClick={()=>nav(id)}
            key={id}
          >
            <I/>
            <span>{l}</span>
            {!!badge&&
              <span className="nav-badge">{badge}</span>
            }
          </button>
      )}

      <div className="side-bottom">

        <button
          onClick={()=>nav('settings')}
        >
          <Settings/>
          <span>Settings</span>
        </button>

        {user?
          <button
            onClick={onLogout}
          >
            <LogOut/>
            <span>Log out</span>
          </button>
          :
          <button onClick={onAuth}>
            <UserPlus/>
            <span>Log in</span>
          </button>
        }

      </div>

    </aside>
  );
}

export default Sidebar;
