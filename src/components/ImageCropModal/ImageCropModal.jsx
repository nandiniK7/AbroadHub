import { React, useEffect, useRef, useState } from '../../shared/deps.js';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';

const VIEWPORT = 280;   // on-screen crop frame size (square), in CSS px
const OUTPUT = 640;     // exported image size (square), in real pixels

// A real, self-contained crop step for photo uploads: drag to reposition,
// a slider to zoom, "Use Photo" bakes the visible crop frame down to a
// fixed-size square via canvas and hands back a data URL. No external
// cropping library — this is plain pointer events + canvas math.
function ImageCropModal({ src, onCancel, onCropped }){
  const [natural,setNatural]=useState(null); // {w,h}
  const [zoom,setZoom]=useState(1);
  const [pan,setPan]=useState({x:0,y:0});
  const dragRef=useRef(null); // {startX,startY,panX,panY}
  const imgRef=useRef(null);

  useEffect(()=>{
    const img=new Image();
    img.onload=()=>setNatural({w:img.naturalWidth,h:img.naturalHeight});
    img.src=src;
  },[src]);

  if(!natural){
    return (
      <div className="backdrop">
        <div className="crop-modal"><div className="empty-profile">Loading image…</div></div>
      </div>
    );
  }

  const baseScale=Math.max(VIEWPORT/natural.w,VIEWPORT/natural.h);
  const dispW=natural.w*baseScale*zoom;
  const dispH=natural.h*baseScale*zoom;

  const clamp=(p,dw,dh)=>({
    x:Math.min(0,Math.max(VIEWPORT-dw,p.x)),
    y:Math.min(0,Math.max(VIEWPORT-dh,p.y))
  });

  const setZoomClamped=z=>{
    const nz=Math.min(3,Math.max(1,z));
    const ndw=natural.w*baseScale*nz;
    const ndh=natural.h*baseScale*nz;
    setZoom(nz);
    setPan(p=>clamp(p,ndw,ndh));
  };

  const onPointerDown=e=>{
    e.preventDefault();
    dragRef.current={startX:e.clientX,startY:e.clientY,panX:pan.x,panY:pan.y};
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove=e=>{
    if(!dragRef.current)return;
    const dx=e.clientX-dragRef.current.startX;
    const dy=e.clientY-dragRef.current.startY;
    setPan(clamp({x:dragRef.current.panX+dx,y:dragRef.current.panY+dy},dispW,dispH));
  };
  const onPointerUp=()=>{ dragRef.current=null; };

  const applyCrop=()=>{
    const scale=baseScale*zoom;
    const sourceX=-pan.x/scale;
    const sourceY=-pan.y/scale;
    const sourceSize=VIEWPORT/scale;
    const canvas=document.createElement('canvas');
    canvas.width=OUTPUT; canvas.height=OUTPUT;
    const ctx=canvas.getContext('2d');
    const img=imgRef.current;
    ctx.drawImage(img,sourceX,sourceY,sourceSize,sourceSize,0,0,OUTPUT,OUTPUT);
    onCropped(canvas.toDataURL('image/jpeg',0.9));
  };

  return (
    <div className="backdrop" onClick={onCancel}>
      <div className="crop-modal" onClick={e=>e.stopPropagation()}>
        <div className="crop-modal-head">
          <button type="button" onClick={onCancel} aria-label="Cancel"><X size={20}/></button>
          <b>Crop photo</b>
          <button type="button" className="crop-modal-use" onClick={applyCrop}><Check size={16}/> Use Photo</button>
        </div>

        <div
          className="crop-viewport"
          style={{width:VIEWPORT,height:VIEWPORT}}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            style={{width:dispW,height:dispH,transform:`translate(${pan.x}px,${pan.y}px)`}}
          />
        </div>

        <div className="crop-zoom-row">
          <button type="button" onClick={()=>setZoomClamped(zoom-0.1)} aria-label="Zoom out"><ZoomOut size={16}/></button>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={e=>setZoomClamped(Number(e.target.value))}
            aria-label="Zoom"
          />
          <button type="button" onClick={()=>setZoomClamped(zoom+0.1)} aria-label="Zoom in"><ZoomIn size={16}/></button>
        </div>

        <p className="crop-hint">Drag to reposition, use the slider to zoom.</p>
      </div>
    </div>
  );
}

export default ImageCropModal;
