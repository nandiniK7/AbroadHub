import Avatar from '../../components/Avatar/Avatar.jsx';
import ShareSheet from '../../components/ShareSheet/ShareSheet.jsx';
import PostMenu from '../../components/PostMenu/PostMenu.jsx';
import CommentsSheet from '../../components/CommentsSheet/CommentsSheet.jsx';
import { api } from '../../api.js';
import { React, useState, Plus, Bookmark, Menu, Share2, MoreVertical, Heart, MessageCircle, Globe } from '../../shared/deps.js';

function Profile({
  user,
  onLogin,
  onEdit,
  posts=[],
  setPosts,
  onLike,
  nav,
  onCreate,
  requireAuth,
  openConversation,
  toast
}){

  const [tab,setTab]=useState('posts');
  const [shareOpen,setShareOpen]=useState(false);
  const [sharePost,setSharePost]=useState(null);
  const [managePostId,setManagePostId]=useState(null);
  const [confirmDeleteId,setConfirmDeleteId]=useState(null);
  const [deleting,setDeleting]=useState(false);
  const [commentsPost,setCommentsPost]=useState(null);

  const likePost=id=>{
    if(!requireAuth?.())return;
    onLike?.(id);
  };

  const onCommentsCountChange=(postId,count)=>{
    setPosts?.(ps=>ps.map(p=>p.id===postId?{...p,commentsCount:count}:p));
  };

  const confirmDelete=async()=>{
    if(!confirmDeleteId)return;
    setDeleting(true);
    try{
      await api.deletePost(confirmDeleteId);
      setPosts?.(ps=>ps.filter(p=>p.id!==confirmDeleteId));
      toast?.('Post deleted');
    }catch(err){
      toast?.(err.message||'Unable to delete post');
    }finally{
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  if(!user){
    return (
      <>
        <header className="header profile-header">
          <h1 className="header-title">Profile</h1>
        </header>
        <main className="profile-page">
          <Avatar text="AH"/>
          <h1>Your Profile</h1>
          <p>Log in to view and manage your profile.</p>
          <button className="primary" onClick={onLogin}>Log in</button>
        </main>
      </>
    );
  }

  const photo=user.avatar || user.profilePhoto || '';
  const languages=Array.isArray(user.languages)
    ? user.languages.join(', ')
    : (user.languages || '');
  // Match on isMine (server-computed from the real viewer/post owner ids)
  // or the post's @handle, never on display name — two different accounts
  // can share the same display name, and matching on it would leak other
  // users' posts into this profile.
  const ownPosts=posts.filter(p=>
    p.isMine===true ||
    p.handle===`@${user.username}`
  );
  const followers=Number(user.followers ?? 0);
  const following=Number(user.following ?? 0);
  const photoPosts=ownPosts.filter(p=>typeof p.image==='string' && p.image.trim().length>0);

  return (
    <>
      <header className="header profile-header">
        <h1 className="header-title">{user.username||'me'}</h1>
        <div className="home-header-icons">
          <button onClick={onCreate} aria-label="Create"><Plus/></button>
          <button onClick={()=>nav?.('collections')} aria-label="Saved"><Bookmark/></button>
          <button onClick={()=>nav?.('settings')} aria-label="Menu"><Menu/></button>
        </div>
      </header>

      <main className="inner-page profile-reference-page">
        <div className="profile-reference-info">
          <Avatar src={photo} text={user.name}/>
          <div className="profile-reference-name">
            <h2>{user.name || 'Your Profile'}</h2>
            {languages&&(
              <p className="profile-reference-languages">
                <Globe/>{languages}
              </p>
            )}
          </div>
        </div>

        {user.bio&&<p className="profile-reference-bio">{user.bio}</p>}

        <div className="profile-reference-stats">
          <span><b>{followers}</b> Followers</span>
          <span><b>{following}</b> Following</span>
        </div>

        <div className="profile-reference-actions">
          <button onClick={onEdit}>Edit Profile</button>
          <button onClick={()=>setShareOpen(true)}>Share Profile</button>
        </div>

        <div className="profile-reference-tabs">
          <button className={tab==='posts'?'active':''} onClick={()=>setTab('posts')}>Posts</button>
          <button className={tab==='photos'?'active':''} onClick={()=>setTab('photos')}>Photos</button>
        </div>

        {tab==='posts'&&
          <div className="profile-reference-posts">
            {ownPosts.length===0 ? (
              <div className="empty-profile">No posts yet</div>
            ) : ownPosts.map(p=>(
              <article className="profile-feed-post" key={p.id}>
                <div className="profile-feed-head">
                  <Avatar src={photo || p.avatar || p.profilePhoto} text={p.name}/>
                  <div>
                    <b>{p.name}</b>
                    <span>{p.handle}</span>
                  </div>
                  <button className="more" onClick={()=>setManagePostId(p.id)} aria-label="Post options">
                    <MoreVertical/>
                  </button>
                </div>
                {p.text&&<p>{p.text}</p>}
                {p.image&&<img src={p.image} alt=""/>}
                {p.video&&<video src={p.video} controls playsInline/>}
                <div className="profile-feed-actions">
                  <button onClick={()=>likePost(p.id)} className={p.liked?'liked':''}>
                    <Heart fill={p.liked?'currentColor':'none'}/> <span>{p.likes||0}</span>
                  </button>
                  <button onClick={()=>setCommentsPost(p)}>
                    <MessageCircle/><span>{p.commentsCount||0}</span>
                  </button>
                  <button onClick={()=>setSharePost(p)}>
                    <Share2/>
                  </button>
                </div>
              </article>
            ))}
          </div>
        }

        {tab==='photos'&&
          (photoPosts.length===0 ? (
            <div className="empty-profile">No photos yet</div>
          ) : (
            <div className="explore-masonry">
              {photoPosts.map(p=>(
                <div className="explore-card" key={p.id} style={{cursor:'default'}}>
                  <img src={p.image} alt=""/>
                </div>
              ))}
            </div>
          ))
        }
      </main>

      {shareOpen&&
        <ShareSheet
          title={`${user.name} on AbroadHub`}
          url={`${window.location.origin}/u/${user.username}`}
          close={()=>setShareOpen(false)}
          onSent={(conversationId,convoUser)=>openConversation?.(conversationId,convoUser)}
          requireAuth={requireAuth}
        />
      }

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

      {managePostId&&
        <PostMenu
          close={()=>setManagePostId(null)}
          onDelete={()=>{ setConfirmDeleteId(managePostId); setManagePostId(null); }}
        />
      }

      {confirmDeleteId&&
        <div className="backdrop" onClick={()=>setConfirmDeleteId(null)}>
          <div className="confirm-sheet" onClick={e=>e.stopPropagation()}>
            <h2 className="danger-text">Delete this post?</h2>
            <p>This removes the post permanently. This can't be undone.</p>
            <div className="confirm-sheet-actions">
              <button className="outline" onClick={()=>setConfirmDeleteId(null)} disabled={deleting}>Cancel</button>
              <button className="primary danger-button" onClick={confirmDelete} disabled={deleting}>{deleting?'Deleting…':'Delete'}</button>
            </div>
          </div>
        </div>
      }
    </>
  );
}

export default Profile;
