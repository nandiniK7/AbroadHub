import { React, useState, useEffect, useRef, ChevronLeft, Trash2 } from '../../shared/deps.js';
import { timeAgoShort } from '../../shared/deps.js';
import Avatar from '../Avatar/Avatar.jsx';
import { api } from '../../api.js';

// Real comment thread for a post — fetched/persisted through the actual
// backend (comments table), not a mock. Rendered as a fullscreen overlay
// (matching the reference's dedicated Comments screen) rather than a small
// popup, since a scrollable thread + composer needs the room.
function CommentsSheet({ post, user, requireAuth, toast, close, onCountChange }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (!post) return;
    setLoading(true);
    api.comments(post.id).then(r => {
      const list = r.comments || [];
      setComments(list);
      setLoading(false);
      onCountChange?.(post.id, list.length);
    }).catch(() => {
      setLoading(false);
      toast?.('Unable to load comments right now.');
    });
  }, [post?.id]);

  const submit = async e => {
    e.preventDefault();
    if (!requireAuth?.()) return;
    const value = text.trim();
    if (!value || posting) return;
    setPosting(true);
    try {
      const r = await api.addComment(post.id, value);
      // Compute the next list first, then call setComments and
      // onCountChange as separate plain statements — calling a parent's
      // setState from inside a setComments *updater function* can trip
      // "Cannot update a component while rendering a different component",
      // since React may invoke updater functions during its own
      // render/reconcile work.
      const next = [...comments, r.comment];
      setComments(next);
      onCountChange?.(post.id, next.length);
      setText('');
      setTimeout(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, 50);
    } catch (err) {
      toast?.(err.message || 'Unable to post comment.');
    } finally {
      setPosting(false);
    }
  };

  const remove = async id => {
    try {
      await api.deleteComment(id);
      const next = comments.filter(c => c.id !== id);
      setComments(next);
      onCountChange?.(post.id, next.length);
    } catch (err) {
      toast?.(err.message || 'Unable to delete comment.');
    }
  };

  if (!post) return null;

  return (
    <div className="comments-sheet">
      <header className="header comments-sheet-header">
        <button onClick={close} aria-label="Back"><ChevronLeft/></button>
        <h1 className="header-title">Comments</h1>
      </header>

      <div className="comments-list" ref={listRef}>
        {loading && <div className="empty-profile">Loading comments…</div>}
        {!loading && !comments.length &&
          <div className="empty-profile">No comments yet. Be the first to say something.</div>
        }
        {!loading && comments.map(c => (
          <div className="comment-row" key={c.id}>
            <Avatar src={c.avatar} text={c.name}/>
            <div className="comment-row-body">
              <div className="comment-row-head">
                <b>{c.username}</b>
                {c.occupation && <span className="comment-row-role">{c.occupation}</span>}
              </div>
              <p>{c.text}</p>
              <div className="comment-row-meta">
                <small>{timeAgoShort(c.createdAt)}</small>
                {c.isMine &&
                  <button className="comment-row-delete" onClick={() => remove(c.id)} aria-label="Delete comment">
                    <Trash2 size={13}/>
                  </button>
                }
              </div>
            </div>
          </div>
        ))}
      </div>

      <form className="comments-composer" onSubmit={submit}>
        <Avatar src={user?.avatar} text={user?.name || 'AH'}/>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Your comment..." maxLength={1000}/>
        <button type="submit" className="comments-post-button" disabled={!text.trim() || posting}>{posting ? '…' : 'Post'}</button>
      </form>
    </div>
  );
}

export default CommentsSheet;
