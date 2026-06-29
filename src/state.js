/**
 * 全局运行状态
 *
 * 本文件用一个单一对象保存所有需要在多个模块之间共享的可变状态，
 * 例如风力强度、鼠标交互模式、鼠标当前指向的三维位置等。
 * 使用对象而不是分散变量，可以让不同模块方便地读取和修改同一份数据。
 */

import * as THREE from 'three';

/**
 * state 对象：保存应用运行时的可变状态。
 *
 * @property {number} windStrength - 基础风力强度，范围 0 ~ 1，由右上角滑块控制
 * @property {number} gust - 阵风强度，点击“一阵强风”按钮时瞬间增大，随后逐渐衰减
 * @property {string} mouseMode - 鼠标模式：'none'（可交互 HTML）/'push'（推动画布）/'drag'（拖动画布）
 * @property {boolean} mouseDown - 当前鼠标是否按下，用于 push/drag 模式
 * @property {THREE.Vector3} mouseTarget - 鼠标在布料表面的三维命中点，供布料物理使用
 */
export const state = {
  windStrength: 0.35,
  gust: 0,
  mouseMode: 'none', // 'none' | 'push' | 'drag'
  mouseDown: false,
  mouseTarget: new THREE.Vector3(),
};
