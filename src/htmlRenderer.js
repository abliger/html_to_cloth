/**
 * HTML-in-Canvas 渲染桥接
 *
 * 本文件使用 three-html-render 库，把真实的 DOM 内容（#ui-content）
 * 映射到 Three.js 的布料网格表面，实现“HTML 贴在随风摆动的画布上”的效果。
 *
 * 核心原理：
 * 1. installHtmlInCanvasPolyfill() 安装 WICG HTML-in-Canvas 提案的 polyfill。
 * 2. ThreeHTMLRenderer 负责在每一帧把 DOM 内容同步为 WebGL 纹理/overlay，
 *    并通过射线检测把鼠标事件转发回 DOM，所以按钮、输入框、滚动仍然可交互。
 * 3. 把 #ui-content 移动到 renderer.domElement 内部，让 overlay 与 canvas 坐标对齐。
 */

import { installHtmlInCanvasPolyfill } from 'three-html-render/polyfill';
import { ThreeHTMLRenderer } from 'three-html-render/renderer';
import { renderer, camera } from './scene.js';
import { clothContext } from './cloth.js';

// 安装 polyfill，使浏览器支持 layoutsubtree 等 HTML-in-Canvas 相关 API
installHtmlInCanvasPolyfill();

/**
 * ThreeHTMLRenderer 实例，负责连接 Three.js 渲染器与 HTML 内容。
 */
export const threeHtml = new ThreeHTMLRenderer();
threeHtml.connect(renderer.domElement, camera, renderer);

/**
 * 页面中真实的 HTML UI 内容容器。
 * 把它移动到 WebGL canvas 内部后，polyfill 会基于 clothMesh 的变形矩阵
 * 把 content 以 CSS 3D transform 的方式贴合在布料表面。
 */
export const content = document.getElementById('ui-content');
if (content) {
  renderer.domElement.setAttribute('layoutsubtree', '');
  renderer.domElement.appendChild(content);
}

/**
 * 将 HTML 内容绑定到指定的布料网格。
 *
 * @param {THREE.Mesh} mesh - 要绑定的布料网格
 * @returns {object} ThreeHTMLRenderer 内部返回的绑定对象，可用于后续 remove
 */
function addClothObject(mesh) {
  if (!content) return null;
  return threeHtml.addObject(content, mesh);
}

/** 当前 HTML overlay 与布料网格的绑定对象 */
let clothObject = content ? addClothObject(clothContext.clothMesh) : null;

// polyfill 会把 content 移到一个 host overlay 容器里
const htmlHost = content ? content.parentElement : null;
// host 本身不需要接收事件，只让被 matrix3d 定位的 content 接收，避免挡住 controls
if (htmlHost) {
  htmlHost.style.pointerEvents = 'none';
}

/**
 * 重新绑定 HTML overlay 到新的布料网格。
 *
 * 当用户通过控制面板修改 SEG_X / SEG_Y 后，会重建布料网格，
 * 此时需要移除旧的 addObject 绑定，并把 content 绑定到新的 mesh 上。
 *
 * @param {THREE.Mesh} newMesh - 新的布料网格
 */
export function reconnectClothMesh(newMesh) {
  if (!content) return;
  if (clothObject) {
    threeHtml.remove(clothObject);
  }
  clothObject = addClothObject(newMesh);

  // 重新确保 host 不拦截事件
  const host = content.parentElement;
  if (host) {
    host.style.pointerEvents = 'none';
  }
}
