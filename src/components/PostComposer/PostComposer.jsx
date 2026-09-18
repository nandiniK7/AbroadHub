import { React, useEffect, useMemo, useRef, useState, Plus, Bell, MessageCircle, MoreVertical, Heart, Search, BriefcaseBusiness, MapPin, UserCircle, Compass, HomeIcon, ChevronLeft, Edit3, Camera, ImageIcon, CalendarDays, Building2, X, Send, Bookmark, Share2, Users, Settings, LogOut, ChevronRight, Check, Trash2, Menu, Globe, Phone, Mail, Lock, Eye, EyeOff, Upload, SlidersHorizontal, ArrowLeft, UserPlus, MapPinned, LocateFixed, Sparkles, Sprout, ShoppingBag, ShoppingCart, HeartPulse, ShieldCheck, Scale, Flag, Utensils, Grid2X2, CORAL, festival, wordmark, splashLogo, categories, providers, seedJobs, seedPosts, seedNotifs, seedChats, load, save, compressImageFile } from '../../shared/deps.js';

function PostComposer({
  close,
  setPosts,
  user,
  createPost
}){

  const input=useRef(null);
  const [file,setFile]=useState(null);
  const [preview,setPreview]=useState('');
  const [caption,setCaption]=useState('');
  const [error,setError]=useState('');

  const choose=e=>{
    const f=e.target.files?.[0];
    if(!f)return;

    setError('');
    setFile(f);

    if(f.type.startsWith('video/')){
      const reader=new FileReader();
      reader.onload=()=>setPreview(reader.result);
      reader.readAsDataURL(f);
      return;
    }

    // Compress photos before they ever reach state/the request body — an
    // unmodified phone photo can be several MB, well past what the backend
    // (and typical hosting proxies) accept in a single JSON request.
    compressImageFile(f)
      .then(setPreview)
      .catch(()=>setError('Unable to read that photo. Please try a different file.'));
  };

  const removeMedia=()=>{
    setFile(null);
    setPreview('');
    if(input.current) input.current.value='';
  };

  const publish=async()=>{
    if(!file || !preview){
      setError('Please select a photo or video before posting.');
      return;
    }

    const isVideo=file.type.startsWith('video/');
    const payload={
      text:caption.trim(),
      image:isVideo ? null : preview
    };

    try{
      if(createPost){
        await createPost(payload);
      }else{
        setPosts(posts=>[
          {
            id:Date.now(),
            name:user?.name || 'You',
            handle:user?.handle || (user?.username ? `@${user.username}` : '@you'),
            avatar:user?.avatar || user?.profilePhoto || '',
            profilePhoto:user?.profilePhoto || user?.avatar || '',
            isMine:true,
            text:caption.trim(),
            image:isVideo ? null : preview,
            video:isVideo ? preview : null,
            likes:0,
            liked:false,
            time:'just now'
          },
          ...posts
        ]);
      }
      close();
    }catch(err){
      setError(err.message || 'Unable to publish. Please try again.');
    }
  };

  return (
    <div
      className="backdrop post-composer-backdrop"
      onClick={close}
    >

      <div
        className="post-composer"
        onClick={e=>e.stopPropagation()}
      >

        <div className="post-composer-header">
          <button onClick={close}>
            <X/>
          </button>
          <h2>New Post</h2>
          <button
            className="post-share-button"
            onClick={publish}
          >
            Post
          </button>
        </div>

        {!file ?
          <button
            className="post-media-picker"
            onClick={()=>input.current?.click()}
          >
            <div className="post-media-icon">
              <ImageIcon/>
            </div>
            <b>Select Photo or Video</b>
            <span>Choose media from your device</span>
          </button>
          :
          <>
            <div className="post-preview-wrap">
              {file.type.startsWith('video/') ?
                <video
                  className="post-preview"
                  src={preview}
                  controls
                />
                :
                <img
                  className="post-preview"
                  src={preview}
                  alt="Post preview"
                />
              }
            </div>

            <div className="post-media-actions">
              <button onClick={()=>input.current?.click()}>
                <ImageIcon size={17}/>
                Replace
              </button>
              <button onClick={removeMedia}>
                <Trash2 size={17}/>
                Remove
              </button>
            </div>

            <textarea
              className="post-caption"
              value={caption}
              onChange={e=>setCaption(e.target.value)}
              placeholder="Write a caption..."
              maxLength={500}
            />

            <div className="post-caption-count">
              {caption.length}/500
            </div>
          </>
        }

        <input
          ref={input}
          hidden
          type="file"
          accept="image/*,video/*"
          onChange={choose}
        />

        {error&&
          <div className="post-error">
            {error}
          </div>
        }

        <button
          className="primary post-publish"
          onClick={publish}
        >
          Post
        </button>

      </div>

    </div>
  );
}

export default PostComposer;
