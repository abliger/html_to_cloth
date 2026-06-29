/**
 * 用户输入处理
 *
 * 本文件负责把所有用户交互事件转换为应用状态：
 * - 鼠标模式切换：决定鼠标是与 HTML UI 交互，还是推动/拖动画布。
 * - 鼠标 push/drag：通过射线检测找到布料表面的命中点，更新 state.mouseTarget。
 * - 风力控制：通过滑块和“一阵强风”按钮调整风力。
 * - 表单反馈：给画布内的 Submit 按钮添加点击反馈。
 */

import * as THREE from 'three';
import { state } from './state.js';
import { renderer, camera } from './scene.js';
import { clothMesh } from './cloth.js';
import { content } from './htmlRenderer.js';

// ---------- 鼠标交互 ----------
/**
 * 射线检测器，用于把屏幕鼠标坐标转换为 Three.js 世界射线。
 */
const raycaster = new THREE.Raycaster();

/**
 * 鼠标在 WebGL canvas 上的归一化设备坐标（NDC），范围 [-1, 1]。
 */
const pointer = new THREE.Vector2();

/**
 * 将鼠标事件的屏幕坐标转换为 NDC 坐标，供射线检测使用。
 *
 * @param {PointerEvent} e - 鼠标/触摸事件
 */
function updatePointer(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

/**
 * 从相机发射一条射线，检测它与布料网格的交点。
 *
 * @returns {THREE.Vector3|null} 命中点世界坐标，未命中返回 null
 */
function raycastCloth() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(clothMesh);
  return hits.length ? hits[0].point : null;
}

/**
 * 设置鼠标模式，并同步更新 UI 按钮的 active 状态。
 *
 * @param {string} mode - 'none' | 'push' | 'drag'
 *
 * 模式说明：
 * - 'none'：content 接收 pointer 事件，HTML UI 可交互（可输入、可滚动）。
 * - 'push' / 'drag'：content 不接收事件，事件落到 WebGL canvas，用于推动或拖动画布。
 */
export function setMouseMode(mode) {
  state.mouseMode = mode;
  if (content) {
    content.style.pointerEvents = mode === 'none' ? 'auto' : 'none';
  }
  document.querySelectorAll('#mode-buttons button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}

// 绑定模式切换按钮
document.querySelectorAll('#mode-buttons button').forEach((btn) => {
  btn.addEventListener('click', () => setMouseMode(btn.dataset.mode));
});

// 默认模式：无影响，HTML 可交互
setMouseMode('none');

/**
 * pointerdown 事件处理（捕获阶段）。
 *
 * 在 push/drag 模式下，若鼠标按在布料上，则记录命中点并阻止事件继续传播，
 * 避免同时触发 HTML 内部的按钮或输入框。
 */
window.addEventListener('pointerdown', (e) => {
  if (state.mouseMode === 'none') return;
  if (e.target.closest && e.target.closest('#controls, #info')) return;

  updatePointer(e);
  const p = raycastCloth();
  if (p) {
    state.mouseDown = true;
    state.mouseTarget.copy(p);
    e.preventDefault();
  }
}, true);

/**
 * pointermove 事件处理（捕获阶段）。
 *
 * 在 push/drag 模式下按住鼠标移动时，持续更新鼠标命中点，
 * 布料物理会根据 state.mouseTarget 吸引附近质点。
 */
window.addEventListener('pointermove', (e) => {
  if (state.mouseMode === 'none' || !state.mouseDown) return;
  updatePointer(e);
  const p = raycastCloth();
  if (p) state.mouseTarget.copy(p);
}, true);

/**
 * pointerup 事件处理（捕获阶段）。
 *
 * 鼠标释放后结束交互。
 */
window.addEventListener('pointerup', () => {
  state.mouseDown = false;
}, true);

// ---------- 风控制 ----------
/**
 * 风力滑块：将 0~100 的整数值映射为 0~1 的风力强度。
 */
const windInput = document.getElementById('wind');
if (windInput) {
  windInput.addEventListener('input', (e) => {
    state.windStrength = parseInt(e.target.value, 10) / 100;
  });
}

/**
 * “一阵强风”按钮：瞬间把阵风强度设为 1.6，随后在 updateCloth 中逐渐衰减。
 */
const gustButton = document.getElementById('gust');
if (gustButton) {
  gustButton.addEventListener('click', () => {
    state.gust = 1.6;
  });
}

// ---------- 表单反馈 ----------
/**
 * 给画布内表单的 Submit 按钮添加简单反馈：
 * 如果有输入内容就显示 “Sent: xxx”，否则提示先输入。
 */
if (content) {
  const submitButton = content.querySelector('.ui-card button');
  const textInput = content.querySelector('.ui-card input');
  if (submitButton && textInput) {
    submitButton.addEventListener('click', () => {
      submitButton.textContent = textInput.value ? `Sent: ${textInput.value}` : 'Please type first';
    });
  }
}
