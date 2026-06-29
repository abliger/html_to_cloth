import * as THREE from 'three';
import { state } from './state.js';
import { renderer, camera } from './scene.js';
import { clothMesh } from './cloth.js';
import { content } from './htmlRenderer.js';

// ---------- 鼠标交互 ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function updatePointer(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

function raycastCloth() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(clothMesh);
  return hits.length ? hits[0].point : null;
}

export function setMouseMode(mode) {
  state.mouseMode = mode;
  // 无影响模式：content 接收事件，HTML 可交互
  // 推动/拖动模式：content 不接收事件，让事件落到 WebGL canvas
  content.style.pointerEvents = mode === 'none' ? 'auto' : 'none';
  document.querySelectorAll('#mode-buttons button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}

document.querySelectorAll('#mode-buttons button').forEach((btn) => {
  btn.addEventListener('click', () => setMouseMode(btn.dataset.mode));
});
setMouseMode('none');

// 在 window 捕获阶段监听，确保不会被 HTML overlay 挡住
window.addEventListener('pointerdown', (e) => {
  if (state.mouseMode === 'none') return;
  if (e.target.closest && e.target.closest('#controls, #info')) return;
  updatePointer(e);
  const p = raycastCloth();
  if (p) {
    state.mouseDown = true;
    state.mouseTarget.copy(p);
    // 防止触发按钮/输入框等
    e.preventDefault();
  }
}, true);

window.addEventListener('pointermove', (e) => {
  if (state.mouseMode === 'none' || !state.mouseDown) return;
  updatePointer(e);
  const p = raycastCloth();
  if (p) state.mouseTarget.copy(p);
}, true);

window.addEventListener('pointerup', () => {
  state.mouseDown = false;
}, true);

// ---------- 风控制 ----------
const windInput = document.getElementById('wind');
windInput.addEventListener('input', (e) => {
  state.windStrength = parseInt(e.target.value, 10) / 100;
});

document.getElementById('gust').addEventListener('click', () => {
  state.gust = 1.6;
});

// 给表单按钮加点反馈
content.querySelector('.ui-card button').addEventListener('click', () => {
  const input = content.querySelector('.ui-card input');
  content.querySelector('.ui-card button').textContent = input.value ? `Sent: ${input.value}` : 'Please type first';
});
