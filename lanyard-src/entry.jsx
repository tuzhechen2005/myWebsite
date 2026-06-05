import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import Lanyard from './Lanyard.jsx';

/* Use the designed badge image as the card face texture. */
function makeCardTexture(badge) {
  var W = 512, H = 720, c = document.createElement('canvas'); c.width = W; c.height = H;
  var x = c.getContext('2d');
  function draw() {
    x.fillStyle = '#030303'; x.fillRect(0, 0, W, H);
    if (!badge || !badge.width || !badge.height) return;
    var targetX = -25, targetY = -30, targetW = 300, targetH = 600;
    x.drawImage(badge, targetX, targetY, targetW, targetH);
  }
  draw();  // badge is an already-loaded Image
  var tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16; tex.flipY = false;
  return tex;
}

function App() {
  var initial = false;
  try { initial = new URLSearchParams(location.search).get('drop') === '1'; } catch (e) {}
  const [open, setOpen] = useState(initial);
  const [tex, setTex] = useState(null);
  // load the badge FIRST, then build the texture with it already drawn in
  useEffect(() => {
    let done = false;
    const img = new Image();
    const finish = p => { if (!done) { done = true; setTex(makeCardTexture(p)); } };
    img.onload = () => finish(img);
    img.onerror = () => finish(null);
    img.src = 'assets/badge-card.png';
  }, []);
  useEffect(() => {
    const onDrop = () => setOpen(true);
    window.addEventListener('lanyard:drop', onDrop);
    return () => window.removeEventListener('lanyard:drop', onDrop);
  }, []);
  useEffect(() => {
    if (!el) return undefined;
    el.classList.toggle('is-open', open && !!tex);
    return () => el.classList.remove('is-open');
  }, [open, tex]);
  return (open && tex) ? <Lanyard cardTexture={tex} /> : null;
}

const el = document.getElementById('introLanyard');
if (el) createRoot(el).render(<App />);
