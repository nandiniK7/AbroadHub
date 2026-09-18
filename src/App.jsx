import React,{useEffect,useMemo,useRef,useState} from 'react';
import './styles.css';
import { load, save, seedPosts, seedJobs, seedChats, splashLogo } from './shared/deps.js';
import { api } from './api.js';
import Header from './components/Header/Header.jsx';
import Sidebar from './components/Sidebar/Sidebar.jsx';
import BottomNav from './components/BottomNav/BottomNav.jsx';
import Avatar from './components/Avatar/Avatar.jsx';
import CreateSheet from './components/CreateSheet/CreateSheet.jsx';
import PostComposer from './components/PostComposer/PostComposer.jsx';
import StoryComposer from './components/StoryComposer/StoryComposer.jsx';
import StoryViewer from './components/StoryViewer/StoryViewer.jsx';
import PostMenu from './components/PostMenu/PostMenu.jsx';
import Home from './pages/Home/Home.jsx';
import Explore from './pages/Explore/Explore.jsx';
import SearchPage from './pages/SearchPage/SearchPage.jsx';
import Jobs from './pages/Jobs/Jobs.jsx';
import Nearby from './pages/Nearby/Nearby.jsx';
import Events from './pages/Events/Events.jsx';
import Categories from './pages/Categories/Categories.jsx';
import Providers from './pages/Providers/Providers.jsx';
import ProviderProfile from './pages/ProviderProfile/ProviderProfile.jsx';
import Notifications from './pages/Notifications/Notifications.jsx';
import Inbox from './pages/Inbox/Inbox.jsx';
import Profile from './pages/Profile/Profile.jsx';
import EditProfile from './pages/EditProfile/EditProfile.jsx';
import SettingsPage from './pages/SettingsPage/SettingsPage.jsx';
import FollowRequests from './pages/FollowRequests/FollowRequests.jsx';
import BlockedUsers from './pages/BlockedUsers/BlockedUsers.jsx';
import MyListings from './pages/MyListings/MyListings.jsx';
import Collections from './pages/Collections/Collections.jsx';
import Housing from './pages/Housing/Housing.jsx';
import HousingForm from './pages/HousingForm/HousingForm.jsx';
import CategoryListing from './pages/CategoryListing/CategoryListing.jsx';
import ListingForm from './pages/ListingForm/ListingForm.jsx';
import Landing from './pages/Landing/Landing.jsx';
import Auth from './pages/Auth/Auth.jsx';
import Onboarding from './pages/Onboarding/Onboarding.jsx';
import EventForm from './pages/EventForm/EventForm.jsx';
import JobForm from './pages/JobForm/JobForm.jsx';

function App(){

  const [splash,setSplash]=useState(true);

  const [user,setUser]=useState(
    ()=>load('ah_currentUser',null)
  );

  const [page,setPage]=useState(
    ()=>load('ah_page',load('ah_token',null)?'home':'landing')
  );

  const [auth,setAuth]=useState(null);
  // Country/account-type/category/business-info collected by the onboarding
  // flow before the existing name/email/password signup screen. Kept
  // separate from `auth` so Auth.jsx's own props/behavior stay unchanged —
  // it's just handed the extra fields to merge into the register payload.
  const [onboarding,setOnboarding]=useState(null);
  const [signupExtra,setSignupExtra]=useState(null);

  const [posts,setPosts]=useState(
    ()=>load('ah_posts',seedPosts)
  );

  const [stories,setStories]=useState([]);

  const [jobs,setJobs]=useState(
    ()=>load('ah_jobs',seedJobs)
  );

  const [notifs,setNotifs]=useState([]);
  const [notifsReadBefore,setNotifsReadBefore]=useState(
    ()=>load('ah_notifs_read_before',null)
  );

  const [chats,setChats]=useState(
    ()=>load('ah_chats',seedChats)
  );

  const [events,setEvents]=useState(
    ()=>load('ah_events',[])
  );

  const [apiReady,setApiReady]=useState(false);

  const [sheet,setSheet]=useState(null);
  const [viewingStory,setViewingStory]=useState(null);

  const [toast,setToast]=useState('');

  const [profileUser,setProfileUser]=useState(null);
  const [viewingUsername,setViewingUsername]=useState(null);
  const [profileReturnPage,setProfileReturnPage]=useState('explore');
  const [inboxTarget,setInboxTarget]=useState(null);
  const [searchQuery,setSearchQuery]=useState('');
  const [searchTab,setSearchTab]=useState('Posts');
  const [jobsSavedOnly,setJobsSavedOnly]=useState(false);
  const [nearbySavedCount,setNearbySavedCount]=useState(null);
  const [editingListing,setEditingListing]=useState(null);
  const [editingProperty,setEditingProperty]=useState(null);

  useEffect(()=>{
    if(!user){ setNearbySavedCount(null); return; }
    api.saved().then(r=>setNearbySavedCount((r.saved||[]).length)).catch(()=>{});
  },[user,page]);

  useEffect(()=>{
    if(!user){ setNotifs([]); return; }
    api.notifications().then(r=>setNotifs(r.notifications||[])).catch(()=>{});
  },[user,page]);

  const [theme,setTheme]=useState(
    ()=>load('ah_theme','system')
  );

  useEffect(()=>{
    const t=setTimeout(()=>{
      setSplash(false);
    },900);

    return ()=>{
      clearTimeout(t);
    };
  },[]);


  const refreshStories=()=>api.stories().then(r=>{
    if(Array.isArray(r.stories)) setStories(r.stories);
  }).catch(()=>{});

  useEffect(()=>{
    let active=true;
    Promise.all([api.posts(), api.jobs(), api.events(), api.stories()]).then(([postData,jobData,eventData,storyData])=>{
      if(!active)return;
      if(Array.isArray(postData.posts)) setPosts(postData.posts);
      if(Array.isArray(jobData.jobs)) setJobs(jobData.jobs);
      if(Array.isArray(eventData.events)) setEvents(eventData.events);
      if(Array.isArray(storyData.stories)) setStories(storyData.stories);
      setApiReady(true);
    }).catch(()=>setApiReady(false));
    return ()=>{active=false};
  },[]);

  useEffect(()=>{
    const apply=()=>{
      const dark = theme==='dark' || (theme==='system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    };
    apply();
    if(theme!=='system')return;
    const mq=window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change',apply);
    return ()=>mq.removeEventListener('change',apply);
  },[theme]);

  useEffect(()=>{
    // Always re-validate against the server on load, even if a cached
    // user is present — a cached "logged in" user can otherwise outlive
    // an expired/invalid token, which is what caused authenticated
    // actions (like saving a profile) to fail with "Authentication
    // required" while the UI still looked logged in.
    const token=localStorage.getItem('ah_token');
    if(!token){
      if(user) setUser(null);
      return;
    }
    api.me().then(r=>setUser(r.user)).catch(()=>{
      localStorage.removeItem('ah_token');
      setUser(null);
    });
  },[]);

  useEffect(()=>{
    const onUnauthorized=()=>{
      setUser(null);
      toastIt('Your session expired. Please log in again.');
    };
    window.addEventListener('ah:unauthorized',onUnauthorized);
    return ()=>window.removeEventListener('ah:unauthorized',onUnauthorized);
  },[]);

  useEffect(()=>{
    save('ah_posts',posts);
  },[posts]);

  useEffect(()=>{
    // isMine/viewedByMe depend on who's logged in, so re-fetch whenever
    // the session changes (not just on first load).
    if(apiReady) refreshStories();
  },[user?.id]);

  useEffect(()=>{
    save('ah_jobs',jobs);
  },[jobs]);

  useEffect(()=>{
    save('ah_notifs_read_before',notifsReadBefore);
  },[notifsReadBefore]);

  useEffect(()=>{
    save('ah_chats',chats);
  },[chats]);

  useEffect(()=>{
    save('ah_events',events);
  },[events]);

  useEffect(()=>{
    save('ah_theme',theme);
  },[theme]);

  useEffect(()=>{
    save('ah_currentUser',user);
  },[user]);

  useEffect(()=>{
    save('ah_page',page);
  },[page]);

  const unreadCount=notifs.filter(n=>!notifsReadBefore||new Date(n.createdAt)>new Date(notifsReadBefore)).length;
  const markAllNotifsRead=()=>setNotifsReadBefore(new Date().toISOString());

  const logout=()=>{
    localStorage.removeItem('ah_token');
    setUser(null);
    nav('home');
  };

  const toastIt=t=>{
    setToast(t);

    setTimeout(()=>{
      setToast('');
    },1800);
  };

  const nav=p=>{
    if(p !== 'landing') save('ah_hasVisited',true);
    setPage(p);
    setAuth(null);
    setSheet(null);

    window.scrollTo(0,0);
  };

  // Redirects to login when a protected action is attempted while logged
  // out. Returns whether the action may proceed.
  const requireAuth=()=>{
    if(!user){ setAuth('login'); return false; }
    return true;
  };

  const openProfile=username=>{
    setViewingUsername(username);
    setProfileReturnPage(page==='providerProfile'?profileReturnPage:page);
    nav('providerProfile');
  };

  // Shared by Home and Profile so both feeds toggle likes against the same
  // real backend call and the same posts state.
  const likePost=async id=>{
    try{
      const result=await api.toggleLike(id);
      setPosts(ps=>ps.map(p=>p.id===id?result.post:p));
    }catch{
      setPosts(ps=>ps.map(p=>p.id===id?{...p,liked:!p.liked,likes:p.likes+(p.liked?-1:1)}:p));
    }
  };

  // Used by Jobs/ProviderProfile/ShareSheet "Message" actions so the user
  // lands directly inside the right chat instead of the bare Inbox list.
  const openConversation=(conversationId,convoUser)=>{
    setInboxTarget({conversationId,user:convoUser});
    nav('inbox');
  };

  const toggleJobsSavedOnly=()=>{
    if(!jobsSavedOnly && !requireAuth())return;
    setJobsSavedOnly(v=>!v);
  };

  /*
    SPLASH SCREEN

    White background
    + ONLY the AbroadHub airplane logo.

    No:
    - wordmark
    - tagline
    - Play Store
    - App Store
    - buttons
    - navigation
  */

  if(splash){
    return (
      <div className="splash">
        <img
          src={splashLogo}
          alt="AbroadHub"
        />
      </div>
    );
  }

  if(onboarding){
    return (
      <Onboarding
        onCancel={()=>setOnboarding(null)}
        onComplete={collected=>{
          setOnboarding(null);
          setSignupExtra(collected);
          setAuth('signup');
        }}
      />
    );
  }

  if(auth){
    return (
      <Auth
        mode={auth}
        extra={signupExtra}
        onBack={()=>{ setAuth(null); setSignupExtra(null); }}
        onRequestSignup={()=>{ setAuth(null); setSignupExtra(null); setOnboarding({step:'country'}); }}
        onSuccess={u=>{
          setUser(u);
          setAuth(null);
          setSignupExtra(null);
          nav('home');
        }}
      />
    );
  }

  if(page==='landing'){
    return (
      <Landing
        onExplore={()=>nav('home')}
        onLogin={()=>setAuth('login')}
        onSignup={()=>setOnboarding({step:'country'})}
      />
    );
  }

  return (
    <>
      <style>{`
.story-viewer{position:fixed;inset:0;z-index:10000;background:#000;display:flex;align-items:center;justify-content:center}
.story-viewer-inner{position:relative;width:100%;height:100%;max-width:520px;background:#000;overflow:hidden}
.story-viewer-progress{position:absolute;z-index:5;top:10px;left:12px;right:12px;display:flex;gap:4px}
.story-viewer-progress-track{flex:1;height:3px;background:rgba(255,255,255,.35);border-radius:5px;overflow:hidden}
.story-viewer-progress-fill{height:100%;background:#fff;border-radius:5px;transition:width .05s linear}
.story-viewer-header{position:absolute;z-index:6;top:22px;left:14px;right:14px;display:flex;align-items:center;justify-content:space-between;color:#fff}
.story-viewer-user{display:flex;align-items:center;gap:9px}
.story-viewer-user .avatar{width:34px;height:34px;border:2px solid #fff}
.story-viewer-user>div{display:flex;flex-direction:column;gap:2px}
.story-viewer-user b{font-size:13px;color:#fff}
.story-viewer-user span{font-size:10px;color:rgba(255,255,255,.75)}
.story-viewer-actions{display:flex;align-items:center;gap:10px}
.story-viewer-delete,.story-viewer-close{width:38px;height:38px;border-radius:50%;background:rgba(0,0,0,.4);color:#fff;display:grid;place-items:center}
.story-viewer-delete svg,.story-viewer-close svg{width:20px}
.story-viewer-media{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#000}
.story-viewer-media img,.story-viewer-media video{width:100%;height:100%;object-fit:contain;display:block}
.story-viewer-caption{position:absolute;z-index:6;left:20px;right:20px;bottom:35px;color:#fff;text-align:center;font-size:14px;line-height:1.4;text-shadow:0 1px 4px #000}
.story-viewer-tap{position:absolute;top:0;bottom:0;width:33%;z-index:4;background:transparent;color:transparent;opacity:0;transition:opacity .15s ease}
.story-viewer-tap:hover{opacity:.5;color:rgba(255,255,255,.7)}
.story-viewer-tap svg{width:26px}
.story-viewer-tap-prev{left:0;justify-content:flex-start;padding-left:8px;display:flex;align-items:center}
.story-viewer-tap-next{right:0;justify-content:flex-end;padding-right:8px;display:flex;align-items:center;left:33%}
.story-viewer-views{position:absolute;z-index:6;left:20px;bottom:64px;display:flex;align-items:center;gap:6px;color:#fff;background:rgba(0,0,0,.45);border-radius:20px;padding:7px 13px;font-size:12px}
.story-viewers-sheet{position:absolute;z-index:20;left:0;right:0;bottom:0;background:#fff;border-radius:20px 20px 0 0;padding:14px 20px 22px;max-height:55%;overflow-y:auto}
.story-viewers-title{display:block;margin:6px 0 12px;font-size:14px}
.story-viewers-empty{color:#999;font-size:12px;padding:20px 0;text-align:center}
.story-viewer-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f0f0f0}
.story-viewer-row .avatar{width:32px;height:32px}
.story-viewer-row b{display:block;font-size:13px}
.story-viewer-row span{font-size:11px;color:#888}
.story-viewers-close{width:100%;margin-top:10px;padding:10px;border-radius:9px;background:#f2f2f2;font-weight:700;font-size:13px}
`}</style>
      <div className="desktop-layout">

        <Sidebar
          page={page}
          nav={nav}
          user={user}
          onAuth={()=>setAuth('login')}
          onCreate={()=>setSheet('create')}
          onLogout={logout}
          unreadCount={unreadCount}
        />

        <div className="app-shell">

          <Header
            page={page}
            onCreate={()=>setSheet('create')}
            onNotifications={()=>nav('notifications')}
            onMessages={()=>nav('inbox')}
            unreadCount={unreadCount}
            titleOverride={
              page==='providerProfile' ? viewingUsername
              : page.startsWith('nearby-category-create:') ? `Add ${page.split(':')[1]}`
              : page.startsWith('nearby-category-edit:') ? `Edit ${page.split(':')[1]}`
              : page.startsWith('nearby-category:') ? page.split(':')[1]
              : null
            }
            onCreateJob={()=>setSheet('job')}
            onToggleSavedJobs={toggleJobsSavedOnly}
            jobsSavedOnly={jobsSavedOnly}
            onViewCollections={()=>nav('collections')}
            nearbySavedCount={nearbySavedCount}
          />

          {page==='home'&&
            <Home
              posts={posts}
              setPosts={setPosts}
              stories={stories}
              user={user}
              onLike={likePost}
              onStory={()=>setSheet('story')}
              onViewStory={(group,startIndex)=>setViewingStory({group,startIndex})}
              onMenu={()=>setSheet('postmenu')}
              nav={nav}
              requireAuth={requireAuth}
              toast={toastIt}
              openConversation={openConversation}
            />
          }

          {page==='explore'&&
            <Explore
              posts={posts}
              events={events}
              user={user}
              requireAuth={requireAuth}
              nav={nav}
              openConversation={openConversation}
              toast={toastIt}
            />
          }

          {page==='search'&&
            <SearchPage
              posts={posts}
              onBack={()=>nav('explore')}
              openProfile={openProfile}
              requireAuth={requireAuth}
              toast={toastIt}
              q={searchQuery}
              setQ={setSearchQuery}
              tab={searchTab}
              setTab={setSearchTab}
            />
          }

          {page==='jobs'&&
            <Jobs
              jobs={jobs}
              user={user}
              nav={nav}
              requireAuth={requireAuth}
              toast={toastIt}
              openConversation={openConversation}
              showSavedOnly={jobsSavedOnly}
              setShowSavedOnly={setJobsSavedOnly}
            />
          }

          {page==='nearby'&&
            <Nearby
              nav={nav}
              user={user}
            />
          }

          {page==='housing'&&
            <Housing
              nav={nav}
              user={user}
              requireAuth={requireAuth}
              toast={toastIt}
              openConversation={openConversation}
              openProfile={openProfile}
              onEdit={item=>{ setEditingProperty(item); nav('housing-edit'); }}
            />
          }

          {page==='housing-create'&&
            <HousingForm
              toast={toastIt}
              onDone={()=>nav('housing')}
            />
          }

          {page==='housing-edit'&&
            <HousingForm
              editItem={editingProperty}
              toast={toastIt}
              onDone={()=>{ setEditingProperty(null); nav('housing'); }}
            />
          }

          {page.startsWith('nearby-category:')&&
            <CategoryListing
              category={page.split(':')[1]}
              nav={nav}
              user={user}
              requireAuth={requireAuth}
              toast={toastIt}
              openConversation={openConversation}
              openProfile={openProfile}
              onEdit={item=>{ setEditingListing(item); nav(`nearby-category-edit:${page.split(':')[1]}`); }}
            />
          }

          {page.startsWith('nearby-category-create:')&&
            <ListingForm
              category={page.split(':')[1]}
              toast={toastIt}
              onDone={()=>nav(`nearby-category:${page.split(':')[1]}`)}
            />
          }

          {page.startsWith('nearby-category-edit:')&&
            <ListingForm
              category={page.split(':')[1]}
              editItem={editingListing}
              toast={toastIt}
              onDone={()=>{ setEditingListing(null); nav(`nearby-category:${page.split(':')[1]}`); }}
            />
          }

          {page==='categories'&&
            <Categories
              nav={nav}
            />
          }

          {page.startsWith('provider-category:')&&
            <Providers
              profession={page.split(':')[1]}
              onBack={()=>nav('categories')}
              openProfile={openProfile}
              requireAuth={requireAuth}
              toast={toastIt}
              user={user}
            />
          }

          {page==='providerProfile'&&
            <ProviderProfile
              username={viewingUsername}
              posts={posts}
              onBack={()=>nav(profileReturnPage||'explore')}
              nav={nav}
              requireAuth={requireAuth}
              toast={toastIt}
              openConversation={openConversation}
            />
          }

          {page==='events'&&
            <Events
              user={user}
              nav={nav}
              requireAuth={requireAuth}
              toast={toastIt}
              openConversation={openConversation}
            />
          }

          {page==='events-create'&&
            <EventForm
              toast={toastIt}
              onDone={()=>nav('events')}
              onCreated={ev=>setEvents(x=>[ev,...x])}
            />
          }

          {page==='postjob'&&
            <JobForm
              add={async j=>{
                const result=await api.createJob(j);
                setJobs(x=>[result.job,...x]);
              }}
              toast={toastIt}
              onDone={()=>nav('jobs')}
            />
          }

          {page==='notifications'&&
            <Notifications
              data={notifs}
              readBefore={notifsReadBefore}
              onMarkAllRead={markAllNotifsRead}
              onBack={()=>nav('home')}
              openProfile={openProfile}
              requireAuth={requireAuth}
              toast={toastIt}
            />
          }

          {page==='inbox'&&
            <Inbox
              user={user}
              onBack={()=>nav('home')}
              toast={toastIt}
              target={inboxTarget}
              onTargetConsumed={()=>setInboxTarget(null)}
              openProfile={openProfile}
            />
          }

          {page==='profile'&&
            <Profile
              user={user}
              onLogin={()=>setAuth('login')}
              onEdit={()=>nav('editprofile')}
              posts={posts}
              setPosts={setPosts}
              onLike={likePost}
              nav={nav}
              onCreate={()=>setSheet('create')}
              requireAuth={requireAuth}
              openConversation={openConversation}
              toast={toastIt}
            />
          }

          {page==='editprofile'&&
            <EditProfile
              user={user}
              setUser={setUser}
              onBack={()=>nav('profile')}
            />
          }

          {page==='settings'&&
            <SettingsPage
              user={user}
              setUser={setUser}
              logout={logout}
              nav={nav}
              theme={theme}
              setTheme={setTheme}
              toast={toastIt}
            />
          }

          {page==='followrequests'&&
            <FollowRequests onBack={()=>nav('settings')}/>
          }

          {page==='blocked'&&
            <BlockedUsers onBack={()=>nav('settings')} toast={toastIt}/>
          }

          {page==='mylistings'&&
            <MyListings
              onBack={()=>nav('settings')}
              user={user}
              jobs={jobs}
              events={events}
              setJobs={setJobs}
              setEvents={setEvents}
              toast={toastIt}
            />
          }

          {page==='collections'&&
            <Collections
              onBack={()=>nav('nearby')}
              jobs={jobs}
              events={events}
              posts={posts}
              toast={toastIt}
            />
          }

          {![
            'notifications',
            'inbox',
            'editprofile',
            'settings',
            'events',
            'events-create',
            'postjob',
            'categories',
            'providerProfile',
            'followrequests',
            'blocked',
            'mylistings',
            'collections',
            'housing-create',
            'housing-edit',
            'search'
          ].includes(page) && !page.startsWith('nearby-category:') && !page.startsWith('nearby-category-create:') && !page.startsWith('nearby-category-edit:') && !page.startsWith('provider-category:') &&
            <BottomNav
              page={page}
              nav={nav}
              onCreate={()=>setSheet('create')}
            />
          }

          {sheet==='create'&&
            <CreateSheet
              close={()=>setSheet(null)}
              nav={nav}
              onStory={()=>setSheet('story')}
              onPost={()=>setSheet('post')}
            />
          }

          {sheet==='story'&&
            <StoryComposer
              close={()=>setSheet(null)}
              onCreated={()=>refreshStories()}
              user={user}
            />
          }

          {viewingStory&&
            <StoryViewer
              group={viewingStory.group}
              startIndex={viewingStory.startIndex}
              close={()=>setViewingStory(null)}
              onDeleted={()=>refreshStories()}
            />
          }

          {sheet==='post'&&
            <PostComposer
              close={()=>setSheet(null)}
              setPosts={setPosts}
              user={user}
              createPost={async payload=>{
                const result=await api.createPost(payload);
                setPosts(current=>[result.post,...current]);
              }}
            />
          }

          {sheet==='postmenu'&&
            <PostMenu
              close={()=>setSheet(null)}
              onDelete={()=>{
                setPosts(p=>p.slice(1));
                setSheet(null);
              }}
            />
          }

          {sheet==='job'&&
            <CreateSheet
              close={()=>setSheet(null)}
              nav={p=>{
                setSheet(null);
                nav(p);
              }}
              onlyJob
            />
          }

          {toast&&
            <div className="toast">
              {toast}
            </div>
          }

        </div>
      </div>
    </>
  );
}

export default App;
