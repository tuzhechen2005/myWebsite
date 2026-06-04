import { createRoot } from 'react-dom/client';
import { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import Lanyard from './Lanyard.jsx';

/* dark card face: 证件照 photo + "Jelly" + cool elements (replaces the glb texture) */
function makeCardTexture(photo, name) {
  var W = 512, H = 720, c = document.createElement('canvas'); c.width = W; c.height = H;
  var x = c.getContext('2d'), accent = '#6b5cff';
  function rr(X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
  function draw(photo) {
    var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#181b22'); g.addColorStop(0.5, '#0e1016'); g.addColorStop(1, '#070a0e');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = accent; x.globalAlpha = 0.14; x.fillRect(0, 0, W, 252); x.globalAlpha = 1;
    // small ID photo in the TOP-RIGHT corner
    var pbw = 150, pbh = 196, pbx = W - pbw - 30, pby = 34;
    x.fillStyle = '#04060a'; rr(pbx - 5, pby - 5, pbw + 10, pbh + 10, 12); x.fill();
    if (photo) { x.save(); rr(pbx, pby, pbw, pbh, 9); x.clip(); var s = Math.max(pbw / photo.width, pbh / photo.height), dw = photo.width * s, dh = photo.height * s; x.drawImage(photo, pbx + (pbw - dw) / 2, pby + (pbh - dh) / 2, dw, dh); x.restore(); }
    else { x.fillStyle = '#1b1e27'; rr(pbx, pby, pbw, pbh, 9); x.fill(); }
    x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 2; rr(pbx, pby, pbw, pbh, 9); x.stroke();
    // name "Jelly" (top-left) + tag
    x.fillStyle = '#fff'; x.font = '700 70px "Space Grotesk", system-ui, sans-serif'; x.fillText(name, 36, 104);
    x.fillStyle = accent; x.font = '600 22px "Space Grotesk", system-ui, sans-serif'; x.fillText('STAFF · 2027', 38, 142);
    // divider
    x.fillStyle = accent; x.fillRect(0, 252, W, 4);
    // role + identity
    x.fillStyle = '#fff'; x.font = '700 44px "Space Grotesk", system-ui, sans-serif'; x.fillText('AI · AGENT', 38, 350);
    x.fillStyle = accent; x.font = '700 44px "Space Grotesk", system-ui, sans-serif'; x.fillText('ENGINEER', 38, 402);
    x.fillStyle = 'rgba(255,255,255,.82)'; x.font = '400 26px Inter, system-ui, sans-serif'; x.fillText('涂喆宸 · Zhechen Tu', 38, 452);
    x.fillStyle = 'rgba(255,255,255,.5)'; x.font = '400 22px Inter, system-ui, sans-serif'; x.fillText('ztu29@wisc.edu', 38, 488);
    // holo stripe + barcode
    var hs = x.createLinearGradient(38, 0, W - 38, 0); hs.addColorStop(0, 'rgba(120,90,255,0)'); hs.addColorStop(.4, 'rgba(120,200,255,.6)'); hs.addColorStop(.6, 'rgba(255,120,220,.6)'); hs.addColorStop(1, 'rgba(120,90,255,0)');
    x.fillStyle = hs; x.fillRect(38, 590, W - 76, 7);
    x.fillStyle = 'rgba(255,255,255,.88)'; var bx = 38; for (var i = 0; i < 44 && bx < W - 130; i++) { var bw = 2 + (i * 7 % 5); x.fillRect(bx, 626, bw, 48); bx += bw + (2 + (i * 3 % 4)); }
    x.fillStyle = 'rgba(255,255,255,.5)'; x.font = '500 18px ui-monospace, monospace'; x.fillText('UW · MADISON', W - 188, 662);
  }
  draw(photo);  // photo is an already-loaded Image (or null)
  var tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16; tex.flipY = false;
  return tex;
}

function App() {
  var initial = false;
  try { initial = new URLSearchParams(location.search).get('drop') === '1'; } catch (e) {}
  const [open, setOpen] = useState(initial);
  const [tex, setTex] = useState(null);
  // load the photo FIRST, then build the texture with it already drawn in
  useEffect(() => {
    let done = false;
    const img = new Image();
    const finish = p => { if (!done) { done = true; setTex(makeCardTexture(p, 'Jelly')); } };
    img.onload = () => finish(img);
    img.onerror = () => finish(null);
    img.src = 'assets/idphoto.jpg';
  }, []);
  useEffect(() => {
    const onDrop = () => setOpen(true);
    window.addEventListener('lanyard:drop', onDrop);
    return () => window.removeEventListener('lanyard:drop', onDrop);
  }, []);
  return (open && tex) ? <Lanyard cardTexture={tex} /> : null;
}

const el = document.getElementById('introLanyard');
if (el) createRoot(el).render(<App />);
