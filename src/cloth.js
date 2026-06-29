import * as THREE from 'three';
import { CLOTH_WIDTH, CLOTH_HEIGHT, SEG_X, SEG_Y, ITERATIONS } from './config.js';
import { state } from './state.js';
import { scene } from './scene.js';
import { fabricTex } from './fabricTexture.js';

// ---------- 布料物理 ----------
class Cloth {
  constructor(w, h, segX, segY) {
    this.w = w;
    this.h = h;
    this.segX = segX;
    this.segY = segY;
    this.particles = [];
    this.constraints = [];

    for (let y = 0; y <= segY; y++) {
      for (let x = 0; x <= segX; x++) {
        const u = x / segX;
        const v = y / segY;
        const px = (u - 0.5) * w;
        const py = (0.5 - v) * h;
        const pz = 0;
        this.particles.push({
          x: px, y: py, z: pz,
          ox: px, oy: py, oz: pz,
          ix: x, iy: y,
          pinned: false,
        });
      }
    }

    const idx = (x, y) => y * (segX + 1) + x;
    for (let y = 0; y <= segY; y++) {
      for (let x = 0; x <= segX; x++) {
        if (x < segX) this.constraints.push([idx(x, y), idx(x + 1, y), w / segX]);
        if (y < segY) this.constraints.push([idx(x, y), idx(x, y + 1), h / segY]);
      }
    }

    for (let x = 0; x <= segX; x++) {
      this.particles[idx(x, 0)].pinned = true;
    }
  }
}

export const cloth = new Cloth(CLOTH_WIDTH, CLOTH_HEIGHT, SEG_X, SEG_Y);

// ---------- 布料网格 ----------
export const geometry = new THREE.PlaneGeometry(CLOTH_WIDTH, CLOTH_HEIGHT, SEG_X, SEG_Y);
geometry.attributes.position.usage = THREE.DynamicDrawUsage;

const posAttr = geometry.attributes.position;
for (let i = 0; i < cloth.particles.length; i++) {
  const p = cloth.particles[i];
  posAttr.setXYZ(i, p.x, p.y, p.z);
}
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  bumpMap: fabricTex,
  bumpScale: 0.04,
  roughness: 0.92,
  metalness: 0.02,
  side: THREE.DoubleSide,
});

export const clothMesh = new THREE.Mesh(geometry, material);
clothMesh.castShadow = true;
clothMesh.receiveShadow = true;
clothMesh.position.y = 0.0;
clothMesh.rotation.x = -0.06;
scene.add(clothMesh);

// ---------- 顶部挂杆 ----------
const rodGeo = new THREE.CylinderGeometry(0.06, 0.06, CLOTH_WIDTH + 0.5, 16);
const rodMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.3, metalness: 0.8 });
const rod = new THREE.Mesh(rodGeo, rodMat);
rod.rotation.z = Math.PI / 2;
rod.position.set(0, CLOTH_HEIGHT / 2, 0);
rod.castShadow = true;
clothMesh.add(rod);

// ---------- 物理更新 ----------
const gravity = new THREE.Vector3(0, -2.8, 0);

export function updateCloth(dt, time) {
  const totalWind = state.windStrength + state.gust;
  state.gust = THREE.MathUtils.lerp(state.gust, 0, dt * 1.2);

  for (const p of cloth.particles) {
    if (p.pinned) continue;

    const wind = new THREE.Vector3(
      Math.sin(time * 1.6 + p.y * 2.4) * 0.4 + Math.cos(time * 0.7 + p.x * 3.0) * 0.2,
      Math.sin(time * 1.1 + p.x * 1.8) * 0.15,
      Math.sin(time * 2.2 + p.x * 4.0 + p.y * 2.5) * 0.5 + 0.55
    ).multiplyScalar(totalWind * (0.85 + Math.random() * 0.3));

    const force = new THREE.Vector3().addVectors(gravity, wind);

    if (state.mouseDown && state.mouseMode !== 'none') {
      const dx = state.mouseTarget.x - p.x;
      const dy = state.mouseTarget.y - p.y;
      const dz = state.mouseTarget.z - p.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const radius = 1.2;
      if (dist < radius && dist > 0.001) {
        const strength = (state.mouseMode === 'drag' ? 7.0 : 3.5) * (1 - dist / radius);
        const k = Math.min(strength * dt, 1.0);
        p.x += dx * k;
        p.y += dy * k;
        p.z += dz * k;
        p.ox += dx * k * 0.5;
        p.oy += dy * k * 0.5;
        p.oz += dz * k * 0.5;
      }
    }

    const damping = 0.985;
    const vx = (p.x - p.ox) * damping;
    const vy = (p.y - p.oy) * damping;
    const vz = (p.z - p.oz) * damping;

    p.ox = p.x;
    p.oy = p.y;
    p.oz = p.z;

    p.x += vx + force.x * dt * dt;
    p.y += vy + force.y * dt * dt;
    p.z += vz + force.z * dt * dt;
  }

  for (let k = 0; k < ITERATIONS; k++) {
    for (const c of cloth.constraints) {
      const p1 = cloth.particles[c[0]];
      const p2 = cloth.particles[c[1]];
      const rest = c[2];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist === 0) continue;

      const diff = (dist - rest) / dist;
      const offsetX = dx * diff * 0.5;
      const offsetY = dy * diff * 0.5;
      const offsetZ = dz * diff * 0.5;

      if (!p1.pinned) {
        p1.x += offsetX;
        p1.y += offsetY;
        p1.z += offsetZ;
      }
      if (!p2.pinned) {
        p2.x -= offsetX;
        p2.y -= offsetY;
        p2.z -= offsetZ;
      }
    }
  }

  for (let i = 0; i < cloth.particles.length; i++) {
    const p = cloth.particles[i];
    posAttr.setXYZ(i, p.x, p.y, p.z);
  }
  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();
}
