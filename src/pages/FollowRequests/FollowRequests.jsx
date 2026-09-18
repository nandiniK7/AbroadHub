import { React } from '../../shared/deps.js';
import { ChevronLeft, UserPlus } from 'lucide-react';

// AbroadHub follows are instant (no request/approval step exists in this
// product yet), so there will never be a pending request to show — this
// page's job is just to honestly reflect that instead of being a dead link.
function FollowRequests({ onBack }){
  return (
    <main className="inner-page">
      <div className="inner-header">
        <button onClick={onBack} aria-label="Back"><ChevronLeft/></button>
      </div>
      <div className="empty-state-block">
        <UserPlus size={40}/>
        <b>No pending requests</b>
      </div>
    </main>
  );
}

export default FollowRequests;
