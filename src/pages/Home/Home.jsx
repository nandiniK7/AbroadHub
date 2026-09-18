import Avatar from '../../components/Avatar/Avatar.jsx';
import { React, useEffect, useMemo, useRef, useState, Plus, Bell, MessageCircle, MoreVertical, Heart, Search, BriefcaseBusiness, MapPin, UserCircle, Compass, HomeIcon, ChevronLeft, Edit3, Camera, ImageIcon, CalendarDays, Building2, X, Send, Bookmark, Share2, Users, Settings, LogOut, ChevronRight, Check, Trash2, Menu, Globe, Phone, Mail, Lock, Eye, EyeOff, Upload, SlidersHorizontal, ArrowLeft, UserPlus, MapPinned, LocateFixed, Sparkles, Sprout, ShoppingBag, ShoppingCart, HeartPulse, ShieldCheck, Scale, Flag, Utensils, Grid2X2, CORAL, festival, wordmark, splashLogo, categories, providers, seedJobs, seedPosts, seedNotifs, seedChats, load, save } from '../../shared/deps.js';
import { api } from '../../api.js';
import ShareSheet from '../../components/ShareSheet/ShareSheet.jsx';
import CommentsSheet from '../../components/CommentsSheet/CommentsSheet.jsx';

function Home({
  posts,
  setPosts,
  stories,
  user,
  onLike,
  onStory,
  onViewStory,
  onMenu,
  nav,
  requireAuth,
  toast,
  openConversation
}){

  const [savedPosts,setSavedPosts]=useState(()=>new Set());
  const [sharePost,setSharePost]=useState(null);
  const [commentsPost,setCommentsPost]=useState(null);
  const onCommentsCountChange=(postId,count)=>{
    setPosts?.(ps=>ps.map(p=>p.id===postId?{...p,commentsCount:count}:p));
  };

  useEffect(()=>{
    if(!user){ setSavedPosts(new Set()); return; }
    api.saved('post').then(r=>{
      setSavedPosts(new Set((r.saved||[]).map(s=>s.contentId)));
    }).catch(()=>{});
  },[user]);

  const toggleSavePost=async id=>{
    if(!requireAuth())return;
    const isSaved=savedPosts.has(id);
    setSavedPosts(prev=>{
      const next=new Set(prev);
      isSaved?next.delete(id):next.add(id);
      return next;
    });
    try{
      isSaved ? await api.unsave('post',id) : await api.save('post',id);
    }catch{
      setSavedPosts(prev=>{
        const next=new Set(prev);
        isSaved?next.add(id):next.delete(id);
        return next;
      });
    }
  };

  // Group individual stories (oldest -> newest, as returned by the API)
  // into one entry per user so multiple stories from the same person show
  // as a single avatar with a sequence, Instagram-style, instead of one
  // card per story.
  const groups=[];
  const groupIndex={};
  stories.forEach(s=>{
    if(!(s.userId in groupIndex)){
      groupIndex[s.userId]=groups.length;
      groups.push({ userId:s.userId, user:s.user, isMine:s.isMine, items:[] });
    }
    groups[groupIndex[s.userId]].items.push(s);
  });

  const myGroup=groups.find(g=>g.isMine);
  const otherGroups=groups.filter(g=>!g.isMine);

  const openGroup=(group,startIndex=0)=>onViewStory(group.items,startIndex);

  return (
    <main className="home-page">

      <div className="story-row">

        {myGroup ? (
          <div className="story-card my-story-card">
            <button className="story-open-button" onClick={()=>openGroup(myGroup)}>
              <div className={`story-ring ${myGroup.items.every(s=>s.viewedByMe)?'seen':''}`}>
                {myGroup.items[myGroup.items.length-1].mediaType==='video' ? (
                  <video
                    src={myGroup.items[myGroup.items.length-1].media}
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={myGroup.items[myGroup.items.length-1].media}
                    alt=""
                  />
                )}
              </div>
              <span>You</span>
            </button>
            <button
              className="story-plus-btn"
              onClick={onStory}
              aria-label="Add another story"
            >+</button>
          </div>
        ) : (
          <button
            className="story-card"
            onClick={onStory}
          >
            <div className="story-ring">
              <div className="story-avatar">
                <Camera size={23}/>
              </div>
              <span className="story-plus">+</span>
            </div>
            <span>Add Story</span>
          </button>
        )}

        {otherGroups.map(g=>{
          const last=g.items[g.items.length-1];
          const allSeen=g.items.every(s=>s.viewedByMe);
          return (
            <button
              className="story-card"
              key={g.userId}
              onClick={()=>openGroup(g)}
            >
              <div className={`story-ring ${allSeen?'seen':''}`}>
                {last.mediaType==='video' ? (
                  <video src={last.media} muted playsInline/>
                ) : (
                  <img src={last.media} alt=""/>
                )}
              </div>
              <span>{g.user?.name||'User'}</span>
            </button>
          );
        })}

      </div>

      <section className="feed">

        {posts.map(p=>(
          <article
            className="feed-post"
            key={p.id}
          >

            <div className="post-head">

              <Avatar
                src={
                  (user && (
                    p.handle===`@${user.username}` ||
                    p.name===user.name
                  ))
                    ? (user.avatar || user.profilePhoto || '')
                    : (p.avatar || p.profilePhoto || '')
                }
                text={p.name}
              />

              <div className="post-user">
                <b>{p.name}</b>
                <span>{p.handle}</span>
              </div>

              <button
                className="more"
                onClick={onMenu}
              >
                <MoreVertical/>
              </button>

            </div>

            <p>
              {p.text}
              {p.text.length>100&&(
                <button className="more-link">
                  View more
                </button>
              )}
            </p>

            {p.image&&(
              <img
                className="post-image"
                src={p.image}
                alt=""
              />
            )}

            {p.video&&(
              <video
                className="post-image"
                src={p.video}
                controls
                playsInline
              />
            )}

            <div className="post-actions">

              <button
                onClick={()=>onLike(p.id)}
                className={p.liked?'liked':''}
              >
                <Heart
                  fill={p.liked?'currentColor':'none'}
                />
                <span>{p.likes||0}</span>
              </button>

              <button onClick={()=>setCommentsPost(p)}>
                <MessageCircle/><span>{p.commentsCount||0}</span>
              </button>

              <button onClick={()=>setSharePost(p)}>
                <Share2/>
              </button>

              <button
                className="post-save-button"
                onClick={()=>toggleSavePost(p.id)}
                aria-label={savedPosts.has(p.id)?'Remove from Collections':'Save to Collections'}
              >
                <Bookmark fill={savedPosts.has(p.id)?'currentColor':'none'}/>
              </button>

            </div>

            <small className="post-time">
              {p.time||'now'}
            </small>

          </article>
        ))}

      </section>

      {sharePost&&
        <ShareSheet
          title={sharePost.text?.slice(0,80)||'AbroadHub post'}
          url={`${window.location.origin}/posts/${sharePost.id}`}
          close={()=>setSharePost(null)}
          onSent={(conversationId,convoUser)=>openConversation?.(conversationId,convoUser)}
          requireAuth={requireAuth}
        />
      }

      {commentsPost&&
        <CommentsSheet
          post={commentsPost}
          user={user}
          requireAuth={requireAuth}
          toast={toast}
          close={()=>setCommentsPost(null)}
          onCountChange={onCommentsCountChange}
        />
      }

    </main>
  );
}

export default Home;
