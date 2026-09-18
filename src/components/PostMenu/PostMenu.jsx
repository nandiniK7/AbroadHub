import { React, useEffect, useMemo, useRef, useState, Plus, Bell, MessageCircle, MoreVertical, Heart, Search, BriefcaseBusiness, MapPin, UserCircle, Compass, HomeIcon, ChevronLeft, Edit3, Camera, ImageIcon, CalendarDays, Building2, X, Send, Bookmark, Share2, Users, Settings, LogOut, ChevronRight, Check, Trash2, Menu, Globe, Phone, Mail, Lock, Eye, EyeOff, Upload, SlidersHorizontal, ArrowLeft, UserPlus, MapPinned, LocateFixed, Sparkles, Sprout, ShoppingBag, ShoppingCart, HeartPulse, ShieldCheck, Scale, Flag, Utensils, Grid2X2, CORAL, festival, wordmark, splashLogo, categories, providers, seedJobs, seedPosts, seedNotifs, seedChats, load, save } from '../../shared/deps.js';

function PostMenu({
  close,
  onDelete
}){

  return (
    <div
      className="backdrop"
      onClick={close}
    >

      <div
        className="context-menu"
        onClick={e=>
          e.stopPropagation()
        }
      >

        <button>
          Add to your story
        </button>

        <button>
          Edit Post
        </button>

        <button
          className="danger"
          onClick={onDelete}
        >
          Delete
        </button>

      </div>

    </div>
  );
}

export default PostMenu;
