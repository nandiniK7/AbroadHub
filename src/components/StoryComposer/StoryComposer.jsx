import { React, useRef, useState } from '../../shared/deps.js';
import { Camera, Upload, Trash2, X } from 'lucide-react';
import { api } from '../../api.js';

function StoryComposer({
  close,
  onCreated,
  user
}){

  const input=useRef(null);

  const [file,setFile]=useState(null);
  const [fileType,setFileType]=useState('image');
  const [cap,setCap]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);

  const choose=e=>{
    const f=e.target.files?.[0];
    if(!f)return;

    if(!f.type.startsWith('image/') && !f.type.startsWith('video/')){
      setError('Please choose an image or video.');
      return;
    }

    const r=new FileReader();

    r.onload=()=>{
      setFile(r.result);
      setFileType(f.type.startsWith('video/')?'video':'image');
      setError('');
    };

    r.readAsDataURL(f);

    e.target.value='';
  };

  const publish=async()=>{
    if(!file){
      setError('Please choose a photo or video first.');
      input.current?.click();
      return;
    }

    setError('');
    setBusy(true);

    try{
      const result=await api.createStory({
        media:file,
        mediaType:fileType,
        caption:cap.trim()
      });
      onCreated?.(result.story);
      close();
    }catch(err){
      setError(err.message||'Unable to post your story. Please try again.');
    }finally{
      setBusy(false);
    }
  };

  return (
    <div className="backdrop">

      <div className="story-modal">

        <button
          className="close"
          onClick={close}
        >
          <X/>
        </button>

        {!file ? (
          <button
            className="story-upload"
            onClick={()=>input.current?.click()}
          >
            <div className="story-upload-icon">
              <Camera/>
            </div>
            <b>Add to your story</b>
            <span>
              Choose a photo or video from your device
            </span>
          </button>
        ) : (
          <div className="story-editor">

            <div className="story-editor-header">
              Edit your story
            </div>

            <div className="story-preview-container">
              {fileType==='video' ? (
                <video
                  className="story-preview"
                  src={file}
                  controls
                  playsInline
                />
              ) : (
                <img
                  className="story-preview"
                  src={file}
                  alt="Story preview"
                />
              )}
            </div>

            <div className="story-edit-controls">

              <button
                type="button"
                onClick={()=>input.current?.click()}
              >
                <Upload size={15}/>
                Replace
              </button>

              <button
                type="button"
                onClick={()=>{
                  setFile(null);
                  setCap('');
                  setError('');
                }}
              >
                <Trash2 size={15}/>
                Remove
              </button>

            </div>

            <div className="story-caption-wrapper">
              <label>Caption</label>
              <textarea
                className="story-caption"
                value={cap}
                onChange={e=>setCap(e.target.value)}
                placeholder="Add a caption..."
                maxLength={150}
              />
              <span className="caption-count">
                {cap.length}/150
              </span>
            </div>

            {error&&(
              <div className="story-error">
                {error}
              </div>
            )}

            <div className="story-editor-actions">
              <button
                className="secondary-button"
                onClick={close}
                disabled={busy}
              >
                Cancel
              </button>

              <button
                className="primary"
                onClick={publish}
                disabled={busy}
              >
                {busy?'Sharing…':'Share to story'}
              </button>
            </div>

          </div>
        )}

        <input
          hidden
          ref={input}
          type="file"
          accept="image/*,video/*"
          onChange={choose}
        />

      </div>

    </div>
  );
}

export default StoryComposer;
