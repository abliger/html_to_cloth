import * as THREE from 'three';

// 运行时可变状态
export const state = {
  windStrength: 0.35,
  gust: 0,
  mouseMode: 'none', // 'none' | 'push' | 'drag'
  mouseDown: false,
  mouseTarget: new THREE.Vector3(),
};
