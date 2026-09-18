import { React, useEffect, useState } from '../../shared/deps.js';
import { ChevronLeft, UserX } from 'lucide-react';
import Avatar from '../../components/Avatar/Avatar.jsx';
import { api } from '../../api.js';

function BlockedUsers({ onBack, toast }){
  const [blocked,setBlocked]=useState([]);
  const [loading,setLoading]=useState(true);

  const load=()=>{
    api.blocked().then(r=>{ setBlocked(r.blocked||[]); setLoading(false); }).catch(()=>setLoading(false));
  };

  useEffect(()=>{ load(); },[]);

  const unblock=async username=>{
    try{
      await api.toggleBlock(username);
      setBlocked(b=>b.filter(u=>u.username!==username));
      toast?.('User unblocked');
    }catch(err){
      toast?.(err.message||'Unable to unblock user');
    }
  };

  return (
    <main className="inner-page">
      <div className="inner-header">
        <button onClick={onBack} aria-label="Back"><ChevronLeft/></button>
      </div>

      {loading&&<div className="empty-state-block"><span>Loading…</span></div>}

      {!loading&&!blocked.length&&
        <div className="empty-state-block">
          <UserX size={40}/>
          <b>You have not blocked any users</b>
        </div>
      }

      {blocked.map(u=>(
        <div className="provider-row" key={u.username}>
          <Avatar src={u.avatar} text={u.name}/>
          <div>
            <b>{u.name}</b>
            <span>@{u.username}</span>
          </div>
          <button onClick={()=>unblock(u.username)}>Unblock</button>
        </div>
      ))}
    </main>
  );
}

export default BlockedUsers;
