import { React, Plus, Bell, Bookmark, wordmark } from '../../shared/deps.js';
import { MessageCircleMore, Grid2X2 } from 'lucide-react';

const PAGE_TITLES = {
  explore: 'Explore',
  search: 'Search',
  jobs: 'Jobs',
  postjob: 'Post a Job',
  nearby: 'Nearby',
  categories: 'Categories',
  providers: 'Providers',
  events: 'Events',
  'events-create': 'Post an Event',
  notifications: 'Notifications',
  inbox: 'Inbox',
  profile: 'Profile',
  editprofile: 'Edit Profile',
  settings: 'Settings',
  followrequests: 'Follow Requests',
  blocked: 'Blocked Users',
  mylistings: 'My Listings',
  collections: 'Collections',
  housing: 'Housing'
};

function Header({ page, onCreate, onNotifications, onMessages, unreadCount=0, titleOverride, onCreateJob, onToggleSavedJobs, jobsSavedOnly, onViewCollections, nearbySavedCount }){

  // Inbox, Categories and every Nearby category screen (listing, create,
  // edit) own their entire header themselves — back button + title (and
  // sometimes right-side actions) all on one row — since the generic
  // page-title header would otherwise render as an unwanted extra row
  // above each page's own header.
  if(page==='inbox' || page==='categories' || page.startsWith('nearby-category') || page.startsWith('provider-category') || page==='housing' || page==='housing-create' || page==='housing-edit' || page==='notifications' || page==='profile' || page==='editprofile' || page==='search')return null;

  // Nearby keeps its Collections shortcut on the same header row as the
  // title, instead of a separate row below.
  if(page==='nearby'){
    return (
      <header className="header nearby-header">
        <div className="nearby-header-titles">
          <h1 className="header-title">Nearby</h1>
          <p className="nearby-header-subtitle">Find local services, businesses and community resources around you.</p>
        </div>

        <div className="nearby-header-actions">
          <button
            type="button"
            className="nearby-header-collections"
            onClick={onViewCollections}
            aria-label="View saved collections"
          >
            <Grid2X2 size={16}/>
            <span>{nearbySavedCount ?? '–'}</span>
          </button>

          <button type="button" onClick={onNotifications} aria-label="Notifications">
            <Bell/>
            {unreadCount>0&&
              <span className="header-badge">{unreadCount}</span>
            }
          </button>
        </div>
      </header>
    );
  }

  // Jobs keeps its bookmark (saved jobs) and add (post a job) actions on
  // the same header row as the title, instead of a separate row below.
  if(page==='jobs'){
    return (
      <header className="header jobs-header">
        <h1 className="header-title">Jobs</h1>

        <div className="home-header-icons">
          <button
            className={jobsSavedOnly?'active':''}
            onClick={onToggleSavedJobs}
            aria-pressed={jobsSavedOnly}
            aria-label={jobsSavedOnly ? 'Show all jobs' : 'Show saved jobs'}
          >
            <Bookmark fill={jobsSavedOnly?'currentColor':'none'}/>
          </button>

          <button onClick={onCreateJob} aria-label="Post a job">
            <Plus/>
          </button>
        </div>
      </header>
    );
  }

  // Home is the main feed/landing page, so it keeps the AbroadHub brand
  // header with real quick actions instead of a plain page title.
  if(page==='home'){
    return (
      <header className="header home-header">
        <img
          src={wordmark}
          className="home-header-logo"
          alt="AbroadHub"
        />

        <div className="home-header-icons">
          <button className="home-header-add" onClick={onCreate} aria-label="Create">
            <Plus/>
          </button>

          <button onClick={onNotifications} aria-label="Notifications">
            <Bell/>
            {unreadCount>0&&
              <span className="header-badge">{unreadCount}</span>
            }
          </button>

          <button onClick={onMessages} aria-label="Inbox">
            <MessageCircleMore/>
          </button>
        </div>
      </header>
    );
  }

  const title = titleOverride || PAGE_TITLES[page] || 'AbroadHub';

  return (
    <header className="header">
      <h1 className="header-title">{title}</h1>
    </header>
  );
}

export default Header;
