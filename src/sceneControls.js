/**
 * 场景与布料控制面板
 *
 * 本文件在页面右上角的 #controls 面板中追加两组控制项：
 * 1. 场景设定：背景色、雾效、灯光强度、相机距离、地面材质。
 * 2. 布料设定：横向/纵向分段数，修改后点击“重建布料”生效。
 *
 * 实现方式：
 * 1. 从 scene.js / cloth.js / config.js 导入需要调整的对象与函数。
 * 2. 在 #controls 末尾动态生成 input 控件。
 * 3. 监听 input 事件，把新值同步到对应的 Three.js 对象；
 *    对于需要重建网格的参数，提供“重建”按钮触发重建流程。
 */

import { scene, camera, ambient, dirLight, rimLight, floorMat } from './scene.js';
import { SEG_X, SEG_Y, resolutionScale, BASE_SEG_X, setSegments, setResolutionScale, getScaledSegments } from './config.js';
import { rebuildCloth } from './cloth.js';

/**
 * 将 Three.js Color 对象转换为 #rrggbb 格式的字符串，供 color input 使用。
 *
 * @param {THREE.Color} color - Three.js 颜色对象
 * @returns {string} 形如 #0a0a0f 的十六进制颜色字符串
 */
function colorToHex(color) {
  return '#' + color.getHexString();
}

/**
 * 场景参数的初始值，用于“重置场景”按钮恢复默认。
 */
const sceneDefaults = {
  background: scene.background.clone(),
  fogDensity: scene.fog.density,
  ambientIntensity: ambient.intensity,
  dirLightIntensity: dirLight.intensity,
  rimLightIntensity: rimLight.intensity,
  cameraZ: 8.5,
  floorRoughness: floorMat.roughness,
  floorMetalness: floorMat.metalness,
};

/**
 * 布料参数的初始值，用于“重置布料”按钮恢复默认。
 */
const clothDefaults = {
  segX: SEG_X,
  segY: SEG_Y,
};

/**
 * 创建一个带 label 的 range 滑块控件。
 *
 * @param {HTMLElement} container - 控件容器
 * @param {string} labelText - 标签文字
 * @param {object} options - min、max、step、value
 * @param {Function} onInput - 值变化时的回调
 * @returns {HTMLInputElement} 生成的 input 元素
 */
function createRangeControl(container, labelText, options, onInput) {
  const label = document.createElement('label');
  label.textContent = labelText;
  label.style.marginTop = '10px';
  container.appendChild(label);

  const input = document.createElement('input');
  input.type = 'range';
  input.min = options.min;
  input.max = options.max;
  input.step = options.step || '1';
  input.value = options.value;
  input.addEventListener('input', (e) => onInput(parseFloat(e.target.value)));
  container.appendChild(input);

  return input;
}

/**
 * 创建一个颜色选择控件。
 *
 * @param {HTMLElement} container - 控件容器
 * @param {string} labelText - 标签文字
 * @param {string} value - 初始颜色 #rrggbb
 * @param {Function} onInput - 值变化时的回调
 * @returns {HTMLInputElement} 生成的 input 元素
 */
function createColorControl(container, labelText, value, onInput) {
  const label = document.createElement('label');
  label.textContent = labelText;
  label.style.marginTop = '10px';
  container.appendChild(label);

  const input = document.createElement('input');
  input.type = 'color';
  input.value = value;
  input.className = 'scene-color';
  input.addEventListener('input', (e) => onInput(e.target.value));
  container.appendChild(input);

  return input;
}

/**
 * 创建一个数字输入控件。
 *
 * @param {HTMLElement} container - 控件容器
 * @param {string} labelText - 标签文字
 * @param {object} options - min、max、step、value
 * @returns {HTMLInputElement} 生成的 input 元素
 */
function createNumberControl(container, labelText, options) {
  const label = document.createElement('label');
  label.textContent = labelText;
  label.style.marginTop = '10px';
  container.appendChild(label);

  const input = document.createElement('input');
  input.type = 'number';
  input.min = options.min;
  input.max = options.max;
  input.step = options.step || '1';
  input.value = options.value;
  input.style.width = '100%';
  input.style.marginBottom = '10px';
  input.style.padding = '6px 8px';
  input.style.borderRadius = '6px';
  input.style.border = '1px solid rgba(255,255,255,0.15)';
  input.style.background = 'rgba(0,0,0,0.2)';
  input.style.color = '#fff';
  input.style.outline = 'none';
  container.appendChild(input);

  return input;
}

/**
 * 初始化场景控制面板。
 */
function initSceneControls() {
  const controls = document.getElementById('controls');
  if (!controls) return;

  // ---------- 场景设定分组 ----------
  const sceneGroup = document.createElement('div');
  sceneGroup.id = 'scene-controls';
  sceneGroup.className = 'scene-controls';

  const sceneTitle = document.createElement('label');
  sceneTitle.textContent = '场景设定';
  sceneTitle.style.marginTop = '14px';
  sceneTitle.style.fontWeight = '600';
  sceneTitle.style.color = '#fff';
  sceneGroup.appendChild(sceneTitle);

  // 背景色
  createColorControl(sceneGroup, '背景色', colorToHex(scene.background), (value) => {
    scene.background.set(value);
    if (scene.fog) scene.fog.color.set(value);
  });

  // 雾密度
  createRangeControl(sceneGroup, '雾浓度', { min: 0, max: 0.15, step: 0.001, value: sceneDefaults.fogDensity }, (value) => {
    if (scene.fog) scene.fog.density = value;
  });

  // 环境光强度
  createRangeControl(sceneGroup, '环境光强度', { min: 0, max: 2, step: 0.01, value: sceneDefaults.ambientIntensity }, (value) => {
    ambient.intensity = value;
  });

  // 平行光强度
  createRangeControl(sceneGroup, '主光源强度', { min: 0, max: 5, step: 0.05, value: sceneDefaults.dirLightIntensity }, (value) => {
    dirLight.intensity = value;
  });

  // 轮廓光强度
  createRangeControl(sceneGroup, '轮廓光强度', { min: 0, max: 6, step: 0.05, value: sceneDefaults.rimLightIntensity }, (value) => {
    rimLight.intensity = value;
  });

  // 相机距离
  createRangeControl(sceneGroup, '相机距离', { min: 4, max: 15, step: 0.1, value: sceneDefaults.cameraZ }, (value) => {
    camera.position.z = value;
    camera.lookAt(0, -0.8, 0);
  });

  // 地面粗糙度
  createRangeControl(sceneGroup, '地面粗糙度', { min: 0, max: 1, step: 0.01, value: sceneDefaults.floorRoughness }, (value) => {
    floorMat.roughness = value;
  });

  // 地面金属度
  createRangeControl(sceneGroup, '地面金属度', { min: 0, max: 1, step: 0.01, value: sceneDefaults.floorMetalness }, (value) => {
    floorMat.metalness = value;
  });

  controls.appendChild(sceneGroup);

  // ---------- 布料设定分组 ----------
  const clothGroup = document.createElement('div');
  clothGroup.id = 'cloth-controls';
  clothGroup.className = 'scene-controls';
  clothGroup.style.borderTop = '1px solid rgba(255,255,255,0.1)';
  clothGroup.style.marginTop = '8px';
  clothGroup.style.paddingTop = '4px';

  const clothTitle = document.createElement('label');
  clothTitle.textContent = '布料设定（重建后生效）';
  clothTitle.style.marginTop = '10px';
  clothTitle.style.fontWeight = '600';
  clothTitle.style.color = '#fff';
  clothGroup.appendChild(clothTitle);

  // 细腻度滑块：统一控制 SEG_X 和 SEG_Y，让布料整体更细腻或更粗糙
  const resolutionInput = createRangeControl(
    clothGroup,
    `细腻度 x${resolutionScale.toFixed(1)}`,
    { min: 0.5, max: 2.0, step: 0.1, value: resolutionScale },
    (value) => {
      setResolutionScale(value);
      const { segX, segY } = getScaledSegments();
      segXInput.value = segX;
      segYInput.value = segY;
      resolutionInput.previousElementSibling.textContent = `细腻度 x${value.toFixed(1)}`;
    }
  );

  const segXInput = createNumberControl(clothGroup, '横向分段数 SEG_X', { min: 4, max: 180, value: clothDefaults.segX });
  const segYInput = createNumberControl(clothGroup, '纵向分段数 SEG_Y', { min: 4, max: 180, value: clothDefaults.segY });

  // 当手动修改 SEG_X / SEG_Y 时，反向同步细腻度显示
  function syncResolutionLabel() {
    const x = parseInt(segXInput.value, 10) || BASE_SEG_X;
    const scale = x / BASE_SEG_X;
    resolutionInput.value = Math.max(0.5, Math.min(2.0, scale));
    resolutionInput.previousElementSibling.textContent = `细腻度 x${parseFloat(resolutionInput.value).toFixed(1)}`;
  }
  segXInput.addEventListener('input', syncResolutionLabel);
  segYInput.addEventListener('input', syncResolutionLabel);

  const rebuildBtn = document.createElement('button');
  rebuildBtn.textContent = '重建布料';
  rebuildBtn.style.marginTop = '4px';
  rebuildBtn.style.background = '#2563eb';
  rebuildBtn.addEventListener('click', () => {
    const x = parseInt(segXInput.value, 10);
    const y = parseInt(segYInput.value, 10);
    if (isNaN(x) || isNaN(y) || x < 4 || y < 4) {
      alert('分段数必须大于等于 4');
      return;
    }
    setSegments(x, y);
    // 重建布料网格：cloth.js 会派发 cloth:rebuilt 事件，
    // htmlRenderer.js 监听到后自动重新绑定 HTML overlay
    rebuildCloth();
  });
  clothGroup.appendChild(rebuildBtn);

  // 重置布料按钮
  const resetClothBtn = document.createElement('button');
  resetClothBtn.textContent = '重置布料';
  resetClothBtn.style.marginTop = '8px';
  resetClothBtn.style.background = 'rgba(255, 255, 255, 0.12)';
  resetClothBtn.addEventListener('click', () => {
    segXInput.value = clothDefaults.segX;
    segYInput.value = clothDefaults.segY;
    setSegments(clothDefaults.segX, clothDefaults.segY);
    resolutionInput.value = 1.0;
    resolutionInput.previousElementSibling.textContent = '细腻度 x1.0';
    rebuildCloth();
  });
  clothGroup.appendChild(resetClothBtn);

  controls.appendChild(clothGroup);

  // ---------- 全局重置场景按钮 ----------
  const resetSceneBtn = document.createElement('button');
  resetSceneBtn.textContent = '重置场景';
  resetSceneBtn.style.marginTop = '12px';
  resetSceneBtn.style.background = 'rgba(255, 255, 255, 0.12)';
  resetSceneBtn.addEventListener('click', () => {
    scene.background.copy(sceneDefaults.background);
    if (scene.fog) {
      scene.fog.color.copy(sceneDefaults.background);
      scene.fog.density = sceneDefaults.fogDensity;
    }
    ambient.intensity = sceneDefaults.ambientIntensity;
    dirLight.intensity = sceneDefaults.dirLightIntensity;
    rimLight.intensity = sceneDefaults.rimLightIntensity;
    camera.position.z = sceneDefaults.cameraZ;
    camera.lookAt(0, -0.8, 0);
    floorMat.roughness = sceneDefaults.floorRoughness;
    floorMat.metalness = sceneDefaults.floorMetalness;

    // 同步场景 UI 控件的显示值
    const sceneInputs = sceneGroup.querySelectorAll('input');
    sceneInputs[0].value = colorToHex(scene.background);
    sceneInputs[1].value = sceneDefaults.fogDensity;
    sceneInputs[2].value = sceneDefaults.ambientIntensity;
    sceneInputs[3].value = sceneDefaults.dirLightIntensity;
    sceneInputs[4].value = sceneDefaults.rimLightIntensity;
    sceneInputs[5].value = sceneDefaults.cameraZ;
    sceneInputs[6].value = sceneDefaults.floorRoughness;
    sceneInputs[7].value = sceneDefaults.floorMetalness;
  });
  controls.appendChild(resetSceneBtn);
}

initSceneControls();
