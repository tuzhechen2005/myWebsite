/* =========================================================
   Ballpit — vanilla JS port from React Bits.
   Requires three.js via ESM CDN. Designed for decorative hero
   backgrounds in this static site.
   ========================================================= */
import {
  Vector3,
  Vector2,
  Object3D,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  SphereGeometry,
  InstancedMesh,
  MeshPhysicalMaterial,
  AmbientLight,
  PointLight,
  Color,
  Clock,
  MathUtils,
  Raycaster,
  Plane,
  SRGBColorSpace,
  ACESFilmicToneMapping
} from '../vendor/three/three.module.js';

const DEFAULTS = {
  count: 200,
  colors: [0xb8a6e8, 0x7c5fd6, 0xa98fe0],
  ambientColor: 0xffffff,
  ambientIntensity: 1,
  lightIntensity: 200,
  minSize: 0.5,
  maxSize: 1,
  size0: 1,
  gravity: 0,
  friction: 0.9988,
  wallBounce: 0.95,
  maxVelocity: 0.15,
  maxX: 5,
  maxY: 5,
  maxZ: 2,
  minCount: 48,
  referenceArea: 1180 * 680,
  explosionStrength: 0.095,
  drift: 0.006,
  followCursor: true,
  materialParams: {
    metalness: 0.55,
    roughness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.12
  }
};

const tmpObj = new Object3D();
const tmpA = new Vector3();
const tmpB = new Vector3();
const tmpV = new Vector3();
const tmpN = new Vector3();
const tmpPush = new Vector3();

function randSpread(range) {
  return MathUtils.randFloatSpread(range);
}

function clampVelocity(v, max) {
  if (v.lengthSq() > max * max) v.setLength(max);
}

function paletteColor(colors, ratio) {
  if (!colors.length) return new Color(0xffffff);
  if (colors.length === 1) return new Color(colors[0]);
  const scaled = MathUtils.clamp(ratio, 0, 1) * (colors.length - 1);
  const idx = Math.floor(scaled);
  const start = new Color(colors[idx]);
  const end = new Color(colors[Math.min(idx + 1, colors.length - 1)]);
  return start.lerp(end, scaled - idx);
}

class BallPhysics {
  constructor(config) {
    this.config = config;
    this.positions = new Float32Array(config.count * 3);
    this.velocities = new Float32Array(config.count * 3);
    this.sizes = new Float32Array(config.count);
    this.cursorCenter = new Vector3();
    this.cursorActive = false;
    this.reset();
  }

  reset() {
    const c = this.config;
    this.sizes[0] = c.size0;
    this.positions.fill(0);
    this.velocities.fill(0);

    for (let i = 1; i < c.count; i++) {
      const base = i * 3;
      const angle = MathUtils.randFloat(0, Math.PI * 2);
      const centerRadius = MathUtils.randFloat(0.06, 0.2) * Math.min(c.maxX, c.maxY);
      const out = tmpA.set(Math.cos(angle), Math.sin(angle) * 0.72, randSpread(0.28)).normalize();
      this.positions[base] = out.x * centerRadius;
      this.positions[base + 1] = out.y * centerRadius;
      this.positions[base + 2] = randSpread(c.maxZ * 0.35);

      const tangent = tmpB.set(-out.y, out.x, randSpread(0.2)).normalize();
      const speed = MathUtils.randFloat(c.explosionStrength * 0.45, c.explosionStrength);
      tmpV.copy(out).multiplyScalar(speed).addScaledVector(tangent, randSpread(c.drift * 2));
      tmpV.toArray(this.velocities, base);
      this.sizes[i] = MathUtils.randFloat(c.minSize, c.maxSize);
    }
  }

  update(delta, elapsed) {
    const c = this.config;
    const start = c.followCursor && this.cursorActive ? 1 : 0;

    if (start === 1) {
      tmpA.fromArray(this.positions, 0).lerp(this.cursorCenter, 0.14).toArray(this.positions, 0);
      tmpV.set(0, 0, 0).toArray(this.velocities, 0);
    }

    for (let i = start; i < c.count; i++) {
      const base = i * 3;
      tmpA.fromArray(this.positions, base);
      tmpV.fromArray(this.velocities, base);
      if (c.gravity) tmpV.y -= delta * c.gravity * this.sizes[i];
      tmpV.x += Math.sin(elapsed * 0.42 + i * 12.989) * c.drift * delta;
      tmpV.y += Math.cos(elapsed * 0.36 + i * 78.233) * c.drift * delta;
      tmpV.z += Math.sin(elapsed * 0.3 + i * 37.719) * c.drift * 0.55 * delta;
      tmpV.multiplyScalar(c.friction);
      clampVelocity(tmpV, c.maxVelocity);
      tmpA.add(tmpV);
      tmpA.toArray(this.positions, base);
      tmpV.toArray(this.velocities, base);
    }

    for (let i = start; i < c.count; i++) {
      const base = i * 3;
      tmpA.fromArray(this.positions, base);
      tmpV.fromArray(this.velocities, base);
      const radius = this.sizes[i];

      for (let j = i + 1; j < c.count; j++) {
        const otherBase = j * 3;
        tmpB.fromArray(this.positions, otherBase);
        tmpN.fromArray(this.velocities, otherBase);
        const otherRadius = this.sizes[j];
        tmpPush.copy(tmpB).sub(tmpA);
        const dist = Math.max(tmpPush.length(), 0.0001);
        const sum = radius + otherRadius;
        if (dist < sum) {
          const overlap = (sum - dist) * 0.5;
          tmpPush.multiplyScalar(overlap / dist);
          tmpA.sub(tmpPush);
          tmpB.add(tmpPush);
          tmpV.addScaledVector(tmpPush, -Math.max(tmpV.length(), 0.8));
          tmpN.addScaledVector(tmpPush, Math.max(tmpN.length(), 0.8));
          tmpB.toArray(this.positions, otherBase);
          tmpN.toArray(this.velocities, otherBase);
        }
      }

      if (c.followCursor && this.cursorActive && i !== 0) {
        tmpB.fromArray(this.positions, 0);
        tmpPush.copy(tmpB).sub(tmpA);
        const dist = Math.max(tmpPush.length(), 0.0001);
        const sum = radius + this.sizes[0];
        if (dist < sum) {
          tmpPush.multiplyScalar((sum - dist) / dist);
          tmpA.sub(tmpPush);
          tmpV.addScaledVector(tmpPush, -Math.max(tmpV.length(), 1.4));
        }
      }

      if (Math.abs(tmpA.x) + radius > c.maxX) {
        tmpA.x = Math.sign(tmpA.x || 1) * (c.maxX - radius);
        tmpV.x = -tmpV.x * c.wallBounce;
      }
      if (Math.abs(tmpA.y) + radius > c.maxY) {
        tmpA.y = Math.sign(tmpA.y || 1) * (c.maxY - radius);
        tmpV.y = -tmpV.y * c.wallBounce;
      }
      if (Math.abs(tmpA.z) + radius > Math.max(c.maxZ, c.maxSize)) {
        tmpA.z = Math.sign(tmpA.z || 1) * (c.maxZ - radius);
        tmpV.z = -tmpV.z * c.wallBounce;
      }

      tmpA.toArray(this.positions, base);
      tmpV.toArray(this.velocities, base);
    }
  }
}

class BallpitInstance {
  constructor(canvas, props) {
    this.canvas = canvas;
    this.config = { ...DEFAULTS, ...props };
    this.baseCount = this.config.count;
    this.clock = new Clock();
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 0, 20);
    this.camera.lookAt(0, 0, 0);
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.setClearColor(0x000000, 0);
    this.raycaster = new Raycaster();
    this.pointer = new Vector2();
    this.plane = new Plane(new Vector3(0, 0, 1), 0);
    this.hit = new Vector3();
    this.isVisible = true;
    this.isDisposed = false;
    this.lastStableWidth = 0;
    this.lastStableHeight = 0;

    this.resize();
    this.initScene();
    this.bind();
    this.animate();
  }

  initScene() {
    this.scene.add(new AmbientLight(this.config.ambientColor, this.config.ambientIntensity));
    this.light = new PointLight(this.config.colors[0], this.config.lightIntensity);
    this.scene.add(this.light);
    this.rebuild(this.computeCount());
  }

  rebuild(count) {
    const nextCount = Math.max(2, count);
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry?.dispose();
      if (Array.isArray(this.mesh.material)) this.mesh.material.forEach((m) => m.dispose());
      else this.mesh.material?.dispose();
    }
    this.config.count = nextCount;
    this.physics = new BallPhysics(this.config);
    const material = new MeshPhysicalMaterial({ ...this.config.materialParams });
    const geometry = new SphereGeometry(1, 24, 16);
    this.mesh = new InstancedMesh(geometry, material, this.config.count);
    for (let i = 0; i < this.config.count; i++) this.mesh.setColorAt(i, paletteColor(this.config.colors, i / this.config.count));
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.scene.add(this.mesh);
  }

  computeCount() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width || this.canvas.offsetWidth);
    const height = Math.max(1, rect.height || this.canvas.offsetHeight);
    const areaRatio = MathUtils.clamp((width * height) / this.config.referenceArea, 0.22, 1);
    return Math.round(MathUtils.clamp(this.baseCount * areaRatio, this.config.minCount, this.baseCount));
  }

  bind() {
    this.onResize = this.resize.bind(this);
    this.onPointerMove = this.pointerMove.bind(this);
    this.onPointerLeave = this.pointerLeave.bind(this);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerleave', this.onPointerLeave);
    this.resizeObserver = new ResizeObserver(this.onResize);
    if (this.canvas.parentNode) this.resizeObserver.observe(this.canvas.parentNode);
    this.observer = new IntersectionObserver((entries) => {
      this.isVisible = entries[0] ? entries[0].isIntersecting : true;
    });
    this.observer.observe(this.canvas);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width || this.canvas.offsetWidth);
    const height = Math.max(1, rect.height || this.canvas.offsetHeight);
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.camera.aspect = width / height;
    this.camera.fov = this.camera.aspect > 1.6 ? 38 : 48;
    this.camera.updateProjectionMatrix();
    const fov = MathUtils.degToRad(this.camera.fov);
    const wHeight = 2 * Math.tan(fov / 2) * this.camera.position.length();
    const wWidth = wHeight * this.camera.aspect;
    this.config.maxX = wWidth / 2;
    this.config.maxY = wHeight / 2;
    const nextCount = this.computeCount();
    const sizeChanged =
      Math.abs(width - this.lastStableWidth) > 80 ||
      Math.abs(height - this.lastStableHeight) > 120;
    if (this.mesh && Math.abs(nextCount - this.config.count) >= 8) {
      this.rebuild(nextCount);
      this.lastStableWidth = width;
      this.lastStableHeight = height;
    } else if (this.physics && sizeChanged) {
      this.physics.reset();
      this.lastStableWidth = width;
      this.lastStableHeight = height;
    } else if (!this.lastStableWidth || !this.lastStableHeight) {
      this.lastStableWidth = width;
      this.lastStableHeight = height;
    }
  }

  pointerMove(event) {
    if (!this.config.followCursor) return;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) {
      this.physics.cursorActive = false;
      return;
    }
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.camera.getWorldDirection(this.plane.normal);
    this.raycaster.ray.intersectPlane(this.plane, this.hit);
    this.physics.cursorCenter.copy(this.hit);
    this.physics.cursorActive = true;
  }

  pointerLeave() {
    this.physics.cursorActive = false;
  }

  animate() {
    if (this.isDisposed) return;
    this.raf = requestAnimationFrame(this.animate.bind(this));
    if (!this.isVisible || document.hidden) return;
    const delta = Math.min(0.033, this.clock.getDelta());
    this.physics.update(delta, this.clock.elapsedTime);
    for (let i = 0; i < this.config.count; i++) {
      tmpObj.position.fromArray(this.physics.positions, i * 3);
      tmpObj.scale.setScalar(i === 0 ? 0 : this.physics.sizes[i]);
      tmpObj.updateMatrix();
      this.mesh.setMatrixAt(i, tmpObj.matrix);
      if (i === 0) this.light.position.copy(tmpObj.position);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.isDisposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerleave', this.onPointerLeave);
    this.resizeObserver?.disconnect();
    this.observer?.disconnect();
    this.scene.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material?.dispose();
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

export function createBallpit(canvas, props = {}) {
  if (!canvas) return { dispose() {} };
  return new BallpitInstance(canvas, props);
}
