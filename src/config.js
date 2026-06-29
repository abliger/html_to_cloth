/**
 * 全局常量配置
 *
 * 本文件集中管理布料的尺寸、细分段数以及物理迭代次数。
 * CLOTH_WIDTH / CLOTH_HEIGHT 在运行期间保持不变；
 * SEG_X / SEG_Y / resolutionScale 支持通过控制面板动态修改，
 * 修改后需要调用 rebuildCloth() 重建布料才会真正生效。
 */

/** 布料宽度（Three.js 世界坐标单位） */
export const CLOTH_WIDTH = 6.0;

/** 布料高度（Three.js 世界坐标单位） */
export const CLOTH_HEIGHT = 4.0;

/** 横向基础分段数，resolutionScale = 1 时的默认值 */
export const BASE_SEG_X = 60;

/** 纵向基础分段数，resolutionScale = 1 时的默认值 */
export const BASE_SEG_Y = 40;

/** 布料横向细分段数，段数越高网格越细腻但计算量越大 */
export let SEG_X = BASE_SEG_X;

/** 布料纵向细分段数 */
export let SEG_Y = BASE_SEG_Y;

/** 约束求解迭代次数，次数越多布料越不容易拉伸，但性能开销越大 */
export const ITERATIONS = 5;

/** 细腻度倍数，1.0 为默认，越大网格越细腻 */
export let resolutionScale = 1.0;

/**
 * 设置布料细分段数。
 *
 * 注意：修改后必须调用 cloth.js 中的 rebuildCloth() 重新生成物理网格和 Three.js 网格，
 * 新值才会真正生效。
 *
 * @param {number} x - 新的横向分段数
 * @param {number} y - 新的纵向分段数
 */
export function setSegments(x, y) {
  SEG_X = Math.max(2, Math.floor(x));
  SEG_Y = Math.max(2, Math.floor(y));
  // 同步细腻度倍数，使两者保持一致
  resolutionScale = SEG_X / BASE_SEG_X;
}

/**
 * 设置布料细腻度倍数。
 *
 * 通过统一缩放 SEG_X 和 SEG_Y，让布料在横向和纵向保持相同的细分比例，
 * 从而整体变得更细腻或更粗糙。数值越大，质点越多，物理计算量也越大。
 *
 * @param {number} scale - 细腻度倍数，建议范围 0.5 ~ 3.0
 */
export function setResolutionScale(scale) {
  resolutionScale = Math.max(0.2, scale);
  SEG_X = Math.max(2, Math.round(BASE_SEG_X * resolutionScale));
  SEG_Y = Math.max(2, Math.round(BASE_SEG_Y * resolutionScale));
}

/**
 * 根据当前细腻度倍数计算期望的 SEG_X 和 SEG_Y，
 * 用于控制面板同步显示。
 *
 * @returns {{segX: number, segY: number}}
 */
export function getScaledSegments() {
  return {
    segX: Math.max(2, Math.round(BASE_SEG_X * resolutionScale)),
    segY: Math.max(2, Math.round(BASE_SEG_Y * resolutionScale)),
  };
}
