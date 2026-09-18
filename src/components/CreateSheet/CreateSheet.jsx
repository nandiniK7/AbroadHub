import { React, useEffect, useMemo, useRef, useState, Plus, Bell, MessageCircle, MoreVertical, Heart, Search, BriefcaseBusiness, MapPin, UserCircle, Compass, HomeIcon, ChevronLeft, Edit3, Camera, ImageIcon, CalendarDays, Building2, X, Send, Bookmark, Share2, Users, Settings, LogOut, ChevronRight, Check, Trash2, Menu, Globe, Phone, Mail, Lock, Eye, EyeOff, Upload, SlidersHorizontal, ArrowLeft, UserPlus, MapPinned, LocateFixed, Sparkles, Sprout, ShoppingBag, ShoppingCart, HeartPulse, ShieldCheck, Scale, Flag, Utensils, Grid2X2, CORAL, festival, wordmark, splashLogo, categories, providers, seedJobs, seedPosts, seedNotifs, seedChats, load, save } from '../../shared/deps.js';

function CreateSheet({
  close,
  nav,
  onlyJob,
  onStory,
  onPost
}){

  const opts=onlyJob
    ?
      [
        [
          'job',
          'Job',
          BriefcaseBusiness
        ]
      ]
    :
      [
        [
          'post',
          'New Post',
          ImageIcon
        ],
        [
          'story',
          'Story',
          Camera
        ],
        [
          'housing',
          'Housing',
          Building2
        ],
        [
          'event',
          'Event',
          CalendarDays
        ],
        [
          'job',
          'Job',
          BriefcaseBusiness
        ]
      ];

  return (
    <div
      className="backdrop"
      onClick={close}
    >

      <div
        className="bottom-sheet"
        onClick={e=>
          e.stopPropagation()
        }
      >

        <div className="sheet-handle"/>

        {opts.map(
          ([id,l,I])=>
            <button
              key={id}
              onClick={()=>{
                close();

                if(id==='story'){
                  onStory?.();
                  return;
                }

                if(id==='post'){
                  onPost?.();
                }
                else if(id==='event'){
                  nav('events-create');
                }
                else if(id==='job'){
                  nav('postjob');
                }
                else if(id==='housing'){
                  nav('housing');
                }
                else{
                  nav('nearby');
                }
              }}
            >

              <I/>

              <span>{l}</span>

            </button>
        )}

      </div>

    </div>
  );
}

export default CreateSheet;
