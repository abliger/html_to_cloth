/**
 * 织物纹理生成
 *
 * 本文件使用 HTML Canvas 2D API 动态生成一张织物纹理，
 * 包含网格线、底色和随机噪点，使布料看起来更真实。
 * 生成后的纹理会作为 Three.js MeshStandardMaterial 的 bumpMap，
 * 在光照下产生细微的凹凸质感。
 */

import * as THREE from 'three';

/**
 * 创建织物纹理。
 *
 * 实现步骤：
 * 1. 创建一个 512x512 的离屏 canvas。
 * 2. 填充米白色底色。
 * 3. 绘制密集的横竖细线，模拟布料经纬线。
 * 4. 对像素添加轻微随机噪点，模拟织物表面的不均匀感。
 * 5. 将 canvas 转换为 Three.js CanvasTexture，并设置重复模式。
 *
 * @returns {THREE.CanvasTexture} 可用于 bumpMap 的织物纹理
 */
export function createFabricTexture() {
  const size = 512;
  const cvs = document.createElement('canvas');
  cvs.width = size;
  cvs.height = size;
  const ctx = cvs.getContext('2d');

  // 1. 填充底色
  ctx.fillStyle = '#e8e4dc';
  ctx.fillRect(0, 0, size, size);

  // 2. 绘制经纬线
  ctx.strokeStyle = 'rgba(100, 92, 76, 0.10)';
  ctx.lineWidth = 1;
  for (let i = 0; i < size; i += 4) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }

  // 3. 添加随机噪点，让纹理不那么规则
  const imgData = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + n));
    imgData.data[i + 1] = Math.max(0, Math.min(255, imgData.data[i + 1] + n));
    imgData.data[i + 2] = Math.max(0, Math.min(255, imgData.data[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  // 4. 转换为纹理并设置重复
  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 4); // 在布料表面重复 6x4 次
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 预先生成并导出的织物纹理实例，供布料材质直接使用 */
export const fabricTex = createFabricTexture();
