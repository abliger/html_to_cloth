/**
 * 全局常量配置
 *
 * 本文件集中管理布料的尺寸、细分段数以及物理迭代次数。
 * 修改这些值可以改变画布的大小、细腻程度和物理稳定性。
 */

/** 布料宽度（Three.js 世界坐标单位） */
export const CLOTH_WIDTH = 6.0;

/** 布料高度（Three.js 世界坐标单位） */
export const CLOTH_HEIGHT = 4.0;

/** 布料横向细分段数，段数越高网格越细腻但计算量越大 */
export const SEG_X = 60;

/** 布料纵向细分段数 */
export const SEG_Y = 40;

/** 约束求解迭代次数，次数越多布料越不容易拉伸，但性能开销越大 */
export const ITERATIONS = 5;
