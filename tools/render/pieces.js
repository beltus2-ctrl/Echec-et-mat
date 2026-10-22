import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Brush, Evaluator, SUBTRACTION, ADDITION } from 'three-bvh-csg';

// ---------- procedural wood textures ----------
function rand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function noise1D(seed, n) {
  const r = rand(seed);
  const pts = Array.from({ length: n + 1 }, r);
  return (t) => {
    const x = ((t % 1) + 1) % 1 * n;
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    return pts[i] * (1 - u) + pts[i + 1] * u;
  };
}

// Vertical grain texture: u wraps around the lathe, v runs along the profile.
function woodTexture({ base, dark, light, seed = 1, contrast = 1, size = 1024, streaks = 140 }) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const n1 = noise1D(seed, 64);
  const n2 = noise1D(seed + 7, 9);
  const n3 = noise1D(seed + 13, 23);
  const r = rand(seed + 3);
  const fine = Array.from({ length: size }, () => r());
  const toRGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const B = toRGB(base), D = toRGB(dark), L = toRGB(light);
  for (let y = 0; y < size; y++) {
    const wob = n2(y / size) * 0.06 + n3(y / size * 0.5) * 0.03;
    for (let x = 0; x < size; x++) {
      const u = x / size + wob;
      const ring = Math.sin((u * streaks + n1(u) * 18) * Math.PI);
      const band = Math.pow(Math.abs(ring), 6);
      const g = (fine[x] - 0.5) * 0.18;
      let t = band * 0.75 * contrast + g * contrast;
      const k = (y * size + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const target = t > 0 ? D[ch] : L[ch];
        const a = Math.min(1, Math.abs(t));
        img.data[k + ch] = B[ch] * (1 - a) + target * a;
      }
      img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

function materials(color) {
  if (color === 'w') {
    return {
      body: new THREE.MeshPhysicalMaterial({
        map: woodTexture({ base: '#d29c58', dark: '#a0652f', light: '#e6bf86', seed: 11, contrast: 0.75 }),
        roughness: 0.42,
        clearcoat: 0.7,
        clearcoatRoughness: 0.22,
        sheen: 0.2,
      }),
      accent: new THREE.MeshPhysicalMaterial({
        color: '#1c140f', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15,
      }),
    };
  }
  return {
    body: new THREE.MeshPhysicalMaterial({
      map: woodTexture({ base: '#2a2421', dark: '#141110', light: '#3d3530', seed: 29, contrast: 0.6 }),
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    }),
    accent: new THREE.MeshPhysicalMaterial({
      map: woodTexture({ base: '#d79b5c', dark: '#a8682f', light: '#efbd84', seed: 5, contrast: 0.5 }),
      roughness: 0.4,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
    }),
  };
}

// ---------- profile builder ----------
class Profile {
  constructor() {
    this.pts = [new THREE.Vector2(0, 0)];
  }
  last() {
    return this.pts[this.pts.length - 1];
  }
  line(r, y, steps = 1) {
    const a = this.last().clone();
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.pts.push(new THREE.Vector2(a.x + (r - a.x) * t, a.y + (y - a.y) * t));
    }
    return this;
  }
  // quadratic bezier through control point (cr, cy)
  curve(cr, cy, r, y, steps = 12) {
    const a = this.last().clone();
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const it = 1 - t;
      this.pts.push(
        new THREE.Vector2(
          it * it * a.x + 2 * it * t * cr + t * t * r,
          it * it * a.y + 2 * it * t * cy + t * t * y,
        ),
      );
    }
    return this;
  }
  // arc around centre (cr, cy) from angle a0 to a1 (radians, 0 = +r direction)
  arc(cr, cy, rad, a0, a1, steps = 16) {
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      this.pts.push(new THREE.Vector2(Math.max(0, cr + Math.cos(a) * rad), cy + Math.sin(a) * rad));
    }
    return this;
  }
  close() {
    const l = this.last();
    if (l.x !== 0) this.pts.push(new THREE.Vector2(0, l.y));
    return this;
  }
  geometry(segments = 96) {
    const pts = this.pts.filter((p, i, arr) => i === 0 || p.distanceTo(arr[i - 1]) > 1e-5);
    const g = new THREE.LatheGeometry(pts, segments);
    g.computeVertexNormals();
    return g;
  }
}

// Shared Staunton foot: returns profile ending at (topR, topY)
function foot(R) {
  const p = new Profile();
  p.line(R - 0.01, 0)
    .curve(R, 0, R, 0.012, 3)
    .line(R, 0.04)
    .arc(R - 0.005, 0.068, 0.028, -Math.PI / 2, Math.PI / 2, 10)
    .line(R * 0.9, 0.1)
    .line(R * 0.9, 0.12)
    .curve(R * 0.92, 0.135, R * 0.8, 0.145, 6);
  return p;
}

function torus(r, y, tube = 0.012) {
  const g = new THREE.TorusGeometry(r, tube, 12, 96);
  g.rotateX(Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

const evaluator = new Evaluator();
evaluator.useGroups = true;

function brush(geom, mat) {
  const b = new Brush(geom, mat);
  b.updateMatrixWorld();
  return b;
}

function subtract(a, geom, mat, transform) {
  const b = new Brush(geom, mat);
  transform?.(b);
  b.updateMatrixWorld();
  const r = evaluator.evaluate(a, b, SUBTRACTION);
  r.updateMatrixWorld();
  return r;
}

// ---------- pieces ----------
function pawn(m) {
  const p = foot(0.33);
  p.curve(0.16, 0.2, 0.135, 0.4, 14)
    .line(0.2, 0.43)
    .arc(0.205, 0.45, 0.022, -Math.PI / 2, Math.PI / 2, 8)
    .line(0.115, 0.49)
    .curve(0.1, 0.52, 0.12, 0.535, 4);
  // ball
  const cy = 0.705, rad = 0.19;
  const a0 = -Math.acos(0.12 / rad) * 1 - 0.0;
  p.arc(0, cy, rad, -Math.asin((cy - 0.535) / rad), Math.PI / 2, 28);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(p.geometry(), m.body));
  group.add(new THREE.Mesh(torus(0.222, 0.45, 0.012), m.accent));
  void a0;
  return group;
}

function rook(m) {
  const p = foot(0.36);
  p.curve(0.24, 0.3, 0.2, 0.62, 16)
    .line(0.25, 0.645)
    .arc(0.255, 0.665, 0.02, -Math.PI / 2, Math.PI / 2, 8)
    .line(0.2, 0.69)
    .curve(0.2, 0.74, 0.28, 0.79, 8)
    .line(0.285, 0.98)
    .curve(0.285, 1.0, 0.27, 1.0, 3)
    .line(0.2, 1.0)
    .line(0.19, 0.93)
    .close();
  let body = brush(p.geometry(), m.body);
  for (let i = 0; i < 3; i++) {
    body = subtract(body, new THREE.BoxGeometry(0.9, 0.12, 0.075), m.accent, (b) => {
      b.position.set(0, 0.995, 0);
      b.rotation.y = (i * Math.PI) / 3 + Math.PI / 6;
    });
  }
  const group = new THREE.Group();
  group.add(body);
  group.add(new THREE.Mesh(torus(0.27, 0.665, 0.011), m.accent));
  group.add(new THREE.Mesh(torus(0.285, 0.86, 0.008), m.accent));
  return group;
}

function bishop(m) {
  const p = foot(0.35);
  p.curve(0.17, 0.3, 0.115, 0.7, 18)
    .line(0.21, 0.73)
    .arc(0.215, 0.75, 0.02, -Math.PI / 2, Math.PI / 2, 8)
    .line(0.17, 0.775)
    .arc(0.17, 0.79, 0.015, -Math.PI / 2, Math.PI / 2, 6)
    .line(0.1, 0.82)
    .curve(0.08, 0.84, 0.13, 0.88, 6)
    .curve(0.2, 0.95, 0.17, 1.07, 12)
    .curve(0.13, 1.18, 0.035, 1.235, 12);
  p.arc(0, 1.285, 0.055, -Math.PI / 2 + 0.6, Math.PI / 2, 12);
  let body = brush(p.geometry(), m.body);
  body = subtract(body, new THREE.BoxGeometry(0.5, 0.032, 0.4), m.accent, (b) => {
    b.position.set(0.02, 1.06, 0.2);
    b.rotation.set(0, -0.35, 0.62);
  });
  const group = new THREE.Group();
  group.add(body);
  group.add(new THREE.Mesh(torus(0.23, 0.75, 0.011), m.accent));
  return group;
}

function crownTop(p, rimR, rimY) {
  return p;
}

function queen(m) {
  const p = foot(0.39);
  p.curve(0.19, 0.38, 0.13, 0.86, 20)
    .line(0.23, 0.885)
    .arc(0.235, 0.905, 0.02, -Math.PI / 2, Math.PI / 2, 8)
    .line(0.19, 0.93)
    .arc(0.19, 0.945, 0.015, -Math.PI / 2, Math.PI / 2, 6)
    .line(0.12, 0.97)
    .curve(0.12, 1.15, 0.255, 1.33, 14)
    .arc(0.255, 1.345, 0.018, -Math.PI / 2, Math.PI / 2, 6)
    .line(0.22, 1.37)
    .curve(0.12, 1.39, 0.08, 1.45, 8)
    .line(0.045, 1.465);
  p.arc(0, 1.52, 0.065, -Math.PI / 2 + 0.75, Math.PI / 2, 14);
  let body = brush(p.geometry(), m.body);
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    body = subtract(body, new THREE.SphereGeometry(0.068, 20, 14), m.body, (b) => {
      b.position.set(Math.cos(a) * 0.27, 1.395, Math.sin(a) * 0.27);
    });
  }
  const group = new THREE.Group();
  group.add(body);
  group.add(new THREE.Mesh(torus(0.25, 0.905, 0.011), m.accent));
  // little pearls on crown points
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), m.body);
    s.position.set(Math.cos(a) * 0.25, 1.385, Math.sin(a) * 0.25);
    group.add(s);
  }
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), m.body);
  top.position.set(0, 1.59, 0);
  group.add(top);
  return group;
}

function king(m) {
  const p = foot(0.41);
  p.curve(0.2, 0.4, 0.135, 0.92, 20)
    .line(0.24, 0.945)
    .arc(0.245, 0.965, 0.02, -Math.PI / 2, Math.PI / 2, 8)
    .line(0.2, 0.99)
    .arc(0.2, 1.005, 0.015, -Math.PI / 2, Math.PI / 2, 6)
    .line(0.125, 1.03)
    .curve(0.12, 1.2, 0.25, 1.38, 14)
    .arc(0.25, 1.395, 0.018, -Math.PI / 2, Math.PI / 2, 6)
    .line(0.23, 1.415)
    .curve(0.2, 1.5, 0.08, 1.53, 10)
    .line(0.065, 1.545)
    .line(0.065, 1.57)
    .close();
  const group = new THREE.Group();
  group.add(new THREE.Mesh(p.geometry(), m.body));
  group.add(new THREE.Mesh(torus(0.26, 0.965, 0.011), m.accent));
  group.add(new THREE.Mesh(torus(0.263, 1.395, 0.01), m.accent));
  const v = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.3, 0.085, 4, 0.02), m.body);
  v.position.set(0, 1.71, 0);
  const h = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.085, 0.085, 4, 0.02), m.body);
  h.position.set(0, 1.74, 0);
  group.add(v, h);
  return group;
}

function knight(m) {
  const p = foot(0.36);
  p.curve(0.3, 0.17, 0.27, 0.2, 6)
    .line(0.27, 0.215)
    .arc(0.27, 0.235, 0.02, -Math.PI / 2, Math.PI / 2, 8)
    .line(0.24, 0.26)
    .close();
  const group = new THREE.Group();
  group.add(new THREE.Mesh(p.geometry(), m.body));
  group.add(new THREE.Mesh(torus(0.285, 0.235, 0.011), m.accent));

  const s = new THREE.Shape();
  s.moveTo(0.2, 0.22);
  s.bezierCurveTo(0.27, 0.42, 0.26, 0.64, 0.2, 0.82);
  s.bezierCurveTo(0.16, 0.95, 0.12, 1.02, 0.08, 1.07);
  // ear
  s.lineTo(0.075, 1.2);
  s.bezierCurveTo(0.05, 1.17, 0.02, 1.13, 0.0, 1.09);
  // forehead
  s.bezierCurveTo(-0.06, 1.07, -0.12, 1.02, -0.18, 0.95);
  // nose bridge
  s.bezierCurveTo(-0.25, 0.88, -0.31, 0.83, -0.345, 0.78);
  // muzzle
  s.bezierCurveTo(-0.37, 0.75, -0.36, 0.7, -0.33, 0.69);
  s.bezierCurveTo(-0.29, 0.675, -0.25, 0.69, -0.2, 0.71);
  // jaw
  s.bezierCurveTo(-0.13, 0.735, -0.09, 0.72, -0.08, 0.66);
  // chest
  s.bezierCurveTo(-0.08, 0.56, -0.2, 0.5, -0.22, 0.38);
  s.bezierCurveTo(-0.235, 0.3, -0.23, 0.25, -0.22, 0.22);
  s.lineTo(0.2, 0.22);
  const depth = 0.18;
  const g = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.035,
    bevelSegments: 8,
    curveSegments: 48,
  });
  g.translate(0, 0, -depth / 2);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const merged = mergeVertices(g, 1e-4);
  merged.computeVertexNormals();
  // planar uv along the profile for the grain
  const pos = merged.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) * 1.3 + pos.getZ(i) * 0.6 + 0.5;
    uv[i * 2 + 1] = pos.getY(i) * 0.7;
  }
  merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

  let head = brush(merged, m.body);
  // eyes & nostrils
  for (const side of [-1, 1]) {
    head = subtract(head, new THREE.SphereGeometry(0.035, 16, 12), m.accent, (b) => {
      b.position.set(-0.13, 0.94, side * (depth / 2 + 0.065));
    });
    head = subtract(head, new THREE.SphereGeometry(0.022, 12, 10), m.accent, (b) => {
      b.position.set(-0.31, 0.76, side * (depth / 2 + 0.035));
    });
  }
  // mouth
  head = subtract(head, new THREE.BoxGeometry(0.1, 0.014, 0.4), m.accent, (b) => {
    b.position.set(-0.34, 0.715, 0);
    b.rotation.z = 0.15;
  });
  group.add(head);
  return group;
}

const builders = { p: pawn, r: rook, n: knight, b: bishop, q: queen, k: king };

// ---------- renderer ----------
export async function setup(width, height) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const key = new THREE.DirectionalLight(0xfff1dc, 2.6);
  key.position.set(-2.5, 4.5, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -1.5;
  key.shadow.camera.right = key.shadow.camera.top = 1.5;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.01;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc9dcff, 0.7);
  fill.position.set(3, 2, 2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 1.6);
  rim.position.set(1.5, 3, -4);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a2a1c, 0.35));

  // Orthographic camera framed so a square is exactly `width` px wide.
  const W = 1.1;
  const H = (W * height) / width;
  const cam = new THREE.OrthographicCamera(-W / 2, W / 2, H, 0, 0.1, 20);
  const elev = (24 * Math.PI) / 180;
  const dist = 6;
  cam.position.set(0, Math.sin(elev) * dist, Math.cos(elev) * dist);
  cam.up.set(0, 1, 0);
  cam.lookAt(0, 0, 0);
  // shift frustum so the base sits near the bottom
  const bottomPad = 0.2;
  cam.top = H - bottomPad;
  cam.bottom = -bottomPad;
  cam.updateProjectionMatrix();

  const cache = {};
  return {
    render(type, color, yaw = 0) {
      cache[color] ??= materials(color);
      const obj = builders[type](cache[color]);
      obj.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      obj.rotation.y = yaw;
      scene.add(obj);
      renderer.render(scene, cam);
      const url = renderer.domElement.toDataURL('image/png');
      scene.remove(obj);
      return url;
    },
  };
}

void crownTop;
void ADDITION;
