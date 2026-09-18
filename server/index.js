const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db, uid } = require('./db.js');

const PORT = Number(process.env.PORT || 8787);
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SECRET = process.env.JWT_SECRET || 'abroadhub-launch-secret-change-me';
const MAX_BODY_BYTES = 10 * 1024 * 1024;
const ACCOUNT_TYPES = ['personal', 'business'];
const CATEGORY_TYPES = ['business', 'provider'];
const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say'];

// Backend password policy — the frontend gives live feedback for the same
// rules, but that's advisory only; this is the real gate. Never trust a
// password that only passed client-side checks.
function passwordPolicyError(password) {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include a number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include a special character.';
  return null;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let tooLarge = false;
    req.on('data', c => {
      if (tooLarge) return;
      raw += c;
      // Used to call req.destroy() here, which tears down the socket
      // `res` also writes to — the client saw a bare network error instead
      // of a real response. Just stop buffering and let the route's normal
      // error handling send real JSON once the stream finishes.
      if (raw.length > MAX_BODY_BYTES) {
        tooLarge = true;
        raw = '';
        const err = new Error('That upload is too large. Please choose a smaller photo or video.');
        err.status = 413;
        reject(err);
      }
    });
    req.on('end', () => {
      if (tooLarge) return;
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', err => { if (!tooLarge) reject(err); });
  });
}
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || '').split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}
function base64url(v) { return Buffer.from(v).toString('base64url'); }
function signToken(payload) {
  const head = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 7 * 86400000 }));
  const sig = crypto.createHmac('sha256', SECRET).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}
function readToken(token) {
  try {
    const [head, body, sig] = String(token || '').split('.');
    if (!head || !body || !sig) return null;
    const expected = crypto.createHmac('sha256', SECRET).update(`${head}.${body}`).digest('base64url');
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}
function authUser(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const payload = readToken(token);
  if (!payload) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub) || null;
}

// ---- serialization helpers ----
function followerCount(userId) { return db.prepare('SELECT COUNT(*) c FROM follows WHERE followee_id = ?').get(userId).c; }
function followingCount(userId) { return db.prepare('SELECT COUNT(*) c FROM follows WHERE follower_id = ?').get(userId).c; }
function isFollowing(followerId, followeeId) {
  if (!followerId) return false;
  return !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?').get(followerId, followeeId);
}
function isBlocked(userId, blockedId) {
  if (!userId) return false;
  return !!db.prepare('SELECT 1 FROM blocked_users WHERE user_id = ? AND blocked_id = ?').get(userId, blockedId);
}
function parseBusinessFields(raw) {
  try { return JSON.parse(raw || '{}') || {}; } catch { return {}; }
}
function serializeSelf(user) {
  if (!user) return null;
  return {
    id: user.id, name: user.name, username: user.username, email: user.email,
    bio: user.bio || '', languages: user.languages || '',
    occupation: user.occupation || '', location: user.location || '',
    gender: user.gender || '', dateOfBirth: user.date_of_birth || '',
    lat: user.lat ?? null, lon: user.lon ?? null,
    avatar: user.avatar || '', profilePhoto: user.avatar || '',
    followers: followerCount(user.id), following: followingCount(user.id),
    privateAccount: !!user.private_account,
    accountType: user.account_type || 'personal', country: user.country || '',
    businessCategory: user.business_category || '', businessName: user.business_name || '',
    businessFields: parseBusinessFields(user.business_fields), businessHours: user.business_hours || '',
    phone: user.phone || '', phoneCode: user.phone_code || '',
    createdAt: user.created_at
  };
}
function serializePublic(user, viewerId) {
  if (!user) return null;
  return {
    id: user.id, name: user.name, username: user.username,
    bio: user.bio || '', languages: user.languages || '',
    occupation: user.occupation || '', location: user.location || '',
    lat: user.lat ?? null, lon: user.lon ?? null,
    avatar: user.avatar || '', profilePhoto: user.avatar || '',
    followers: followerCount(user.id), following: followingCount(user.id),
    isFollowing: isFollowing(viewerId, user.id),
    isBlocked: isBlocked(viewerId, user.id),
    isMe: viewerId === user.id,
    accountType: user.account_type || 'personal',
    businessCategory: user.business_category || '', businessName: user.business_name || '',
    businessFields: parseBusinessFields(user.business_fields), businessHours: user.business_hours || '',
    phone: user.phone || '', phoneCode: user.phone_code || ''
  };
}
function serializePost(post, viewerId) {
  const likes = db.prepare('SELECT COUNT(*) c FROM post_likes WHERE post_id = ?').get(post.id).c;
  const liked = viewerId ? !!db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(post.id, viewerId) : false;
  const commentsCount = db.prepare('SELECT COUNT(*) c FROM comments WHERE post_id = ?').get(post.id).c;
  return {
    id: post.id, name: post.name, username: post.username, handle: post.handle,
    text: post.text, image: post.image, video: post.video,
    likes, liked, commentsCount, isMine: viewerId === post.user_id,
    time: post.posted_label || 'just now', createdAt: post.created_at
  };
}
function serializeComment(comment, viewerId) {
  const author = db.prepare('SELECT * FROM users WHERE id = ?').get(comment.user_id);
  return {
    id: comment.id, postId: comment.post_id, text: comment.text, createdAt: comment.created_at,
    isMine: viewerId === comment.user_id,
    username: author?.username || 'deleted', name: author?.name || 'Deleted user',
    avatar: author?.avatar || '', occupation: author?.occupation || ''
  };
}
function posterUsername(userId) {
  if (!userId) return null;
  const row = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
  return row ? row.username : null;
}
function serializeJob(job) {
  return {
    id: job.id, title: job.title, company: job.company, work: job.work, type: job.type,
    section: job.section, country: job.country, location: job.location, lat: job.lat ?? null, lon: job.lon ?? null,
    salary: job.salary, description: job.description, mobile: job.mobile, mobileCode: job.mobile_code, url: job.url,
    languages: job.languages, logo: job.logo, minExperience: job.min_experience, maxExperience: job.max_experience,
    postedBy: job.user_id, postedByUsername: posterUsername(job.user_id), posted: job.posted_label || 'just now',
    createdAt: job.created_at, savedCount: savedCount('job', job.id)
  };
}
function savedCount(contentType, contentId) {
  return db.prepare('SELECT COUNT(*) c FROM saved_items WHERE content_type = ? AND content_id = ?').get(contentType, contentId).c;
}
function serializeEvent(ev) {
  return {
    id: ev.id, name: ev.name, type: ev.type, description: ev.description, mode: ev.mode,
    audience: ev.audience, paid: !!ev.paid, price: ev.price ?? null, start: ev.start, end: ev.end, phone: ev.phone,
    venue: ev.venue, lat: ev.lat ?? null, lon: ev.lon ?? null,
    instructions: ev.instructions, website: ev.website, booking: ev.booking,
    languages: ev.languages, photo: ev.photo, postedBy: ev.user_id, postedByUsername: posterUsername(ev.user_id),
    postedAt: ev.created_at, savedCount: savedCount('event', ev.id)
  };
}
function propertyImages(propertyId) {
  return db.prepare('SELECT image_url FROM property_images WHERE property_id = ? ORDER BY sort_order ASC').all(propertyId).map(r => r.image_url);
}
function setPropertyImages(propertyId, images) {
  db.prepare('DELETE FROM property_images WHERE property_id = ?').run(propertyId);
  const insert = db.prepare('INSERT INTO property_images (id, property_id, image_url, sort_order, created_at) VALUES (?,?,?,?,?)');
  const now = new Date().toISOString();
  (images || []).filter(Boolean).forEach((url, i) => insert.run(uid(), propertyId, url, i, now));
}
function serializeProperty(p) {
  const images = propertyImages(p.id);
  return {
    id: p.id, title: p.title, listingType: p.listing_type, propertyType: p.property_type,
    description: p.description, sizeSqft: p.size_sqft, beds: p.beds ?? 0, baths: p.baths ?? 0,
    price: p.price ?? null, priceUnit: p.price_unit, furnishType: p.furnish_type,
    location: p.location, lat: p.lat ?? null, lon: p.lon ?? null, address: p.address,
    phone: p.phone, phoneCode: p.phone_code,
    petsAllowed: !!p.pets_allowed, smokingAllowed: !!p.smoking_allowed,
    languages: p.languages,
    images, photo: images[0] || p.photo || '',
    postedBy: p.user_id, postedByUsername: posterUsername(p.user_id),
    posted: p.posted_label || 'just now', createdAt: p.created_at, savedCount: savedCount('property', p.id)
  };
}
function serializeListing(l) {
  return {
    id: l.id, category: l.category, title: l.title, description: l.description,
    phone: l.phone, phoneCode: l.phone_code, location: l.location, lat: l.lat ?? null, lon: l.lon ?? null,
    price: l.price, photo: l.photo, postedBy: l.user_id, postedByUsername: posterUsername(l.user_id),
    posted: l.posted_label || 'just now', createdAt: l.created_at, savedCount: savedCount('listing', l.id)
  };
}
function getOrCreateConversation(userIdA, userIdB) {
  const existing = db.prepare(`
    SELECT cp1.conversation_id AS id FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.user_id = ? AND cp2.user_id = ?
  `).get(userIdA, userIdB);
  if (existing) return existing.id;
  const id = uid();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO conversations (id, created_at) VALUES (?,?)').run(id, now);
  db.prepare('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?,?)').run(id, userIdA);
  db.prepare('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?,?)').run(id, userIdB);
  return id;
}
function serveStatic(req, res) {
  let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname === '/') pathname = '/index.html';
  const candidate = path.join(DIST, pathname);
  if (!candidate.startsWith(DIST)) return false;
  let file = candidate;
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  if (!fs.existsSync(file)) return false;
  const ext = path.extname(file);
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '*';
  const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (!url.pathname.startsWith('/api/')) return serveStatic(req, res) || send(res, 404, { error: 'Not found' });
  const pathParts = url.pathname.split('/').filter(Boolean);
  const route = pathParts.slice(1).join('/');

  try {
    if (route === 'health' && req.method === 'GET') return send(res, 200, { ok: true, service: 'AbroadHub API' }, cors);

    // Read-only pre-signup check so onboarding can tell the user a username
    // is taken before they submit — registration itself still falls back to
    // an auto-suffixed username on a collision rather than failing, so this
    // is purely advisory and never blocks account creation.
    if (route === 'auth/username-available' && req.method === 'GET') {
      const u = String(url.searchParams.get('u') || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
      if (!u) return send(res, 200, { available: false }, cors);
      const taken = !!db.prepare('SELECT 1 FROM users WHERE username = ?').get(u);
      return send(res, 200, { available: !taken }, cors);
    }

    // ---- AUTH ----
    if (route === 'auth/register' && req.method === 'POST') {
      const b = await parseBody(req);
      const name = String(b.name || '').trim(); const email = String(b.email || '').trim().toLowerCase(); const password = String(b.password || '');
      if (!name || !email) return send(res, 400, { error: 'Name and a valid email are required.' }, cors);
      const pwError = passwordPolicyError(password);
      if (pwError) return send(res, 400, { error: pwError }, cors);
      if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) return send(res, 409, { error: 'An account with this email already exists.' }, cors);

      // Onboarding fields (all optional — a bare name/email/password signup
      // still works exactly as before). accountType/categoryType are the
      // only values checked against a fixed allow-list here; everything
      // else the frontend restricts to picker/search choices already, so
      // this stays a length/shape check rather than duplicating the full
      // country/category lists server-side.
      const accountType = ACCOUNT_TYPES.includes(b.accountType) ? b.accountType : 'personal';
      const country = String(b.country || '').trim().slice(0, 60);
      let categoryType = CATEGORY_TYPES.includes(b.categoryType) ? b.categoryType : '';
      const category = String(b.category || '').trim().slice(0, 60);
      if (accountType === 'business' && (!category || !categoryType)) {
        return send(res, 400, { error: 'A category is required for a Service Provider / Business account.' }, cors);
      }
      const businessName = String(b.businessName || '').trim().slice(0, 120);
      const businessHours = String(b.businessHours || '').trim().slice(0, 60);
      const phone = String(b.phone || '').trim().slice(0, 30);
      const phoneCode = String(b.phoneCode || '').trim().slice(0, 10);
      const bio = String(b.description || '').trim().slice(0, 1500);
      const languages = Array.isArray(b.languages) ? b.languages.join(', ') : String(b.languages || '').trim();
      const location = String(b.location || '').trim().slice(0, 200);
      const lat = typeof b.lat === 'number' ? b.lat : null;
      const lon = typeof b.lon === 'number' ? b.lon : null;
      // Optional profile-setup fields carried in from the Service Provider
      // onboarding screen — a bare name/email/password signup still works
      // unmodified since every one of these defaults to empty/none.
      const gender = GENDER_OPTIONS.includes(b.gender) ? b.gender : '';
      const dateOfBirth = String(b.dateOfBirth || '').trim().slice(0, 20);
      const avatar = typeof b.avatar === 'string' ? b.avatar.slice(0, 5_000_000) : '';
      let occupation = ''; let businessCategory = '';
      if (accountType === 'business') {
        if (categoryType === 'provider') occupation = category; else businessCategory = category;
      }
      let businessFieldsJson = '{}';
      if (b.businessFields && typeof b.businessFields === 'object') {
        try { businessFieldsJson = JSON.stringify(b.businessFields).slice(0, 4000); } catch { businessFieldsJson = '{}'; }
      }

      const usernameBase = (name || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24) || 'user';
      // A client-chosen username (from the profile-setup screen) is used
      // when it's valid and free; otherwise this falls back to the same
      // auto-generated username a bare signup has always gotten.
      const requestedUsername = String(b.username || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
      let username = requestedUsername && !db.prepare('SELECT 1 FROM users WHERE username = ?').get(requestedUsername)
        ? requestedUsername
        : usernameBase;
      let n = 1;
      while (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) username = `${usernameBase}${n++}`;
      const id = uid();
      const now = new Date().toISOString();
      db.prepare(`INSERT INTO users
        (id,name,username,email,password_hash,bio,languages,avatar,demo,created_at,
         account_type,country,occupation,business_category,business_name,business_fields,business_hours,
         phone,phone_code,location,lat,lon,gender,date_of_birth)
        VALUES (?,?,?,?,?,?,?,?,0,?, ?,?,?,?,?,?,?, ?,?,?,?,?,?,?)`)
        .run(id, name, username, email, hashPassword(password), bio, languages, avatar, now,
          accountType, country, occupation, businessCategory, businessName, businessFieldsJson, businessHours,
          phone, phoneCode, location, lat, lon, gender, dateOfBirth);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      return send(res, 201, { user: serializeSelf(user), message: 'Account created. Please log in.' }, cors);
    }

    if (route === 'auth/login' && req.method === 'POST') {
      const b = await parseBody(req); const email = String(b.email || '').trim().toLowerCase(); const password = String(b.password || '');
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) return send(res, 401, { error: 'Incorrect email or password.' }, cors);
      return send(res, 200, { token: signToken({ sub: user.id }), user: serializeSelf(user) }, cors);
    }

    if (route === 'auth/forgot-password' && req.method === 'POST') {
      const b = await parseBody(req); const email = String(b.email || '').trim().toLowerCase();
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) return send(res, 200, { message: 'If that email is registered, reset instructions are ready.' }, cors);
      const raw = crypto.randomBytes(24).toString('hex');
      db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?').run(raw, Date.now() + 15 * 60 * 1000, user.id);
      return send(res, 200, { message: 'Reset token generated for testing.', resetToken: raw }, cors);
    }

    if (route === 'auth/reset-password' && req.method === 'POST') {
      const b = await parseBody(req); const token = String(b.token || ''); const password = String(b.password || '');
      const user = db.prepare('SELECT * FROM users WHERE reset_token = ? AND reset_expires > ?').get(token, Date.now());
      if (!user) return send(res, 400, { error: 'Reset token is invalid or expired.' }, cors);
      const pwError = passwordPolicyError(password);
      if (pwError) return send(res, 400, { error: pwError }, cors);
      db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?').run(hashPassword(password), user.id);
      return send(res, 200, { message: 'Password updated. You can now log in.' }, cors);
    }

    if (route === 'me' && req.method === 'GET') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      return send(res, 200, { user: serializeSelf(user) }, cors);
    }
    if (route === 'me' && req.method === 'PUT') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      const b = await parseBody(req);
      const name = String(b.name ?? user.name).trim();
      const bio = String(b.bio ?? user.bio ?? '');
      const languages = Array.isArray(b.languages) ? b.languages.join(', ') : String(b.languages ?? user.languages ?? '');
      const avatar = b.avatar ?? b.profilePhoto ?? user.avatar ?? '';
      const privateAccount = typeof b.privateAccount === 'boolean' ? (b.privateAccount ? 1 : 0) : user.private_account;
      const occupation = String(b.occupation ?? user.occupation ?? '');
      const location = String(b.location ?? user.location ?? '');
      const gender = String(b.gender ?? user.gender ?? '');
      const lat = b.lat !== undefined ? b.lat : user.lat;
      const lon = b.lon !== undefined ? b.lon : user.lon;
      db.prepare('UPDATE users SET name = ?, bio = ?, languages = ?, avatar = ?, private_account = ?, occupation = ?, location = ?, gender = ?, lat = ?, lon = ? WHERE id = ?')
        .run(name, bio, languages, avatar, privateAccount, occupation, location, gender, lat ?? null, lon ?? null, user.id);
      const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      return send(res, 200, { user: serializeSelf(updated) }, cors);
    }
    if (route === 'me' && req.method === 'DELETE') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      const b = await parseBody(req);
      if (!user.password_hash || !verifyPassword(String(b.password || ''), user.password_hash)) {
        return send(res, 401, { error: 'Please confirm your password to delete your account.' }, cors);
      }
      db.prepare('DELETE FROM post_likes WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM posts WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM saved_items WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM follows WHERE follower_id = ? OR followee_id = ?').run(user.id, user.id);
      db.prepare('DELETE FROM blocked_users WHERE user_id = ? OR blocked_id = ?').run(user.id, user.id);
      db.prepare('DELETE FROM messages WHERE sender_id = ?').run(user.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
      return send(res, 200, { message: 'Account deleted.' }, cors);
    }

    // ---- POSTS ----
    if (route === 'posts' && req.method === 'GET') {
      const viewer = authUser(req);
      const rows = db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
      return send(res, 200, { posts: rows.map(p => serializePost(p, viewer?.id)) }, cors);
    }
    if (route === 'posts' && req.method === 'POST') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Please log in to create a post.' }, cors);
      const b = await parseBody(req);
      const text = String(b.text || '').trim(); const image = b.image || null;
      if (!text && !image) return send(res, 400, { error: 'Add text or an image before publishing.' }, cors);
      const id = uid(); const now = new Date().toISOString();
      db.prepare(`INSERT INTO posts (id,user_id,name,username,handle,text,image,video,posted_label,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(id, user.id, user.name, user.username, `@${user.username}`, text, image, null, 'just now', now);
      const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
      return send(res, 201, { post: serializePost(post, user.id) }, cors);
    }
    if (pathParts[1] === 'posts' && pathParts[3] === 'like' && req.method === 'POST') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Please log in to like posts.' }, cors);
      const postId = pathParts[2];
      const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
      if (!post) return send(res, 404, { error: 'Post not found.' }, cors);
      const already = db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(postId, user.id);
      if (already) db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(postId, user.id);
      else db.prepare('INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?,?,?)').run(postId, user.id, new Date().toISOString());
      return send(res, 200, { post: serializePost(post, user.id) }, cors);
    }
    if (pathParts[1] === 'posts' && pathParts.length === 3 && req.method === 'PUT') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(pathParts[2]);
      if (!post) return send(res, 404, { error: 'Post not found.' }, cors);
      if (post.user_id !== user.id) return send(res, 403, { error: 'You can only edit your own posts.' }, cors);
      const b = await parseBody(req);
      const text = String(b.text || '').trim();
      if (!text && !post.image && !post.video) return send(res, 400, { error: 'A post needs text or media.' }, cors);
      db.prepare('UPDATE posts SET text = ? WHERE id = ?').run(text, post.id);
      const updated = db.prepare('SELECT * FROM posts WHERE id = ?').get(post.id);
      return send(res, 200, { post: serializePost(updated, user.id) }, cors);
    }
    if (pathParts[1] === 'posts' && pathParts.length === 3 && req.method === 'DELETE') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(pathParts[2]);
      if (!post) return send(res, 404, { error: 'Post not found.' }, cors);
      if (post.user_id !== user.id) return send(res, 403, { error: 'You can only delete your own posts.' }, cors);
      db.prepare('DELETE FROM post_likes WHERE post_id = ?').run(post.id);
      db.prepare('DELETE FROM comments WHERE post_id = ?').run(post.id);
      db.prepare('DELETE FROM posts WHERE id = ?').run(post.id);
      return send(res, 200, { success: true }, cors);
    }

    if (pathParts[1] === 'posts' && pathParts[3] === 'comments' && req.method === 'GET') {
      const viewer = authUser(req);
      const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(pathParts[2]);
      if (!post) return send(res, 404, { error: 'Post not found.' }, cors);
      const rows = db.prepare('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC').all(post.id);
      return send(res, 200, { comments: rows.map(c => serializeComment(c, viewer?.id)) }, cors);
    }
    if (pathParts[1] === 'posts' && pathParts[3] === 'comments' && req.method === 'POST') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Please log in to comment.' }, cors);
      const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(pathParts[2]);
      if (!post) return send(res, 404, { error: 'Post not found.' }, cors);
      const b = await parseBody(req);
      const text = String(b.text || '').trim().slice(0, 1000);
      if (!text) return send(res, 400, { error: 'Comment cannot be empty.' }, cors);
      const id = uid(); const now = new Date().toISOString();
      db.prepare('INSERT INTO comments (id,post_id,user_id,text,created_at) VALUES (?,?,?,?,?)').run(id, post.id, user.id, text, now);
      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
      return send(res, 201, { comment: serializeComment(comment, user.id) }, cors);
    }
    if (pathParts[1] === 'comments' && pathParts.length === 3 && req.method === 'DELETE') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(pathParts[2]);
      if (!comment) return send(res, 404, { error: 'Comment not found.' }, cors);
      if (comment.user_id !== user.id) return send(res, 403, { error: 'You can only delete your own comments.' }, cors);
      db.prepare('DELETE FROM comments WHERE id = ?').run(comment.id);
      return send(res, 200, { success: true }, cors);
    }

    // ---- JOBS ----
    if (route === 'jobs' && req.method === 'GET') {
      const rows = db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all();
      return send(res, 200, { jobs: rows.map(serializeJob) }, cors);
    }
    if (route === 'jobs' && req.method === 'POST') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Please log in to post a job.' }, cors);
      const b = await parseBody(req);
      const required = ['title', 'company', 'location', 'salary', 'description'];
      if (required.some(k => !String(b[k] || '').trim())) return send(res, 400, { error: 'Title, company, location, salary and description are required.' }, cors);
      const id = uid(); const now = new Date().toISOString();
      db.prepare(`INSERT INTO jobs (id,user_id,title,company,work,type,section,country,location,lat,lon,salary,description,mobile,mobile_code,url,languages,logo,min_experience,max_experience,posted_label,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(id, user.id, b.title, b.company, b.work || '', b.type || '', b.section || '', b.country || '', b.location,
          b.lat ?? null, b.lon ?? null, b.salary,
          b.description, b.mobile || '', b.mobileCode || '+1', b.url || '', b.languages || '', b.logo || '',
          b.minExperience || '', b.maxExperience || '', 'just now', now);
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
      return send(res, 201, { job: serializeJob(job) }, cors);
    }

    if (pathParts[1] === 'jobs' && pathParts.length === 3 && req.method === 'DELETE') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(pathParts[2]);
      if (!job) return send(res, 404, { error: 'Job not found.' }, cors);
      if (job.user_id !== user.id) return send(res, 403, { error: 'You can only delete your own listings.' }, cors);
      db.prepare('DELETE FROM jobs WHERE id = ?').run(job.id);
      return send(res, 200, { deleted: true }, cors);
    }

    // ---- EVENTS ----
    if (route === 'events' && req.method === 'GET') {
      const rows = db.prepare('SELECT * FROM events ORDER BY created_at DESC').all();
      return send(res, 200, { events: rows.map(serializeEvent) }, cors);
    }
    if (route === 'events' && req.method === 'POST') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Please log in to post an event.' }, cors);
      const b = await parseBody(req);
      if (!String(b.name || '').trim() || !String(b.type || '').trim() || !String(b.description || '').trim() || !String(b.start || '').trim())
        return send(res, 400, { error: 'Event name, type, description and start date are required.' }, cors);
      const id = uid(); const now = new Date().toISOString();
      db.prepare(`INSERT INTO events (id,user_id,name,type,description,mode,audience,paid,price,start,end,phone,venue,lat,lon,instructions,website,booking,languages,photo,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(id, user.id, b.name, b.type, b.description, b.mode || 'Offline', b.audience || 'All', b.paid ? 1 : 0,
          b.paid && b.price ? Number(b.price) : null,
          b.start, b.end || '', b.phone || '', b.venue || '', b.lat ?? null, b.lon ?? null,
          b.instructions || '', b.website || '', b.booking || '', b.languages || '', b.photo || '', now);
      const ev = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
      return send(res, 201, { event: serializeEvent(ev) }, cors);
    }

    if (pathParts[1] === 'events' && pathParts.length === 3 && req.method === 'DELETE') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      const ev = db.prepare('SELECT * FROM events WHERE id = ?').get(pathParts[2]);
      if (!ev) return send(res, 404, { error: 'Event not found.' }, cors);
      if (ev.user_id !== user.id) return send(res, 403, { error: 'You can only delete your own listings.' }, cors);
      db.prepare('DELETE FROM events WHERE id = ?').run(ev.id);
      return send(res, 200, { deleted: true }, cors);
    }

    // ---- HOUSING (real estate properties) ----
    if (route === 'properties' && req.method === 'GET') {
      const rows = db.prepare('SELECT * FROM properties ORDER BY created_at DESC').all();
      return send(res, 200, { properties: rows.map(serializeProperty) }, cors);
    }
    if (route === 'properties' && req.method === 'POST') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Please log in to post a listing.' }, cors);
      const b = await parseBody(req);
      const title = String(b.title || '').trim();
      if (!title) return send(res, 400, { error: 'Property title is required.' }, cors);
      const id = uid(); const now = new Date().toISOString();
      const images = Array.isArray(b.images) ? b.images.filter(Boolean) : (b.photo ? [b.photo] : []);
      db.prepare(`INSERT INTO properties
        (id,user_id,title,listing_type,property_type,description,size_sqft,beds,baths,price,price_unit,furnish_type,location,lat,lon,address,phone,phone_code,pets_allowed,smoking_allowed,languages,photo,posted_label,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(id, user.id, title, b.listingType || '', b.propertyType || '', b.description || '', b.sizeSqft || '',
          Number(b.beds) || 0, Number(b.baths) || 0, b.price ? Number(b.price) : null, b.priceUnit || '', b.furnishType || '',
          b.location || '', b.lat ?? null, b.lon ?? null, b.address || '', b.phone || '', b.phoneCode || '+1',
          b.petsAllowed ? 1 : 0, b.smokingAllowed ? 1 : 0, b.languages || '', images[0] || '', 'just now', now);
      setPropertyImages(id, images);
      const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
      return send(res, 201, { property: serializeProperty(property) }, cors);
    }
    if (pathParts[1] === 'properties' && pathParts.length === 3 && req.method === 'PUT') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(pathParts[2]);
      if (!property) return send(res, 404, { error: 'Listing not found.' }, cors);
      if (property.user_id !== user.id) return send(res, 403, { error: 'You can only edit your own listings.' }, cors);
      const b = await parseBody(req);
      const title = String(b.title || '').trim();
      if (!title) return send(res, 400, { error: 'Property title is required.' }, cors);
      const images = Array.isArray(b.images) ? b.images.filter(Boolean) : propertyImages(property.id);
      db.prepare(`UPDATE properties SET title=?, listing_type=?, property_type=?, description=?, size_sqft=?, beds=?, baths=?, price=?, price_unit=?, furnish_type=?, location=?, lat=?, lon=?, address=?, phone=?, phone_code=?, pets_allowed=?, smoking_allowed=?, languages=?, photo=? WHERE id=?`)
        .run(title, b.listingType || '', b.propertyType || '', b.description || '', b.sizeSqft || '',
          Number(b.beds) || 0, Number(b.baths) || 0, b.price ? Number(b.price) : null, b.priceUnit || '', b.furnishType || '',
          b.location || '', b.lat ?? null, b.lon ?? null, b.address || '', b.phone || '', b.phoneCode || '+1',
          b.petsAllowed ? 1 : 0, b.smokingAllowed ? 1 : 0, b.languages || '', images[0] || '', property.id);
      setPropertyImages(property.id, images);
      const updated = db.prepare('SELECT * FROM properties WHERE id = ?').get(property.id);
      return send(res, 200, { property: serializeProperty(updated) }, cors);
    }
    if (pathParts[1] === 'properties' && pathParts.length === 3 && req.method === 'DELETE') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(pathParts[2]);
      if (!property) return send(res, 404, { error: 'Listing not found.' }, cors);
      if (property.user_id !== user.id) return send(res, 403, { error: 'You can only delete your own listings.' }, cors);
      db.prepare('DELETE FROM property_images WHERE property_id = ?').run(property.id);
      db.prepare('DELETE FROM properties WHERE id = ?').run(property.id);
      return send(res, 200, { deleted: true }, cors);
    }

    // ---- NEARBY LISTINGS (generic business/service listings) ----
    if (route === 'listings' && req.method === 'GET') {
      const category = url.searchParams.get('category');
      const rows = category
        ? db.prepare('SELECT * FROM listings WHERE category = ? ORDER BY created_at DESC').all(category)
        : db.prepare('SELECT * FROM listings ORDER BY created_at DESC').all();
      return send(res, 200, { listings: rows.map(serializeListing) }, cors);
    }
    if (route === 'listings' && req.method === 'POST') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Please log in to add a listing.' }, cors);
      const b = await parseBody(req);
      const category = String(b.category || '').trim();
      const title = String(b.title || '').trim();
      const description = String(b.description || '').trim();
      const location = String(b.location || '').trim();
      if (!category || !title || !description || !location) return send(res, 400, { error: 'Category, title, description and location are required.' }, cors);
      const id = uid(); const now = new Date().toISOString();
      db.prepare(`INSERT INTO listings (id,user_id,category,title,description,phone,phone_code,location,lat,lon,price,photo,posted_label,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(id, user.id, category, title, description, b.phone || '', b.phoneCode || '+1', location,
          b.lat ?? null, b.lon ?? null, b.price || '', b.photo || '', 'just now', now);
      const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(id);
      return send(res, 201, { listing: serializeListing(listing) }, cors);
    }
    if (pathParts[1] === 'listings' && pathParts.length === 3 && req.method === 'PUT') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(pathParts[2]);
      if (!listing) return send(res, 404, { error: 'Listing not found.' }, cors);
      if (listing.user_id !== user.id) return send(res, 403, { error: 'You can only edit your own listings.' }, cors);
      const b = await parseBody(req);
      const title = String(b.title || '').trim();
      const description = String(b.description || '').trim();
      const location = String(b.location || '').trim();
      if (!title || !description || !location) return send(res, 400, { error: 'Title, description and location are required.' }, cors);
      db.prepare(`UPDATE listings SET title = ?, description = ?, phone = ?, phone_code = ?, location = ?, lat = ?, lon = ?, price = ?, photo = ? WHERE id = ?`)
        .run(title, description, b.phone || '', b.phoneCode || '+1', location, b.lat ?? null, b.lon ?? null, b.price || '', b.photo ?? listing.photo, listing.id);
      const updated = db.prepare('SELECT * FROM listings WHERE id = ?').get(listing.id);
      return send(res, 200, { listing: serializeListing(updated) }, cors);
    }
    if (pathParts[1] === 'listings' && pathParts.length === 3 && req.method === 'DELETE') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(pathParts[2]);
      if (!listing) return send(res, 404, { error: 'Listing not found.' }, cors);
      if (listing.user_id !== user.id) return send(res, 403, { error: 'You can only delete your own listings.' }, cors);
      db.prepare('DELETE FROM listings WHERE id = ?').run(listing.id);
      return send(res, 200, { deleted: true }, cors);
    }

    // ---- SAVED ITEMS (bookmarks) ----
    if (route === 'saved' && req.method === 'GET') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      const type = url.searchParams.get('type');
      const rows = type
        ? db.prepare('SELECT * FROM saved_items WHERE user_id = ? AND content_type = ? ORDER BY created_at DESC').all(user.id, type)
        : db.prepare('SELECT * FROM saved_items WHERE user_id = ? ORDER BY created_at DESC').all(user.id);
      return send(res, 200, { saved: rows.map(r => ({ contentType: r.content_type, contentId: r.content_id, createdAt: r.created_at })) }, cors);
    }
    if (route === 'saved' && req.method === 'POST') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Please log in to save items.' }, cors);
      const b = await parseBody(req);
      const contentType = String(b.contentType || ''); const contentId = String(b.contentId || '');
      if (!contentType || !contentId) return send(res, 400, { error: 'contentType and contentId are required.' }, cors);
      const id = uid(); const now = new Date().toISOString();
      db.prepare('INSERT OR IGNORE INTO saved_items (id,user_id,content_type,content_id,created_at) VALUES (?,?,?,?,?)')
        .run(id, user.id, contentType, contentId, now);
      return send(res, 201, { saved: true }, cors);
    }
    if (pathParts[1] === 'saved' && pathParts.length === 4 && req.method === 'DELETE') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      db.prepare('DELETE FROM saved_items WHERE user_id = ? AND content_type = ? AND content_id = ?').run(user.id, pathParts[2], pathParts[3]);
      return send(res, 200, { saved: false }, cors);
    }

    // ---- PROVIDER DIRECTORY (real users tagged with a profession) ----
    if (route === 'providers' && req.method === 'GET') {
      const viewer = authUser(req);
      const occupation = String(url.searchParams.get('occupation') || '').trim();
      const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
      if (!occupation) return send(res, 400, { error: 'A profession is required.' }, cors);
      const rows = db.prepare('SELECT * FROM users WHERE LOWER(occupation) = LOWER(?)').all(occupation);
      const filtered = q ? rows.filter(u => `${u.name} ${u.username}`.toLowerCase().includes(q)) : rows;
      return send(res, 200, { providers: filtered.map(u => serializePublic(u, viewer?.id)) }, cors);
    }

    // Business accounts (Restaurants, Farms, Beauty & Spa, etc.) auto-discovered
    // by Nearby — these are real user accounts (account_type='business'),
    // not rows in the separate `listings` table, mirroring how /providers
    // already discovers individual professions via `occupation`.
    if (route === 'businesses' && req.method === 'GET') {
      const viewer = authUser(req);
      const category = String(url.searchParams.get('category') || '').trim();
      const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
      if (!category) return send(res, 400, { error: 'A category is required.' }, cors);
      const rows = db.prepare(`SELECT * FROM users WHERE account_type = 'business' AND LOWER(business_category) = LOWER(?)`).all(category);
      const filtered = q ? rows.filter(u => `${u.name} ${u.username} ${u.business_name || ''}`.toLowerCase().includes(q)) : rows;
      return send(res, 200, { businesses: filtered.map(u => serializePublic(u, viewer?.id)) }, cors);
    }

    // ---- PUBLIC PROFILES / FOLLOW / BLOCK ----
    if (pathParts[1] === 'users' && pathParts.length === 3 && req.method === 'GET') {
      const viewer = authUser(req);
      const target = db.prepare('SELECT * FROM users WHERE username = ?').get(pathParts[2]);
      if (!target) return send(res, 404, { error: 'User not found.' }, cors);
      return send(res, 200, { user: serializePublic(target, viewer?.id) }, cors);
    }
    if (pathParts[1] === 'users' && pathParts[3] === 'follow' && req.method === 'POST') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Please log in to follow people.' }, cors);
      const target = db.prepare('SELECT * FROM users WHERE username = ?').get(pathParts[2]);
      if (!target) return send(res, 404, { error: 'User not found.' }, cors);
      if (target.id === user.id) return send(res, 400, { error: 'You cannot follow yourself.' }, cors);
      const already = db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?').get(user.id, target.id);
      if (already) db.prepare('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?').run(user.id, target.id);
      else db.prepare('INSERT INTO follows (follower_id, followee_id, created_at) VALUES (?,?,?)').run(user.id, target.id, new Date().toISOString());
      return send(res, 200, { user: serializePublic(target, user.id) }, cors);
    }
    if (route === 'notifications' && req.method === 'GET') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      const followRows = db.prepare(`
        SELECT u.id as actor_id, u.username as actor_username, u.name as actor_name, u.avatar as actor_avatar, f.created_at as created_at
        FROM follows f JOIN users u ON u.id = f.follower_id
        WHERE f.followee_id = ?
      `).all(user.id);
      const likeRows = db.prepare(`
        SELECT u.id as actor_id, u.username as actor_username, u.name as actor_name, u.avatar as actor_avatar,
               p.id as post_id, p.image as post_image, pl.created_at as created_at
        FROM post_likes pl
        JOIN posts p ON p.id = pl.post_id
        JOIN users u ON u.id = pl.user_id
        WHERE p.user_id = ? AND pl.user_id != ?
      `).all(user.id, user.id);
      const items = [
        ...followRows.map(r => ({
          id: `follow:${r.actor_id}:${r.created_at}`,
          type: 'follow',
          actorUsername: r.actor_username, actorName: r.actor_name, actorAvatar: r.actor_avatar || '',
          isFollowingBack: isFollowing(user.id, r.actor_id),
          createdAt: r.created_at
        })),
        // Likes recorded before the created_at column existed have no real
        // timestamp — omit them rather than inventing a fake date.
        ...likeRows.filter(r => r.created_at).map(r => ({
          id: `like:${r.actor_id}:${r.post_id}:${r.created_at}`,
          type: 'like',
          actorUsername: r.actor_username, actorName: r.actor_name, actorAvatar: r.actor_avatar || '',
          postId: r.post_id, postImage: r.post_image || '',
          createdAt: r.created_at
        }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return send(res, 200, { notifications: items }, cors);
    }
    if (route === 'blocked' && req.method === 'GET') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      const rows = db.prepare(`SELECT u.* FROM blocked_users b JOIN users u ON u.id = b.blocked_id WHERE b.user_id = ? ORDER BY b.created_at DESC`).all(user.id);
      return send(res, 200, { blocked: rows.map(u => serializePublic(u, user.id)) }, cors);
    }
    if (pathParts[1] === 'users' && pathParts[3] === 'block' && req.method === 'POST') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Please log in to block users.' }, cors);
      const target = db.prepare('SELECT * FROM users WHERE username = ?').get(pathParts[2]);
      if (!target) return send(res, 404, { error: 'User not found.' }, cors);
      const already = db.prepare('SELECT 1 FROM blocked_users WHERE user_id = ? AND blocked_id = ?').get(user.id, target.id);
      if (already) db.prepare('DELETE FROM blocked_users WHERE user_id = ? AND blocked_id = ?').run(user.id, target.id);
      else db.prepare('INSERT INTO blocked_users (user_id, blocked_id, created_at) VALUES (?,?,?)').run(user.id, target.id, new Date().toISOString());
      return send(res, 200, { user: serializePublic(target, user.id) }, cors);
    }

    if (pathParts[1] === 'users' && pathParts[3] === 'report' && req.method === 'POST') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Please log in to report users.' }, cors);
      const target = db.prepare('SELECT * FROM users WHERE username = ?').get(pathParts[2]);
      if (!target) return send(res, 404, { error: 'User not found.' }, cors);
      db.prepare('INSERT INTO reports (id, reporter_id, reported_id, created_at) VALUES (?,?,?,?)')
        .run(uid(), user.id, target.id, new Date().toISOString());
      return send(res, 201, { message: 'Thanks — we received your report.' }, cors);
    }

    // ---- MESSAGING ----
    if (route === 'conversations' && req.method === 'GET') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      const convos = db.prepare(`
        SELECT c.id, c.created_at FROM conversations c
        JOIN conversation_participants cp ON cp.conversation_id = c.id
        WHERE cp.user_id = ?
      `).all(user.id);
      const result = convos.map(c => {
        const other = db.prepare(`SELECT u.* FROM conversation_participants cp JOIN users u ON u.id = cp.user_id WHERE cp.conversation_id = ? AND cp.user_id != ?`).get(c.id, user.id);
        const last = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1').get(c.id);
        return {
          id: c.id,
          user: other ? serializePublic(other, user.id) : null,
          lastMessage: last ? last.text : '',
          lastMessageAt: last ? last.created_at : c.created_at
        };
      }).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      return send(res, 200, { conversations: result }, cors);
    }
    if (route === 'conversations' && req.method === 'POST') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Please log in to start a conversation.' }, cors);
      const b = await parseBody(req);
      const target = db.prepare('SELECT * FROM users WHERE username = ?').get(String(b.username || ''));
      if (!target) return send(res, 404, { error: 'User not found.' }, cors);
      if (target.id === user.id) return send(res, 400, { error: 'You cannot message yourself.' }, cors);
      const conversationId = getOrCreateConversation(user.id, target.id);
      return send(res, 201, { conversationId, user: serializePublic(target, user.id) }, cors);
    }
    if (pathParts[1] === 'conversations' && pathParts[3] === 'messages' && req.method === 'GET') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      const conversationId = pathParts[2];
      const participant = db.prepare('SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?').get(conversationId, user.id);
      if (!participant) return send(res, 403, { error: 'Not part of this conversation.' }, cors);
      const rows = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(conversationId);
      return send(res, 200, { messages: rows.map(m => ({ id: m.id, text: m.text, senderId: m.sender_id, mine: m.sender_id === user.id, createdAt: m.created_at })) }, cors);
    }
    if (pathParts[1] === 'conversations' && pathParts[3] === 'messages' && req.method === 'POST') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Please log in to send messages.' }, cors);
      const conversationId = pathParts[2];
      const participant = db.prepare('SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?').get(conversationId, user.id);
      if (!participant) return send(res, 403, { error: 'Not part of this conversation.' }, cors);
      const b = await parseBody(req);
      const text = String(b.text || '').trim();
      if (!text) return send(res, 400, { error: 'Message text is required.' }, cors);
      const id = uid(); const now = new Date().toISOString();
      db.prepare('INSERT INTO messages (id, conversation_id, sender_id, text, created_at) VALUES (?,?,?,?,?)').run(id, conversationId, user.id, text, now);
      return send(res, 201, { message: { id, text, senderId: user.id, mine: true, createdAt: now } }, cors);
    }

    // ---- STORIES ----
    if (route === 'stories' && req.method === 'GET') {
      const viewer = authUser(req);
      const rows = db.prepare(`SELECT * FROM stories WHERE expires_at > ? ORDER BY created_at ASC`).all(new Date().toISOString());
      const stories = rows.map(s => {
        const poster = db.prepare('SELECT * FROM users WHERE id = ?').get(s.user_id);
        const viewCount = db.prepare('SELECT COUNT(*) c FROM story_views WHERE story_id = ?').get(s.id).c;
        const viewedByMe = viewer ? !!db.prepare('SELECT 1 FROM story_views WHERE story_id = ? AND viewer_id = ?').get(s.id, viewer.id) : false;
        return {
          id: s.id, userId: s.user_id, user: poster ? serializePublic(poster, viewer?.id) : null,
          media: s.media, mediaType: s.media_type, caption: s.caption || '',
          createdAt: s.created_at, expiresAt: s.expires_at,
          viewCount, viewedByMe, isMine: viewer?.id === s.user_id
        };
      });
      return send(res, 200, { stories }, cors);
    }
    if (route === 'stories' && req.method === 'POST') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Please log in to post a story.' }, cors);
      const b = await parseBody(req);
      const media = String(b.media || ''); const mediaType = b.mediaType === 'video' ? 'video' : 'image';
      if (!media) return send(res, 400, { error: 'Choose a photo or video for your story.' }, cors);
      const id = uid(); const now = Date.now();
      db.prepare(`INSERT INTO stories (id,user_id,media,media_type,caption,created_at,expires_at) VALUES (?,?,?,?,?,?,?)`)
        .run(id, user.id, media, mediaType, String(b.caption || ''), new Date(now).toISOString(), new Date(now + 24 * 3600000).toISOString());
      const s = db.prepare('SELECT * FROM stories WHERE id = ?').get(id);
      return send(res, 201, { story: { id: s.id, userId: s.user_id, user: serializePublic(user, user.id), media: s.media, mediaType: s.media_type, caption: s.caption, createdAt: s.created_at, expiresAt: s.expires_at, viewCount: 0, viewedByMe: false, isMine: true } }, cors);
    }
    if (pathParts[1] === 'stories' && pathParts.length === 3 && req.method === 'DELETE') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      const s = db.prepare('SELECT * FROM stories WHERE id = ?').get(pathParts[2]);
      if (!s) return send(res, 404, { error: 'Story not found.' }, cors);
      if (s.user_id !== user.id) return send(res, 403, { error: 'You can only delete your own stories.' }, cors);
      db.prepare('DELETE FROM story_views WHERE story_id = ?').run(s.id);
      db.prepare('DELETE FROM stories WHERE id = ?').run(s.id);
      return send(res, 200, { deleted: true }, cors);
    }
    if (pathParts[1] === 'stories' && pathParts[3] === 'view' && req.method === 'POST') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      const s = db.prepare('SELECT * FROM stories WHERE id = ?').get(pathParts[2]);
      if (!s) return send(res, 404, { error: 'Story not found.' }, cors);
      if (s.user_id !== user.id) {
        db.prepare('INSERT OR IGNORE INTO story_views (id, story_id, viewer_id, viewed_at) VALUES (?,?,?,?)')
          .run(uid(), s.id, user.id, new Date().toISOString());
      }
      const viewCount = db.prepare('SELECT COUNT(*) c FROM story_views WHERE story_id = ?').get(s.id).c;
      return send(res, 200, { viewCount }, cors);
    }
    if (pathParts[1] === 'stories' && pathParts[3] === 'viewers' && req.method === 'GET') {
      const user = authUser(req); if (!user) return send(res, 401, { error: 'Authentication required.' }, cors);
      const s = db.prepare('SELECT * FROM stories WHERE id = ?').get(pathParts[2]);
      if (!s) return send(res, 404, { error: 'Story not found.' }, cors);
      if (s.user_id !== user.id) return send(res, 403, { error: 'Only the story owner can see viewers.' }, cors);
      const rows = db.prepare(`
        SELECT u.*, sv.viewed_at AS viewed_at FROM story_views sv
        JOIN users u ON u.id = sv.viewer_id WHERE sv.story_id = ? ORDER BY sv.viewed_at DESC
      `).all(s.id);
      return send(res, 200, { viewers: rows.map(u => ({ ...serializePublic(u, user.id), viewedAt: u.viewed_at })) }, cors);
    }

    // ---- SUPPORT ----
    if (route === 'support' && req.method === 'POST') {
      const user = authUser(req);
      const b = await parseBody(req);
      const message = String(b.message || '').trim();
      if (!message) return send(res, 400, { error: 'Please describe your issue or question.' }, cors);
      const id = uid(); const now = new Date().toISOString();
      db.prepare('INSERT INTO support_requests (id, user_id, message, created_at) VALUES (?,?,?,?)').run(id, user?.id || null, message, now);
      return send(res, 201, { message: 'Thanks — our support team will get back to you soon.' }, cors);
    }

    return send(res, 404, { error: 'API route not found.' }, cors);
  } catch (e) {
    console.error(e);
    if (e.status) return send(res, e.status, { error: e.message }, cors);
    return send(res, 500, { error: 'Server error. Please try again.' }, cors);
  }
});

server.listen(PORT, () => console.log(`AbroadHub server running on http://localhost:${PORT}`));
