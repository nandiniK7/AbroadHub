import React,{useEffect,useMemo,useRef,useState} from 'react';
import {
  Plus,
  Bell,
  MessageCircle,
  MoreVertical,
  Heart,
  Search,
  BriefcaseBusiness,
  MapPin,
  UserCircle,
  Compass,
  Home as HomeIcon,
  ChevronLeft,
  Edit3,
  Camera,
  Image as ImageIcon,
  CalendarDays,
  Building2,
  X,
  Send,
  Bookmark,
  Share2,
  Users,
  Settings,
  LogOut,
  ChevronRight,
  Check,
  Trash2,
  Menu,
  Globe,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Upload,
  SlidersHorizontal,
  ArrowLeft,
  UserPlus,
  MapPinned,
  LocateFixed,
  Sparkles,
  Sprout,
  ShoppingBag,
  ShoppingCart,
  HeartPulse,
  ShieldCheck,
  Scale,
  Flag,
  Utensils,
  Grid2X2
} from 'lucide-react';


export const CORAL ='#F46F5E';

export const festival ='/india-festival.png';
export const wordmark ='/abroadhub-wordmark.png';

/*
  IMPORTANT:
  Splash uses the actual AbroadHub airplane logo.
  This must be:
  public/splash-logo.png

  Do NOT use /logo.svg here because that file currently
  contains the house icon.
*/

export const splashLogo ='/splash-logo.png';

export const categories =[
  'Beauty & Spa',
  'Events',
  'Farms',
  'Fashion',
  'Grocery Stores',
  'Health Center',
  'Insurance',
  'Legal Consultant',
  'Night Clubs',
  'Real Estate',
  'Restaurants',
  'Tax Filing'
];

// Nearby's business categories, used by the account-setup onboarding flow.
// Events has its own dedicated create flow, so it's excluded here — a
// business account's category always maps to a real Nearby discovery page.
export const businessCategories = categories.filter(c => c !== 'Events');

// Onboarding "native country" list. Kept as its own export (JobForm.jsx has
// a similar local list for job postings, which is a different use case and
// left as-is) so onboarding has one canonical source.
export const countries =[
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

export const providers =[
  'Airbnb Host',
  'Astrologer',
  'Banquet Hall',
  'Bartender',
  'Boxing coach',
  'Cake maker/Pastry chef',
  'Car mechanic',
  'Career Counselor',
  'Catering service',
  'Chef',
  'Chiropractor',
  'Cleaning Services',
  'DJ (Disc Jockey)',
  'Dance Instructor',
  'Dietitian',
  'Digital marketer',
  'Driving Instructor',
  'Educational Tutor',
  'Electrician',
  'Event Decorator',
  'Event Organizers',
  'Fashion Designer',
  'Financial Advisor',
  'Florist',
  'Gardener/Lawn Service',
  'Graphic Designer',
  'Gym Trainer',
  'Hair Stylist',
  'House Builder',
  'Imam',
  'Interior designer',
  'Language tutor',
  'Life Coach',
  'Makeup Artist',
  'Martial Arts instructor',
  'Massage Therapist',
  'Mehandi Artist',
  'Music Band',
  'Music Teacher',
  'Nail Artist',
  'Nutritionist',
  'Painter',
  'Party Rentals',
  'Pet Groomer',
  'Pet Trainer',
  'Photographer',
  'Physical Therapist',
  'Plumber',
  'Priest',
  'Psychologist',
  'Real Estate Consultant',
  'Sketch Artist',
  'Speech Therapist',
  'Tailoring/Alteration',
  'Tattoo Artist',
  'Travel Guide',
  'Video Editor',
  'Videographer',
  'Yoga Instructor'
];

export const seedJobs =[
  {
    id:1,
    title:'flutter developer',
    company:'my job',
    work:'Hybrid',
    salary:'$120000',
    location:'C9C2+6H8, C...',
    description:'flutter dev',
    posted:'18 days ago'
  },
  {
    id:2,
    title:'Sample Job 1',
    company:'google',
    work:'On-site',
    salary:'$3000',
    location:'Bangalore',
    description:'test description 2',
    posted:'18 days ago'
  }
];

export const seedPosts =[
  {
    id:1,
    name:'Jobs In Atlanta',
    handle:'@jobsinatlanta',
    text:'Join the Atlanta India Festival 2026 for a vibrant celebration of India’s rich culture, her heritage, and the incredible Indian community in Atlanta.',
    image:festival,
    likes:0,
    liked:false,
    time:'18 days ago'
  },
  {
    id:2,
    name:'Abroad Hub Community',
    handle:'@abroadhub',
    text:'Welcome to AbroadHub — connect, discover and build your community abroad.',
    image:null,
    likes:12,
    liked:false,
    time:'2 days ago'
  }
];

export const seedNotifs =[
  {
    id:1,
    title:'New Like',
    from:'Montgomery Buzz',
    time:'12 days ago'
  },
  {
    id:2,
    title:'New Follower',
    from:'Atlanta Jobs',
    time:'11 days ago'
  }
];

// Demo people directory shared by Providers, Search and Inbox (compose)
// so the same identities and @handles are used consistently everywhere.
export const seedPeople =[
  {n:'Emma',u:'emma'},
  {n:'prof test',u:'prof_test'},
  {n:'Lily',u:'lily'},
  {n:'sham_cyprus',u:'sham_cyprus'},
  {n:"Airbnb's",u:'airbnbs'}
];

export const seedChats =[
  {
    id:1,
    name:'Atlanta Jobs',
    preview:'〽 hi',
    time:'11 days ago',
    avatar:'AJ'
  },
  {
    id:2,
    name:'Rakesh reddy Koukuntla',
    preview:'Tap to chat',
    time:'11 days ago',
    avatar:'RK'
  },
  {
    id:3,
    name:'suchandra',
    preview:'Tap to chat',
    time:'15 days ago',
    avatar:'S'
  }
];

export const load =(k,d)=>{
  try{
    return JSON.parse(localStorage.getItem(k))??d;
  }catch{
    return d;
  }
};

export const save =(k,v)=>{
  // localStorage is only ever a first-paint cache here — posts/jobs/events
  // are always re-fetched from the real backend on load and overwrite this.
  // setItem can legitimately throw (quota exceeded once enough real
  // base64 images accumulate, private browsing, storage disabled), and an
  // uncaught throw inside a render-effect crashes the whole app. Never let
  // a cache-write failure take down the UI.
  try{
    localStorage.setItem(k,JSON.stringify(v));
  }catch(err){
    console.warn(`Could not persist "${k}" to localStorage (continuing without the cache):`,err);
  }
};

// Compact relative time for a notification row, e.g. "4h", "2d", "3w".
export function timeAgoShort(iso){
  const diff=Date.now()-new Date(iso).getTime();
  const mins=Math.floor(diff/60000);
  if(mins<1)return 'now';
  if(mins<60)return `${mins}m`;
  const hrs=Math.floor(mins/60);
  if(hrs<24)return `${hrs}h`;
  const days=Math.floor(hrs/24);
  if(days<7)return `${days}d`;
  const weeks=Math.floor(days/7);
  if(weeks<5)return `${weeks}w`;
  return `${Math.floor(days/30)}mo`;
}

// Date-section header for a notification row: "Today", "Yesterday", or an
// absolute date once it's further back — matches the grouped list pattern.
export function notifDateGroup(iso){
  const d=new Date(iso);
  const startOfDay=dt=>new Date(dt.getFullYear(),dt.getMonth(),dt.getDate());
  const dayDiff=Math.round((startOfDay(new Date())-startOfDay(d))/86400000);
  if(dayDiff===0)return 'Today';
  if(dayDiff===1)return 'Yesterday';
  return d.toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'});
}



export { React, useEffect, useMemo, useRef, useState, Plus, Bell, MessageCircle, MoreVertical, Heart, Search, BriefcaseBusiness, MapPin, UserCircle, Compass, HomeIcon, ChevronLeft, Edit3, Camera, ImageIcon, CalendarDays, Building2, X, Send, Bookmark, Share2, Users, Settings, LogOut, ChevronRight, Check, Trash2, Menu, Globe, Phone, Mail, Lock, Eye, EyeOff, Upload, SlidersHorizontal, ArrowLeft, UserPlus, MapPinned, LocateFixed, Sparkles, Sprout, ShoppingBag, ShoppingCart, HeartPulse, ShieldCheck, Scale, Flag, Utensils, Grid2X2 };
