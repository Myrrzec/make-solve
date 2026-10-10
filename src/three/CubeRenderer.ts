import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { STICKERS, type MoveGeometry, type Vec3 } from '../cube/geometry';
import { COLOR_HEX } from '../cube/names';
import type { CubeColor } from '../cube/types';

/**
 * Display only. The math model is the source of truth: after every animation
 * all pieces snap back to their home transforms and the stickers are repainted
 * from the state, so floating point error never accumulates.
 */

const UNKNOWN_HEX = '#a3a59f';
const HOME_CAMERA = new THREE.Vector3(6.2, 5.3, 8.6);
const AXES: Vec3[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

interface Cubie {
  group: THREE.Group;
  pos: Vec3;
}

interface RunningAnimation {
  finish: () => void;
}

export class CubeRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private root = new THREE.Group();
  private cubies: Cubie[] = [];
  private stickers: THREE.Mesh[] = [];
  private materials = new Map<string, THREE.MeshStandardMaterial>();
  private arrow: THREE.Group | null = null;
  private running: RunningAnimation | null = null;
  private frame = 0;
  private resizeObserver: ResizeObserver;

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.camera.position.copy(HOME_CAMERA);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 20;

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(5, 8, 6);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-6, -3, -4);
    this.scene.add(fill);
    this.scene.add(this.root);

    this.buildCube();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    const loop = () => {
      this.frame = requestAnimationFrame(loop);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  private material(hex: string) {
    let m = this.materials.get(hex);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45, metalness: 0 });
      this.materials.set(hex, m);
    }
    return m;
  }

  private buildCube() {
    const body = new RoundedBoxGeometry(0.97, 0.97, 0.97, 3, 0.1);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: '#1b1c1d', roughness: 0.6 });
    const sticker = roundedSquare(0.82, 0.12);
    const byPos = new Map<string, Cubie>();
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;
          const group = new THREE.Group();
          group.position.set(x, y, z);
          group.add(new THREE.Mesh(body, bodyMaterial));
          const cubie = { group, pos: [x, y, z] as Vec3 };
          this.cubies.push(cubie);
          byPos.set(`${x},${y},${z}`, cubie);
          this.root.add(group);
        }
    for (const s of STICKERS) {
      const mesh = new THREE.Mesh(sticker, this.material(UNKNOWN_HEX));
      const n = new THREE.Vector3(...s.normal);
      mesh.position.copy(n.clone().multiplyScalar(0.49));
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      byPos.get(s.pos.join(','))!.group.add(mesh);
      this.stickers[s.index] = mesh;
    }
  }

  setFacelets(colors: (CubeColor | null)[]) {
    colors.forEach((c, i) => {
      this.stickers[i].material = this.material(c ? COLOR_HEX[c] : UNKNOWN_HEX);
    });
  }

  /** Finishes any running animation right away. */
  finishAnimation() {
    this.running?.finish();
  }

  /**
   * Rotates the layers described by `geometry`, then snaps everything home and
   * repaints with `after`, the state the math model computed for this move.
   */
  animate(geometry: MoveGeometry, after: (CubeColor | null)[], durationMs: number): Promise<void> {
    this.finishAnimation();
    if (durationMs <= 0) {
      this.setFacelets(after);
      return Promise.resolve();
    }
    const pivot = new THREE.Group();
    this.root.add(pivot);
    const moving = this.cubies.filter((c) => geometry.layers.includes(c.pos[geometry.axis]));
    for (const c of moving) pivot.attach(c.group);
    const axis = new THREE.Vector3(...AXES[geometry.axis]);
    const total = (geometry.quarters * Math.PI) / 2;
    const start = performance.now();

    return new Promise((resolve) => {
      let raf = 0;
      const done = () => {
        cancelAnimationFrame(raf);
        for (const c of moving) {
          this.root.attach(c.group);
          c.group.position.set(...c.pos);
          c.group.quaternion.identity();
        }
        this.root.remove(pivot);
        this.setFacelets(after);
        this.running = null;
        resolve();
      };
      this.running = { finish: done };
      const tick = () => {
        const t = Math.min(1, (performance.now() - start) / durationMs);
        const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
        pivot.quaternion.setFromAxisAngle(axis, total * eased);
        if (t < 1) raf = requestAnimationFrame(tick);
        else done();
      };
      raf = requestAnimationFrame(tick);
    });
  }

  /** Curved arrow around the turning layer, pointing in the turn direction. */
  showArrow(geometry: MoveGeometry | null) {
    if (this.arrow) {
      this.root.remove(this.arrow);
      this.arrow.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      this.arrow = null;
    }
    if (!geometry) return;
    const axis = new THREE.Vector3(...AXES[geometry.axis]);
    const whole = geometry.layers.length === 3;
    const center = axis.clone().multiplyScalar(whole ? 0 : geometry.layers.reduce((a, b) => a + b, 0) / geometry.layers.length);
    const radius = whole ? 2.55 : 2.3;
    // Center the arc on the side facing the default camera.
    const view = new THREE.Vector3(1, 1, 1.3);
    const mid = view.sub(axis.clone().multiplyScalar(view.dot(axis))).normalize();
    const span = Math.abs(geometry.quarters) === 2 ? 1.5 : 1.0;
    const sign = Math.sign(geometry.quarters);
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = (-span / 2 + (span * i) / 24) * sign;
      points.push(mid.clone().applyAxisAngle(axis, t).multiplyScalar(radius).add(center));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: '#2a9c85', roughness: 0.35, emissive: '#0d3a31', emissiveIntensity: 0.6 });
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.055, 10, false), mat));
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 16), mat);
    const end = points[points.length - 1];
    const tangent = curve.getTangent(1).normalize();
    head.position.copy(end).add(tangent.clone().multiplyScalar(0.12));
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    group.add(head);
    this.arrow = group;
    this.root.add(group);
  }

  resetCamera() {
    this.camera.position.copy(HOME_CAMERA);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.finishAnimation();
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

function roundedSquare(size: number, r: number): THREE.ShapeGeometry {
  const s = size / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-s + r, -s);
  shape.lineTo(s - r, -s);
  shape.quadraticCurveTo(s, -s, s, -s + r);
  shape.lineTo(s, s - r);
  shape.quadraticCurveTo(s, s, s - r, s);
  shape.lineTo(-s + r, s);
  shape.quadraticCurveTo(-s, s, -s, s - r);
  shape.lineTo(-s, -s + r);
  shape.quadraticCurveTo(-s, -s, -s + r, -s);
  return new THREE.ShapeGeometry(shape);
}
