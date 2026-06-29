/**
 * 动画主循环
 *
 * 本文件负责驱动整个应用的持续渲染：
 * 1. 使用 requestAnimationFrame 创建循环。
 * 2. 每帧计算时间差 dt 和累计时间 time。
 * 3. 依次更新布料物理、HTML-in-Canvas overlay，最后渲染场景。
 */

import * as THREE from 'three';
import { scene, camera, renderer } from './scene.js';
import { threeHtml } from './htmlRenderer.js';
import { updateCloth } from './cloth.js';

/**
 * Three.js 时钟对象，用于获取帧间时间差和累计时间。
 */
const clock = new THREE.Clock();

/**
 * 动画循环函数，每帧自动调用自身。
 *
 * 流程：
 * 1. requestAnimationFrame 预约下一帧。
 * 2. dt 限制最大 0.05 秒，避免切换标签页回来后物理爆炸。
 * 3. updateCloth(dt, time) 更新布料质点位置。
 * 4. threeHtml.update() 同步 HTML overlay 与布料变形。
 * 5. renderer.render(scene, camera) 绘制一帧画面。
 */
export function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.getElapsedTime();

  updateCloth(dt, time);
  threeHtml.update();
  renderer.render(scene, camera);
}
