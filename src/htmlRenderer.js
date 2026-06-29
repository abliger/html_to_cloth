import { installHtmlInCanvasPolyfill } from 'three-html-render/polyfill';
import { ThreeHTMLRenderer } from 'three-html-render/renderer';
import { renderer, camera } from './scene.js';
import { clothMesh } from './cloth.js';

// ---------- HTML-in-Canvas：把真实 DOM 渲染为可交互纹理 ----------
installHtmlInCanvasPolyfill();

export const threeHtml = new ThreeHTMLRenderer();
threeHtml.connect(renderer.domElement, camera, renderer);

export const content = document.getElementById('ui-content');
renderer.domElement.setAttribute('layoutsubtree', '');
renderer.domElement.appendChild(content);

threeHtml.addObject(content, clothMesh);

// polyfill 会把 content 移到一个 host overlay 里
const htmlHost = content.parentElement;
// host 本身不需要接收事件，只让被 matrix3d 定位的 content 接收，避免挡住 controls
if (htmlHost) htmlHost.style.pointerEvents = 'none';
