import Avatar from '../../components/Avatar/Avatar.jsx';
import { React, useEffect, useRef, useState } from '../../shared/deps.js';
import { X, Trash2, Eye, ChevronLeft as PrevIcon, ChevronRight as NextIcon } from 'lucide-react';
import { api } from '../../api.js';

const STORY_DURATION_MS = 5000;

function timeAgo(iso){
  const diff=Date.now()-new Date(iso).getTime();
  const mins=Math.floor(diff/60000);
  if(mins<1)return 'now';
  if(mins<60)return `${mins}m`;
  const hrs=Math.floor(mins/60);
  if(hrs<24)return `${hrs}h`;
  return `${Math.floor(hrs/24)}d`;
}

// group: ordered array of a single user's stories (oldest -> newest), as
// returned by GET /api/stories. Supports multiple stories in sequence with
// per-segment progress bars, next/prev, view tracking, a viewer list for
// the owner, and delete.
function StoryViewer({
  group,
  startIndex=0,
  close,
  onDeleted
}){

  const [index,setIndex]=useState(startIndex);
  const [progress,setProgress]=useState(0);
  const [viewersOpen,setViewersOpen]=useState(false);
  const [viewers,setViewers]=useState([]);
  const [loadingViewers,setLoadingViewers]=useState(false);
  const [viewCount,setViewCount]=useState(0);
  const timerRef=useRef(null);
  const videoRef=useRef(null);

  const story=group[index];

  const next=()=>{
    if(index<group.length-1) setIndex(i=>i+1);
    else close();
  };
  const prev=()=>{
    if(index>0) setIndex(i=>i-1);
  };

  useEffect(()=>{
    if(!story)return;
    setProgress(0);
    setViewersOpen(false);
    setViewCount(story.viewCount||0);

    api.viewStory(story.id).then(r=>setViewCount(r.viewCount)).catch(()=>{});

    if(story.mediaType==='video')return; // advances on video 'ended' instead

    const start=Date.now();
    clearInterval(timerRef.current);
    timerRef.current=setInterval(()=>{
      const pct=Math.min(100,((Date.now()-start)/STORY_DURATION_MS)*100);
      setProgress(pct);
      if(pct>=100){
        clearInterval(timerRef.current);
        next();
      }
    },50);

    return ()=>clearInterval(timerRef.current);
  },[story?.id]);

  const openViewers=async()=>{
    setViewersOpen(true);
    setLoadingViewers(true);
    try{
      const r=await api.storyViewers(story.id);
      setViewers(r.viewers||[]);
    }catch{
      setViewers([]);
    }finally{
      setLoadingViewers(false);
    }
  };

  const deleteStory=async()=>{
    try{
      await api.deleteStory(story.id);
      onDeleted?.(story.id);
      if(group.length<=1){ close(); return; }
      next();
    }catch{
      // leave the story visible if deletion failed
    }
  };

  if(!story)return null;

  const media=story.media;
  const isVideo=story.mediaType==='video';

  return (
    <div
      className="story-viewer"
      onClick={close}
    >

      <div
        className="story-viewer-inner"
        onClick={e=>e.stopPropagation()}
      >

        <div className="story-viewer-progress">
          {group.map((s,i)=>(
            <div className="story-viewer-progress-track" key={s.id}>
              <div
                className="story-viewer-progress-fill"
                style={{width:`${i<index?100:i===index?progress:0}%`}}
              />
            </div>
          ))}
        </div>

        <div className="story-viewer-header">

          <div className="story-viewer-user">

            <Avatar
              src={story.user?.avatar}
              text={story.user?.name||'?'}
            />

            <div>
              <b>{story.user?.name||'User'}</b>
              <span>{timeAgo(story.createdAt)}</span>
            </div>

          </div>

          <div className="story-viewer-actions">
            {story.isMine&&
              <button
                className="story-viewer-delete"
                onClick={deleteStory}
                aria-label="Delete story"
              >
                <Trash2/>
              </button>
            }
            <button
              className="story-viewer-close"
              onClick={close}
              aria-label="Close story"
            >
              <X/>
            </button>
          </div>

        </div>

        <button className="story-viewer-tap story-viewer-tap-prev" onClick={prev} aria-label="Previous story"><PrevIcon/></button>
        <button className="story-viewer-tap story-viewer-tap-next" onClick={next} aria-label="Next story"><NextIcon/></button>

        <div className="story-viewer-media">

          {isVideo ? (
            <video
              ref={videoRef}
              src={media}
              autoPlay
              playsInline
              onEnded={next}
            />
          ) : (
            <img
              src={media}
              alt=""
            />
          )}

        </div>

        {story.caption&&(
          <div className="story-viewer-caption">
            {story.caption}
          </div>
        )}

        {story.isMine&&
          <button className="story-viewer-views" onClick={openViewers}>
            <Eye size={16}/> {viewCount} {viewCount===1?'view':'views'}
          </button>
        }

        {viewersOpen&&
          <div className="story-viewers-sheet" onClick={e=>e.stopPropagation()}>
            <div className="sheet-handle"/>
            <b className="story-viewers-title">Viewed by</b>
            {loadingViewers&&<div className="story-viewers-empty">Loading…</div>}
            {!loadingViewers&&!viewers.length&&<div className="story-viewers-empty">No views yet</div>}
            {viewers.map(v=>(
              <div className="story-viewer-row" key={v.username}>
                <Avatar src={v.avatar} text={v.name}/>
                <div>
                  <b>{v.name}</b>
                  <span>@{v.username}</span>
                </div>
              </div>
            ))}
            <button className="story-viewers-close" onClick={()=>setViewersOpen(false)}>Close</button>
          </div>
        }

      </div>

    </div>
  );
}

export default StoryViewer;
