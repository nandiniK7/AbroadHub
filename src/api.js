const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request(path, options = {}) {
  const token = localStorage.getItem('ah_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try{
    response = await fetch(`${API_BASE}/api${path}`, { ...options, headers });
  }catch{
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  let data = null;
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) {
    // A 401 while we believed we had a valid session means the token is
    // stale/expired/invalid server-side. Clear it and tell the app so the
    // UI stops pretending the user is still logged in (root cause of
    // "Authentication required" appearing while the profile still shows
    // a logged-in user's data).
    if (response.status === 401 && token) {
      localStorage.removeItem('ah_token');
      window.dispatchEvent(new CustomEvent('ah:unauthorized'));
    }
    const err = new Error(data.error || 'Request failed');
    err.status = response.status;
    throw err;
  }
  return data;
}

export const api = {
  health: () => request('/health'),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  usernameAvailable: (username) => request(`/auth/username-available?u=${encodeURIComponent(username)}`),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/me'),
  posts: () => request('/posts'),
  createPost: (payload) => request('/posts', { method: 'POST', body: JSON.stringify(payload) }),
  updatePost: (id, payload) => request(`/posts/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  toggleLike: (id) => request(`/posts/${id}/like`, { method: 'POST' }),
  deletePost: (id) => request(`/posts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  comments: (postId) => request(`/posts/${encodeURIComponent(postId)}/comments`),
  addComment: (postId, text) => request(`/posts/${encodeURIComponent(postId)}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
  deleteComment: (id) => request(`/comments/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  jobs: () => request('/jobs'),
  createJob: (payload) => request('/jobs', { method: 'POST', body: JSON.stringify(payload) }),
  deleteJob: (id) => request(`/jobs/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  events: () => request('/events'),
  createEvent: (payload) => request('/events', { method: 'POST', body: JSON.stringify(payload) }),
  deleteEvent: (id) => request(`/events/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  properties: () => request('/properties'),
  createProperty: (payload) => request('/properties', { method: 'POST', body: JSON.stringify(payload) }),
  updateProperty: (id, payload) => request(`/properties/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProperty: (id) => request(`/properties/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  listings: (category) => request(`/listings${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  createListing: (payload) => request('/listings', { method: 'POST', body: JSON.stringify(payload) }),
  updateListing: (id, payload) => request(`/listings/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteListing: (id) => request(`/listings/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  updateProfile: (payload) => request('/me', { method: 'PUT', body: JSON.stringify(payload) }),
  deleteAccount: (password) => request('/me', { method: 'DELETE', body: JSON.stringify({ password }) }),

  // Saved / bookmarked content
  saved: (type) => request(`/saved${type ? `?type=${encodeURIComponent(type)}` : ''}`),
  save: (contentType, contentId) => request('/saved', { method: 'POST', body: JSON.stringify({ contentType, contentId }) }),
  unsave: (contentType, contentId) => request(`/saved/${encodeURIComponent(contentType)}/${encodeURIComponent(contentId)}`, { method: 'DELETE' }),

  // Provider directory (real users tagged with a profession/occupation)
  providers: (occupation, q) => request(`/providers?occupation=${encodeURIComponent(occupation)}${q ? `&q=${encodeURIComponent(q)}` : ''}`),

  // Business accounts (real users tagged with a Nearby business category)
  businesses: (category, q) => request(`/businesses?category=${encodeURIComponent(category)}${q ? `&q=${encodeURIComponent(q)}` : ''}`),

  // Notifications (real follow + like activity)
  notifications: () => request('/notifications'),

  // Public profiles / follow / block
  publicProfile: (username) => request(`/users/${encodeURIComponent(username)}`),
  toggleFollow: (username) => request(`/users/${encodeURIComponent(username)}/follow`, { method: 'POST' }),
  toggleBlock: (username) => request(`/users/${encodeURIComponent(username)}/block`, { method: 'POST' }),
  blocked: () => request('/blocked'),
  reportUser: (username) => request(`/users/${encodeURIComponent(username)}/report`, { method: 'POST' }),

  // Messaging
  conversations: () => request('/conversations'),
  startConversation: (username) => request('/conversations', { method: 'POST', body: JSON.stringify({ username }) }),
  messages: (conversationId) => request(`/conversations/${encodeURIComponent(conversationId)}/messages`),
  sendMessage: (conversationId, text) => request(`/conversations/${encodeURIComponent(conversationId)}/messages`, { method: 'POST', body: JSON.stringify({ text }) }),

  // Support
  sendSupportRequest: (message) => request('/support', { method: 'POST', body: JSON.stringify({ message }) }),

  // Stories
  stories: () => request('/stories'),
  createStory: (payload) => request('/stories', { method: 'POST', body: JSON.stringify(payload) }),
  deleteStory: (id) => request(`/stories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  viewStory: (id) => request(`/stories/${encodeURIComponent(id)}/view`, { method: 'POST' }),
  storyViewers: (id) => request(`/stories/${encodeURIComponent(id)}/viewers`),
};
