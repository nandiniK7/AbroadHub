import { React, useState } from '../../shared/deps.js';
import { ChevronLeft, Pencil, Trash2, ImageIcon } from 'lucide-react';
import { api } from '../../api.js';

function MyListings({ onBack, user, jobs, events, setJobs, setEvents, toast }){
  const [tab,setTab]=useState('Jobs');

  const myJobs=jobs.filter(j=>j.postedBy===user?.id);
  const myEvents=events.filter(e=>e.postedBy===user?.id);

  const removeJob=async id=>{
    try{ await api.deleteJob(id); setJobs(x=>x.filter(j=>j.id!==id)); }
    catch(err){ toast?.(err.message||'Unable to delete job'); }
  };
  const removeEvent=async id=>{
    try{ await api.deleteEvent(id); setEvents(x=>x.filter(e=>e.id!==id)); }
    catch(err){ toast?.(err.message||'Unable to delete event'); }
  };
  const editSoon=()=>toast?.('Editing listings is coming soon.');

  return (
    <main className="inner-page">
      <div className="inner-header">
        <button onClick={onBack} aria-label="Back"><ChevronLeft/></button>
      </div>

      <div className="tabs">
        {['Jobs','Housing','Events'].map(t=>(
          <button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{t}</button>
        ))}
      </div>

      {tab==='Jobs'&&(
        myJobs.length?
          myJobs.map(j=>(
            <div className="listing-row" key={j.id}>
              <div className="listing-row-thumb"><ImageIcon size={20}/></div>
              <div className="listing-row-info">
                <b>{j.title}</b>
                <span>{j.company}</span>
                {j.salary&&<b className="listing-row-price">{j.salary}</b>}
              </div>
              <div className="listing-row-actions">
                <button onClick={editSoon} aria-label="Edit"><Pencil size={17}/></button>
                <button className="danger" onClick={()=>removeJob(j.id)} aria-label="Delete"><Trash2 size={17}/></button>
              </div>
            </div>
          ))
          : <div className="empty-profile">You haven't posted any jobs yet</div>
      )}

      {tab==='Housing'&&
        <div className="empty-profile">You haven't posted any properties yet</div>
      }

      {tab==='Events'&&(
        myEvents.length?
          myEvents.map(ev=>(
            <div className="listing-row" key={ev.id}>
              <div className="listing-row-thumb">
                {ev.photo ? <img src={ev.photo} alt=""/> : <ImageIcon size={20}/>}
              </div>
              <div className="listing-row-info">
                <b>{ev.name}</b>
                {ev.paid ? null : <span>Free</span>}
              </div>
              <div className="listing-row-actions">
                <button onClick={editSoon} aria-label="Edit"><Pencil size={17}/></button>
                <button className="danger" onClick={()=>removeEvent(ev.id)} aria-label="Delete"><Trash2 size={17}/></button>
              </div>
            </div>
          ))
          : <div className="empty-profile">You haven't posted any events yet</div>
      )}
    </main>
  );
}

export default MyListings;
