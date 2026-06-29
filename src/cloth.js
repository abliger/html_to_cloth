/**
 * 布料物理与网格
 *
 * 本文件实现了一块悬挂布料的物理模拟及其 Three.js 可视化：
 * - Cloth 类：使用质点-弹簧模型（Verlet 积分）描述布料。
 * - 布料网格：把质点位置同步到 PlaneGeometry 的顶点，实现随风摆动。
 * - 挂杆：布料顶部固定在一根圆柱形挂杆上。
 * - 重建支持：通过 clothContext 与 rebuildCloth()，支持运行时修改 SEG_X / SEG_Y。
 *
 * 物理核心：
 * 1. 每个网格交点是一个质点（particle），保存当前位置 (x,y,z) 和上一帧位置 (ox,oy,oz)。
 * 2. 相邻质点之间用约束（constraint）保持固定距离，模拟布料的不可拉伸性。
 * 3. 每帧对质点施加重力、风力，并做阻尼，然后多次迭代约束求解。
 * 4. 顶部一排质点 pinned = true，表示固定在挂杆上。
 */

import * as THREE from 'three';
import { CLOTH_WIDTH, CLOTH_HEIGHT, SEG_X, SEG_Y, ITERATIONS, BASE_SEG_X, BASE_SEG_Y } from './config.js';
import { state } from './state.js';
import { scene } from './scene.js';
import { fabricTex } from './fabricTexture.js';

// ---------- 布料物理 ----------
/**
 * Cloth 类：基于 Verlet 积分的质点-弹簧布料。
 *
 * @param {number} w - 布料宽度
 * @param {number} h - 布料高度
 * @param {number} segX - 横向分段数
 * @param {number} segY - 纵向分段数
 */
class Cloth {
  constructor(w, h, segX, segY) {
    this.w = w;
    this.h = h;
    this.segX = segX;
    this.segY = segY;
    this.particles = [];   // 所有质点
    this.constraints = []; // 所有距离约束 [particleIndexA, particleIndexB, restLength]

    // 创建网格质点：按 y 行优先，每行 segX+1 个
    for (let y = 0; y <= segY; y++) {
      for (let x = 0; x <= segX; x++) {
        const u = x / segX; // 横向归一化坐标 0~1
        const v = y / segY; // 纵向归一化坐标 0~1
        // 将归一化坐标映射到以中心为原点的世界坐标
        const px = (u - 0.5) * w;
        const py = (0.5 - v) * h;
        const pz = 0;
        this.particles.push({
          x: px, y: py, z: pz,    // 当前位置
          ox: px, oy: py, oz: pz, // 上一帧位置（Verlet 积分用）
          ix: x, iy: y,           // 网格索引
          pinned: false,          // 是否固定
        });
      }
    }

    // 根据二维网格索引计算一维数组索引
    const idx = (x, y) => y * (segX + 1) + x;

    // 建立相邻质点之间的结构约束（横向 + 纵向）
    for (let y = 0; y <= segY; y++) {
      for (let x = 0; x <= segX; x++) {
        if (x < segX) this.constraints.push([idx(x, y), idx(x + 1, y), w / segX]);
        if (y < segY) this.constraints.push([idx(x, y), idx(x, y + 1), h / segY]);
      }
    }

    // 固定顶部一排质点，模拟布料挂在杆上
    for (let x = 0; x <= segX; x++) {
      this.particles[idx(x, 0)].pinned = true;
    }
  }
}

/**
 * 创建布料网格和挂杆。
 *
 * @param {number} segX - 横向分段数
 * @param {number} segY - 纵向分段数
 * @returns {object} 包含 cloth、geometry、material、clothMesh、rod 的对象
 */
function createClothMesh(segX, segY) {
  const cloth = new Cloth(CLOTH_WIDTH, CLOTH_HEIGHT, segX, segY);

  const geometry = new THREE.PlaneGeometry(CLOTH_WIDTH, CLOTH_HEIGHT, segX, segY);
  geometry.attributes.position.usage = THREE.DynamicDrawUsage;

  const posAttr = geometry.attributes.position;
  for (let i = 0; i < cloth.particles.length; i++) {
    const p = cloth.particles[i];
    posAttr.setXYZ(i, p.x, p.y, p.z);
  }
  geometry.computeVertexNormals();

  /**
   * 布料材质：白色标准材质，使用织物纹理作为 bumpMap，
   * 配合 roughness 与 metalness 模拟布料的漫反射表面。
   */
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    bumpMap: fabricTex,
    bumpScale: 0.04,
    roughness: 0.92,
    metalness: 0.02,
    side: THREE.DoubleSide, // 双面渲染，因为布料会被风吹翻面
  });

  const clothMesh = new THREE.Mesh(geometry, material);
  clothMesh.castShadow = true;
  clothMesh.receiveShadow = true;
  clothMesh.position.y = 0.0;
  clothMesh.rotation.x = -0.06; // 微微倾斜，看起来更自然

  // 顶部挂杆
  const rodGeo = new THREE.CylinderGeometry(0.06, 0.06, CLOTH_WIDTH + 0.5, 16);
  const rodMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.3, metalness: 0.8 });
  const rod = new THREE.Mesh(rodGeo, rodMat);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, CLOTH_HEIGHT / 2, 0);
  rod.castShadow = true;
  clothMesh.add(rod);

  return { cloth, geometry, material, clothMesh, rod };
}

/**
 * clothContext：保存当前布料相关的所有对象引用。
 *
 * 使用一个对象包装，而不是直接导出 clothMesh 常量，
 * 是为了在重建布料后，其他模块能立即拿到新的 mesh 引用。
 */
export const clothContext = createClothMesh(SEG_X, SEG_Y);
scene.add(clothContext.clothMesh);

/**
 * 根据当前 config.js 中的 SEG_X / SEG_Y 重新生成布料。
 *
 * 重建流程：
 * 1. 从场景移除旧布料网格。
 * 2. 释放旧 geometry 和 material 的 GPU 资源。
 * 3. 调用 createClothMesh 创建新的物理模型和 Three.js 网格。
 * 4. 更新 clothContext 中的引用。
 * 5. 通知 htmlRenderer 重新绑定 HTML overlay 到新的 mesh。
 *
 * @param {Function} [onRebuild] - 重建完成后的回调，通常用于重新绑定 HTML overlay
 */
export function rebuildCloth(onRebuild) {
  // 清理旧资源
  scene.remove(clothContext.clothMesh);
  clothContext.geometry.dispose();
  clothContext.material.dispose();

  // 创建新布料
  const newCloth = createClothMesh(SEG_X, SEG_Y);

  // 更新上下文引用
  clothContext.cloth = newCloth.cloth;
  clothContext.geometry = newCloth.geometry;
  clothContext.material = newCloth.material;
  clothContext.clothMesh = newCloth.clothMesh;
  clothContext.rod = newCloth.rod;

  scene.add(clothContext.clothMesh);

  // 通知外部重新绑定 HTML-in-Canvas
  if (onRebuild) onRebuild(clothContext.clothMesh);
}

// ---------- 物理更新 ----------
/**
 * 计算当前分段数下的重力向量。
 *
 * 说明：SEG_X / SEG_Y 增加后，质点数量变多、每个约束长度变短。
 * 如果保持每个质点的重力不变，垂坠形态会随分段数改变，导致布料“视觉大小”变化。
 * 因此按纵向分段比例缩放每个质点的重力，使不同细腻度下的整体垂坠程度保持一致。
 */
function getGravity() {
  const scale = BASE_SEG_Y / SEG_Y;
  return new THREE.Vector3(0, -2.8 * scale, 0);
}

/**
 * 更新布料物理状态，并把新位置同步到 Three.js 几何体。
 *
 * @param {number} dt - 上一帧到当前帧的时间差（秒），用于数值积分
 * @param {number} time - 从场景启动开始的累计时间（秒），用于风力随时间变化
 */
export function updateCloth(dt, time) {
  const { cloth, geometry } = clothContext;
  const posAttr = geometry.attributes.position;

  // 总风力 = 基础风力 + 阵风，阵风会按指数衰减
  const totalWind = state.windStrength + state.gust;
  state.gust = THREE.MathUtils.lerp(state.gust, 0, dt * 1.2);

  // 第一步：对每个未固定的质点进行 Verlet 积分
  for (const p of cloth.particles) {
    if (p.pinned) continue; // 顶部挂点保持不动

    /**
     * 计算当前质点受到的风力。
     * 使用多层正弦/余弦函数叠加，让风在时间和空间上都不规则，
     * 再乘以 totalWind 和一个随机抖动，模拟阵风效果。
     */
    /**
     * 计算当前质点受到的风力。
     * 使用多层正弦/余弦函数叠加，让风在时间和空间上都不规则。
     * 乘以 areaScale 是为了在增加分段数时保持单位面积上的风力大致相同，
     * 避免高细腻度下布料被“吹得变形过大”。
     */
    const areaScale = (BASE_SEG_X * BASE_SEG_Y) / (SEG_X * SEG_Y);
    const wind = new THREE.Vector3(
      Math.sin(time * 1.6 + p.y * 2.4) * 0.4 + Math.cos(time * 0.7 + p.x * 3.0) * 0.2,
      Math.sin(time * 1.1 + p.x * 1.8) * 0.15,
      Math.sin(time * 2.2 + p.x * 4.0 + p.y * 2.5) * 0.5 + 0.55
    ).multiplyScalar(totalWind * (0.85 + Math.random() * 0.3) * areaScale);

    // 合力 = 重力 + 风力
    const force = new THREE.Vector3().addVectors(getGravity(), wind);

    // 鼠标交互：在 push/drag 模式下，鼠标附近的质点会被吸引向鼠标命中点
    if (state.mouseDown && state.mouseMode !== 'none') {
      const dx = state.mouseTarget.x - p.x;
      const dy = state.mouseTarget.y - p.y;
      const dz = state.mouseTarget.z - p.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const radius = 1.2; // 影响半径
      if (dist < radius && dist > 0.001) {
        // drag 模式吸引力更强
        const strength = (state.mouseMode === 'drag' ? 7.0 : 3.5) * (1 - dist / radius);
        const k = Math.min(strength * dt, 1.0);
        p.x += dx * k;
        p.y += dy * k;
        p.z += dz * k;
        // 同时更新上一帧位置，避免产生过大的瞬间速度
        p.ox += dx * k * 0.5;
        p.oy += dy * k * 0.5;
        p.oz += dz * k * 0.5;
      }
    }

    // 速度阻尼，让摆动逐渐衰减，避免永远震荡
    const damping = 0.985;
    const vx = (p.x - p.ox) * damping;
    const vy = (p.y - p.oy) * damping;
    const vz = (p.z - p.oz) * damping;

    // Verlet 积分：保存旧位置，然后根据速度和合力更新新位置
    p.ox = p.x;
    p.oy = p.y;
    p.oz = p.z;

    p.x += vx + force.x * dt * dt;
    p.y += vy + force.y * dt * dt;
    p.z += vz + force.z * dt * dt;
  }

  // 第二步：多次迭代约束求解，让相邻质点保持原始距离（布料不可无限拉伸）
  for (let k = 0; k < ITERATIONS; k++) {
    for (const c of cloth.constraints) {
      const p1 = cloth.particles[c[0]];
      const p2 = cloth.particles[c[1]];
      const rest = c[2]; // 原始距离

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist === 0) continue;

      // 计算超出的比例，然后把两个质点各移动一半距离
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

  // 第三步：把质点的新位置写回 Three.js 几何体，并重新计算法线
  for (let i = 0; i < cloth.particles.length; i++) {
    const p = cloth.particles[i];
    posAttr.setXYZ(i, p.x, p.y, p.z);
  }
  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();
}
