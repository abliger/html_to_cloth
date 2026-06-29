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
import { clothMesh } from './cloth.js';

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
  threeHtml.addObject(content, clothMesh);
}

/**
 * polyfill 会把 content 放进一个 host overlay 容器里。
 * 这里让 host 不接收 pointer-events，只让被 transform 定位的 content 接收事件，
 * 避免 host 挡住页面右上角的控制面板和左上角的 info 提示。
 */
const htmlHost = content ? content.parentElement : null;
if (htmlHost) {
  htmlHost.style.pointerEvents = 'none';
}
