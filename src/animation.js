/**
 * 动画主循环
 *
 * 本文件负责驱动整个应用的持续渲染：
 * 1. 使用 requestAnimationFrame 创建循环。
 * 2. 每帧计算时间差 dt 和累计时间 time。
 * 3. 依次更新布料物理、触发 HTML-in-Canvas 纹理重绘，最后渲染场景。
 */

import * as THREE from 'three';
import { scene, camera, renderer } from './scene.js';
import { updateCloth } from './cloth.js';

/**
 * Three.js 计时器对象，用于获取帧间时间差和累计时间。
 */
const timer = new THREE.Timer();
timer.connect(document);

/**
 * 动画循环函数，每帧自动调用自身。
 *
 * 流程：
 * 1. requestAnimationFrame 预约下一帧。
 * 2. timer.update() 更新内部时间状态。
 * 3. dt 限制最大 0.05 秒，避免切换标签页回来后物理爆炸。
 * 4. updateCloth(dt, time) 更新布料质点位置。
 * 5. renderer.domElement.requestPaint() 触发 HTMLTexture 重绘（含 CSS 动画）。
 * 6. renderer.render(scene, camera) 绘制一帧画面。
 */
export function animate(timeMs) {
  requestAnimationFrame(animate);
  timer.update(timeMs);
  const dt = Math.min(timer.getDelta(), 0.05);
  const time = timer.getElapsed();

  updateCloth(dt, time);
  renderer.domElement.requestPaint();
  renderer.render(scene, camera);
}
