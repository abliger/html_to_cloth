import * as THREE from 'three';

// ---------- 场景 ----------
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.045);

export const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.getElementById('webgl').appendChild(renderer.domElement);

// ---------- 灯光 ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xfff4e6, 2.2);
dirLight.position.set(4, 6, 6);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 25;
dirLight.shadow.camera.left = -6;
dirLight.shadow.camera.right = 6;
dirLight.shadow.camera.top = -6;
dirLight.shadow.camera.bottom = 6;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

const rimLight = new THREE.SpotLight(0x6366f1, 3.0);
rimLight.position.set(-6, 2, -3);
rimLight.lookAt(0, 0, 0);
scene.add(rimLight);

// ---------- 地面 ----------
const floorGeo = new THREE.PlaneGeometry(40, 40);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x111116,
  roughness: 0.85,
  metalness: 0.1,
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -3.5;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(40, 40, 0x2a2a35, 0x16161d);
grid.position.y = -3.48;
scene.add(grid);

// ---------- 固定摄像头 ----------
camera.position.set(0, -0.2, 8.5);
camera.lookAt(0, -0.8, 0);

// ---------- 响应式 ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
