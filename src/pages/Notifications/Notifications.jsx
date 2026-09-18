import { React, useMemo, useState, ChevronLeft, Heart } from '../../shared/deps.js';
import { timeAgoShort, notifDateGroup } from '../../shared/deps.js';
import { api } from '../../api.js';
import Avatar from '../../components/Avatar/Avatar.jsx';

function Notifications({
  data=[],
  readBefore,
  onMarkAllRead,
  onBack,
  openProfile,
  requireAuth,
  toast
}){

  const [followState,setFollowState]=useState({});

  const groups=useMemo(()=>{
    const map=new Map();
    for(const n of data){
      const label=notifDateGroup(n.createdAt);
      if(!map.has(label))map.set(label,[]);
      map.get(label).push(n);
    }
    return [...map.entries()];
  },[data]);

  const toggleFollow=async username=>{
    if(!requireAuth?.())return;
    try{
      const r=await api.toggleFollow(username);
      setFollowState(x=>({...x,[username]:r.user.isFollowing}));
    }catch(err){
      toast?.(err.message||'Unable to update follow status');
    }
  };

  return (
    <>
      <header className="header notifications-header">
        <button onClick={onBack} aria-label="Back"><ChevronLeft/></button>
        <h1 className="header-title">Notifications</h1>
        <button className="mark" onClick={onMarkAllRead}>
          Mark all read
        </button>
      </header>

      <main className="inner-page notifications-page">

      {!data.length &&
        <div className="notifications-empty">
          <Heart size={26}/>
          <span>No notifications yet.</span>
        </div>
      }

      {groups.map(([label,items])=>(
        <div className="notif-group" key={label}>
          <span className="notif-group-label">{label}</span>
          {items.map(n=>{
            const unread=!readBefore||new Date(n.createdAt)>new Date(readBefore);
            const following=followState[n.actorUsername]??n.isFollowingBack;
            return (
              <div className={`provider-row notif-row${unread?' unread':''}`} key={n.id}>
                <button className="notif-row-avatar" onClick={()=>openProfile?.(n.actorUsername)} aria-label={`View ${n.actorUsername}'s profile`}>
                  <Avatar src={n.actorAvatar} text={n.actorName||n.actorUsername}/>
                </button>
                <div className="provider-row-body">
                  <button className="provider-row-name" onClick={()=>openProfile?.(n.actorUsername)}>
                    <b>{n.actorUsername}</b>
                  </button>
                  <span className="notif-row-text">
                    {n.type==='follow'?'Started following you.':'Liked your post.'} {timeAgoShort(n.createdAt)}
                  </span>
                </div>
                <div className="notif-row-right">
                  {n.type==='follow'
                    ? <button className={`provider-row-follow${following?' following':''}`} onClick={()=>toggleFollow(n.actorUsername)}>
                        {following?'Following':'Follow'}
                      </button>
                    : n.postImage&&<img className="notif-row-thumb" src={n.postImage} alt=""/>
                  }
                </div>
              </div>
            );
          })}
        </div>
      ))}

      </main>
    </>
  );
}

export default Notifications;
