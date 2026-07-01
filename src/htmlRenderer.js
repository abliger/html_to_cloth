/**
 * HTML-in-Canvas 渲染桥接（Raycast 交互版）
 *
 * 本文件负责把真实的 DOM 内容（#ui-content）渲染到 Three.js 布料网格表面，
 * 并通过 RaycastInteractionManager 让曲面布料上的 HTML 仍可交互。
 *
 * 核心变化（对比旧版 ThreeHTMLRenderer）：
 * 1. 使用 three.js 原生的 THREE.HTMLTexture 作为 material.map，把 DOM 渲染进 WebGL。
 * 2. 使用 RaycastInteractionManager 代替 matrix3d overlay：
 *    它每帧 raycast 布料命中点，把 DOM 元素平移，使命中 UV 处的像素精确对准指针，
 *    因此比整体 matrix3d 更贴合弯曲的布料。
 * 3. 依然需要 installHtmlInCanvasPolyfill()，因为浏览器普遍尚未原生支持
 *    HTML-in-Canvas API（layoutsubtree / requestPaint / captureElementImage）。
 *
 * 注意顺序：必须先给 canvas 设置 layoutsubtree 属性，再把 content 移入 canvas，
 * 最后创建 HTMLTexture，否则 polyfill 的 paint 事件不会触发。
 */

import * as THREE from 'three';
import { installHtmlInCanvasPolyfill } from 'three-html-render/polyfill';
import { renderer, camera } from './scene.js';
import { clothContext } from './cloth.js';
import { state } from './state.js';
import { RaycastInteractionManager } from './raycastInteractionManager.js';

// 安装 polyfill，使浏览器支持 layoutsubtree 等 HTML-in-Canvas 相关 API
installHtmlInCanvasPolyfill();

/**
 * 页面中真实的 HTML UI 内容容器。
 * 把它移动到 WebGL canvas 内部是 HTML-in-Canvas polyfill 工作的前提。
 */
export const content = document.getElementById('ui-content');

if (content) {
  // 顺序很重要（polyfill 的工作前提）：
  // 1) 给 canvas 打上 layoutsubtree 属性；
  // 2) requestPaint() 会同步触发 polyfill 为该 canvas 建立 host 容器，并把 canvas
  //    登记进 polyfill 内部表——这一步必须发生在 connect() 之前（见下方说明）；
  // 3) 把 content append 进 canvas，polyfill 随即将其迁移进 host 容器（覆盖在 canvas 上，
  //    透明、opacity:0，真正显示的是 WebGL 纹理）。
  renderer.domElement.setAttribute('layoutsubtree', '');
  renderer.domElement.requestPaint();
  renderer.domElement.appendChild(content);
}

/**
 * RaycastInteractionManager 实例。
 * 它监听 canvas 的 pointermove / pointerdown，raycast 布料命中点，
 * 并把 content 定位到指针下方，使 HTML 元素保持原生交互。
 *
 * 为什么必须在上面 requestPaint()（建立 host）之后再 connect()：
 * polyfill 会把 host 容器叠在 canvas 上并接管指针事件，同时它 patch 了
 * canvas.addEventListener——当 canvas 已登记时，注册到 canvas 的监听会被“转发”
 * 一份到 host 上。若在 host 建立之前 connect()，监听只挂在 canvas 上、不会转发到
 * host，而 host 又拦截了事件，导致 canvas 收不到 pointermove，raycast 交互失效。
 */
export const raycastInteractions = new RaycastInteractionManager();
raycastInteractions.connect(renderer, camera);

/**
 * 将 HTML 内容绑定到布料网格。
 * 这里使用 THREE.HTMLTexture：three.js >= 0.184 原生支持，
 * 在不支持原生 HTML-in-Canvas API 的浏览器里，polyfill 会接管纹理捕获。
 *
 * @param {THREE.Mesh} mesh - 要绑定的布料网格
 */
function bindClothHTML(mesh) {
  if (!content || !mesh.material) return;

  // 创建原生 HTMLTexture，并把它设为布料的 diffuse map
  const texture = new THREE.HTMLTexture(content);
  texture.colorSpace = THREE.SRGBColorSpace;
  mesh.material.map = texture;
  mesh.material.needsUpdate = true;

  // 注册到 raycast 交互管理器
  raycastInteractions.add(mesh);
}

// 初始绑定
bindClothHTML(clothContext.clothMesh);

/**
 * 根据当前鼠标模式设置 content 的 pointer-events。
 *
 * - 'none' 模式：content 接收 pointer 事件，HTML UI 可交互（可输入、可滚动）。
 * - 'push' / 'drag' 模式：content 不接收事件，让事件落到 WebGL canvas，
 *   用于推动或拖动画布。RaycastInteractionManager 仍会把元素移到指针下，
 *   但 pointer-events: none 保证事件穿过元素到达 canvas。
 */
export function applyContentPointerEvents() {
  if (!content) return;
  content.style.pointerEvents = state.mouseMode === 'none' ? 'auto' : 'none';
}

applyContentPointerEvents();

// 监听布料重建事件，自动把 HTML 纹理/交互重新绑定到新的 clothMesh
window.addEventListener('cloth:rebuilt', (e) => {
  reconnectClothMesh(e.detail);
});

/**
 * 重新绑定 HTML 内容到新的布料网格。
 *
 * 当用户修改 SEG_X / SEG_Y 后，cloth.js 会重建 geometry 但保留原 material。
 * 这里只需要把 raycast 交互对象更新为最新 mesh 引用即可。
 *
 * @param {THREE.Mesh} newMesh - 新的布料网格
 */
export function reconnectClothMesh(newMesh) {
  if (!content) return;

  // 移除旧 mesh，添加新 mesh
  raycastInteractions.remove(clothContext.clothMesh);
  raycastInteractions.add(newMesh);

  applyContentPointerEvents();
}
