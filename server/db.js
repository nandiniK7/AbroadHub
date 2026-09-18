const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'abroadhub.db');
fs.mkdirSync(DB_DIR, { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  bio TEXT DEFAULT '',
  languages TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  private_account INTEGER DEFAULT 0,
  reset_token TEXT,
  reset_expires INTEGER,
  demo INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name TEXT, username TEXT, handle TEXT,
  text TEXT, image TEXT, video TEXT,
  posted_label TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id TEXT NOT NULL REFERENCES posts(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  title TEXT, company TEXT, work TEXT, type TEXT, section TEXT, country TEXT,
  location TEXT, lat REAL, lon REAL, salary TEXT, description TEXT,
  mobile TEXT, mobile_code TEXT, url TEXT, languages TEXT, logo TEXT,
  min_experience TEXT, max_experience TEXT,
  posted_label TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name TEXT, type TEXT, description TEXT, mode TEXT, audience TEXT,
  paid INTEGER DEFAULT 0, price REAL, start TEXT, end TEXT, phone TEXT, venue TEXT,
  lat REAL, lon REAL,
  instructions TEXT, website TEXT, booking TEXT, languages TEXT, photo TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  listing_type TEXT, property_type TEXT,
  description TEXT, size_sqft TEXT,
  beds INTEGER DEFAULT 0, baths INTEGER DEFAULT 0,
  price REAL, price_unit TEXT, furnish_type TEXT,
  location TEXT, lat REAL, lon REAL, address TEXT,
  phone TEXT, phone_code TEXT,
  pets_allowed INTEGER DEFAULT 0, smoking_allowed INTEGER DEFAULT 0,
  languages TEXT, photo TEXT,
  posted_label TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS property_images (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id),
  image_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  category TEXT NOT NULL,
  title TEXT NOT NULL, description TEXT,
  phone TEXT, phone_code TEXT,
  location TEXT, lat REAL, lon REAL,
  price TEXT, photo TEXT,
  posted_label TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, content_type, content_id)
);

CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL REFERENCES users(id),
  followee_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (follower_id, followee_id)
);

CREATE TABLE IF NOT EXISTS blocked_users (
  user_id TEXT NOT NULL REFERENCES users(id),
  blocked_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  sender_id TEXT NOT NULL REFERENCES users(id),
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  reported_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS support_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  media TEXT NOT NULL,
  media_type TEXT NOT NULL,
  caption TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS story_views (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(id),
  viewer_id TEXT NOT NULL REFERENCES users(id),
  viewed_at TEXT NOT NULL,
  UNIQUE(story_id, viewer_id)
);
`);

// Lightweight migration: add columns that a database created by an older
// version of this file might be missing, instead of requiring a full reset.
function ensureColumn(table, column, type) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}
ensureColumn('events', 'price', 'REAL');
ensureColumn('events', 'lat', 'REAL');
ensureColumn('events', 'lon', 'REAL');
ensureColumn('jobs', 'lat', 'REAL');
ensureColumn('jobs', 'lon', 'REAL');
ensureColumn('users', 'occupation', "TEXT DEFAULT ''");
ensureColumn('users', 'location', "TEXT DEFAULT ''");
ensureColumn('users', 'lat', 'REAL');
ensureColumn('users', 'lon', 'REAL');
ensureColumn('post_likes', 'created_at', 'TEXT');
ensureColumn('users', 'gender', "TEXT DEFAULT ''");

// Account-setup onboarding (Personal vs Service Provider/Business). A
// business/provider account is still a single row in this same table, not a
// separate listing — `occupation` (already used by the Providers/occupation
// discovery path) is reused for individual-profession providers (e.g.
// Photographer), while `business_category` is used for Nearby's business
// categories (Restaurants, Farms, etc.), which have their own discovery
// query. `business_fields` stores the small set of category-specific
// answers (e.g. cuisine, farm type) as a JSON string rather than adding a
// wide, mostly-empty column per category.
ensureColumn('users', 'account_type', "TEXT DEFAULT 'personal'");
ensureColumn('users', 'country', "TEXT DEFAULT ''");
ensureColumn('users', 'business_category', "TEXT DEFAULT ''");
ensureColumn('users', 'business_name', "TEXT DEFAULT ''");
ensureColumn('users', 'business_fields', "TEXT DEFAULT '{}'");
ensureColumn('users', 'business_hours', "TEXT DEFAULT ''");
ensureColumn('users', 'phone', "TEXT DEFAULT ''");
ensureColumn('users', 'phone_code', "TEXT DEFAULT ''");
ensureColumn('users', 'date_of_birth', "TEXT DEFAULT ''");

function seedIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (count > 0) return;

  const now = new Date().toISOString();
  const insertUser = db.prepare(`INSERT INTO users
    (id,name,username,email,password_hash,bio,languages,avatar,followers,following,demo,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,1,?)`);

  const demoUsers = [
    ['jobsinatlanta', 'Jobs In Atlanta', 'jobsinatlanta', '/india-festival.png'],
    ['abroadhub', 'AbroadHub Community', 'abroadhub', ''],
    ['emma', 'Emma', 'emma', ''],
    ['prof_test', 'prof test', 'prof_test', ''],
    ['lily', 'Lily', 'lily', ''],
    ['sham_cyprus', 'شام الزبيدي', 'sham_cyprus', ''],
    ['airbnbs', "Airbnb's", 'airbnbs', '']
  ];
  for (const [id, name, username, avatar] of demoUsers) {
    insertUser.run(id, name, username, null, null, '', '', avatar, 0, 0, now);
  }

  const insertPost = db.prepare(`INSERT INTO posts
    (id,user_id,name,username,handle,text,image,video,posted_label,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  insertPost.run(
    'seed-post-1', 'jobsinatlanta', 'Jobs In Atlanta', 'jobsinatlanta', '@jobsinatlanta',
    'Join the Atlanta India Festival 2026 for a vibrant celebration of India’s rich culture, heritage, and community.',
    '/india-festival.png', null, '18 days ago', now
  );
  insertPost.run(
    'seed-post-2', 'abroadhub', 'AbroadHub Community', 'abroadhub', '@abroadhub',
    'Welcome to AbroadHub — connect, discover and build your community abroad.',
    null, null, '2 days ago', now
  );
  db.prepare('INSERT INTO post_likes (post_id,user_id) VALUES (?,?)').run('seed-post-2', 'jobsinatlanta');

  const insertJob = db.prepare(`INSERT INTO jobs
    (id,user_id,title,company,work,type,section,country,location,salary,description,mobile,mobile_code,url,languages,logo,min_experience,max_experience,posted_label,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  insertJob.run('seed-job-1', 'jobsinatlanta', 'flutter developer', 'my job', 'Hybrid', 'Full Time', 'Technical', 'United States', 'C9C2+6H8, C...', '$120000', 'flutter dev', '', '+1', '', '', '', '', '', '18 days ago', now);
  insertJob.run('seed-job-2', 'abroadhub', 'Sample Job 1', 'Google', 'On-site', 'Full Time', 'Technical', 'United States', 'Bangalore', '$3000', 'test description 2', '', '+1', '', '', '', '', '', '18 days ago', now);
}

seedIfEmpty();

function uid() {
  return crypto.randomUUID();
}

module.exports = { db, uid };
