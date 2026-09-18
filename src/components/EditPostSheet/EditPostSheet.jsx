import { React, useState, X } from '../../shared/deps.js';
import { api } from '../../api.js';

// Caption-only edit, matching how Instagram/most feeds handle "Edit Post" —
// the attached photo/video itself isn't swappable after publishing, only
// the text. Reuses PostComposer's visual language (same header/textarea
// classes) since this is the same sheet shape with a smaller field set.
function EditPostSheet({ post, close, onSaved }){

  const [text,setText]=useState(post.text||'');
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  const save=async()=>{
    const value=text.trim();
    if(!value && !post.image && !post.video){
      setError('A post needs text or media.');
      return;
    }
    setSaving(true);
    setError('');
    try{
      const r=await api.updatePost(post.id,{text:value});
      onSaved?.(r.post);
      close();
    }catch(err){
      setError(err.message||'Unable to save changes.');
    }finally{
      setSaving(false);
    }
  };

  return (
    <div
      className="backdrop post-composer-backdrop"
      onClick={close}
    >

      <div
        className="post-composer"
        onClick={e=>e.stopPropagation()}
      >

        <div className="post-composer-header">
          <button onClick={close}>
            <X/>
          </button>
          <h2>Edit Post</h2>
          <button
            className="post-share-button"
            onClick={save}
            disabled={saving}
          >
            {saving?'Saving…':'Save'}
          </button>
        </div>

        {(post.image||post.video)&&
          <div className="post-preview-wrap">
            {post.video ?
              <video className="post-preview" src={post.video} controls/>
              :
              <img className="post-preview" src={post.image} alt=""/>
            }
          </div>
        }

        <textarea
          className="post-caption"
          value={text}
          onChange={e=>setText(e.target.value)}
          placeholder="Write a caption..."
          maxLength={500}
          autoFocus
        />

        <div className="post-caption-count">
          {text.length}/500
        </div>

        {error&&
          <div className="post-error">
            {error}
          </div>
        }

      </div>

    </div>
  );
}

export default EditPostSheet;
