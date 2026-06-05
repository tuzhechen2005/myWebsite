import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
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
  const [visible, setVisible] = useState(initial);
  const [retracting, setRetracting] = useState(false);
  const [tex, setTex] = useState(null);
  const retractTimer = useRef(0);
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
    const onDrop = () => {
      window.clearTimeout(retractTimer.current);
      if (visible) {
        setRetracting(true);
        document.body.classList.remove('lanyard-dragging');
        retractTimer.current = window.setTimeout(() => {
          setVisible(false);
          setRetracting(false);
        }, 850);
      } else {
        setRetracting(false);
        setVisible(true);
      }
    };
    window.addEventListener('lanyard:drop', onDrop);
    return () => {
      window.clearTimeout(retractTimer.current);
      window.removeEventListener('lanyard:drop', onDrop);
    };
  }, [visible]);
  useEffect(() => {
    if (!el) return undefined;
    el.classList.toggle('is-open', visible && !!tex && !retracting);
    el.classList.toggle('is-retracting', visible && !!tex && retracting);
    if (!visible) document.body.classList.remove('lanyard-dragging');
    return () => {
      el.classList.remove('is-open');
      el.classList.remove('is-retracting');
    };
  }, [visible, retracting, tex]);
  return (visible && tex) ? <Lanyard cardTexture={tex} /> : null;
}

const el = document.getElementById('introLanyard');
if (el) createRoot(el).render(<App />);
