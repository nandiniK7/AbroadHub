import { React, useEffect, useMemo, useRef, useState, Plus, Bell, MessageCircle, MoreVertical, Heart, Search, BriefcaseBusiness, MapPin, UserCircle, Compass, HomeIcon, ChevronLeft, Edit3, Camera, ImageIcon, CalendarDays, Building2, X, Send, Bookmark, Share2, Users, Settings, LogOut, ChevronRight, Check, Trash2, Menu, Globe, Phone, Mail, Lock, Eye, EyeOff, Upload, SlidersHorizontal, ArrowLeft, UserPlus, MapPinned, LocateFixed, Sparkles, Sprout, ShoppingBag, ShoppingCart, HeartPulse, ShieldCheck, Scale, Flag, Utensils, Grid2X2, CORAL, festival, wordmark, splashLogo, categories, providers, seedJobs, seedPosts, seedNotifs, seedChats, load, save } from '../../shared/deps.js';

function BottomNav({
  page,
  nav,
  onCreate
}){

  return (
    <nav className="bottom-nav">

      {[
        ['home','Home',HomeIcon],
        ['explore','Explore',Compass],
        ['create','Create',Plus],
        ['jobs','Jobs',BriefcaseBusiness],
        ['nearby','Nearby',MapPin],
        ['profile','Profile',UserCircle]
      ].map(
        ([id,l,I])=>
          id==='create'
            ?
              <button
                className="bottom-nav-create"
                onClick={onCreate}
                aria-label="Create"
                key={id}
              >
                <span className="bottom-nav-create-circle">
                  <I/>
                </span>
              </button>
            :
              <button
                className={
                  page===id?'active':''
                }
                onClick={()=>nav(id)}
                key={id}
              >
                <I/>
                <span>{l}</span>
              </button>
      )}

    </nav>
  );
}

export default BottomNav;
