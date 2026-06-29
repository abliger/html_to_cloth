/**
 * Three.js 场景初始化
 *
 * 本文件负责创建并配置整个 3D 场景所需的核心对象：
 * - Scene：所有 3D 物体的容器
 * - Camera：决定观众从哪个角度观察场景
 * - Renderer：把 3D 场景绘制到 <canvas> 上
 * - Lights：环境光、平行光、轮廓光，让布料有立体感
 * - Floor：地面与网格辅助线，提供空间参照
 *
 * 模块加载时会立即执行初始化，并把 renderer 的 canvas 插入到 #webgl 容器中。
 */

import * as THREE from 'three';

// ---------- 场景 ----------
/**
 * 创建 Three.js 场景，并设置背景色与雾效。
 * 雾效可以让远处的地面自然融入背景，增强空间深度感。
 */
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.045);

/**
 * 创建透视相机。
 * 参数分别为：视野角度、宽高比、近裁剪面、远裁剪面。
 */
export const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);

/**
 * 创建 WebGL 渲染器，并启用抗锯齿与阴影。
 * - antialias: true 让边缘更平滑
 * - shadowMap 开启后，物体可以投射和接收阴影
 */
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制像素比，避免高分屏性能开销过大
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 将渲染器生成的 canvas 放入页面中的 #webgl 容器
const webglContainer = document.getElementById('webgl');
if (webglContainer) {
  webglContainer.appendChild(renderer.domElement);
}

// ---------- 灯光 ----------
/**
 * 环境光：均匀照亮整个场景，避免纯黑区域。
 */
const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambient);

/**
 * 平行光：模拟主光源（如太阳），产生清晰的阴影。
 * 通过配置 shadow.camera 的视锥体，让阴影覆盖布料所在的区域。
 */
const dirLight = new THREE.DirectionalLight(0xfff4e6, 2.2);
dirLight.position.set(4, 6, 6);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048); // 阴影贴图分辨率
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 25;
dirLight.shadow.camera.left = -6;
dirLight.shadow.camera.right = 6;
dirLight.shadow.camera.top = -6;
dirLight.shadow.camera.bottom = 6;
dirLight.shadow.bias = -0.0005; // 减少阴影 acne（条纹伪影）
scene.add(dirLight);

/**
 * 轮廓光（聚光灯）：从侧后方打亮布料边缘，增加层次感和体积感。
 */
const rimLight = new THREE.SpotLight(0x6366f1, 3.0);
rimLight.position.set(-6, 2, -3);
rimLight.lookAt(0, 0, 0);
scene.add(rimLight);

// ---------- 地面 ----------
/**
 * 创建地面平面，用于接收布料阴影，让布料看起来是悬空的。
 */
const floorGeo = new THREE.PlaneGeometry(40, 40);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x111116,
  roughness: 0.85,
  metalness: 0.1,
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2; // 旋转至水平
floor.position.y = -3.5;
floor.receiveShadow = true;
scene.add(floor);

/**
 * 网格辅助线：在地面显示网格，方便观察空间尺度。
 */
const grid = new THREE.GridHelper(40, 40, 0x2a2a35, 0x16161d);
grid.position.y = -3.48;
scene.add(grid);

// ---------- 固定摄像头 ----------
/**
 * 设置相机位置和朝向，让观众正对布料。
 */
camera.position.set(0, -0.2, 8.5);
camera.lookAt(0, -0.8, 0);

// ---------- 响应式 ----------
/**
 * 监听窗口大小变化，更新相机宽高比和渲染器尺寸，保证画面始终铺满窗口。
 */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
