/**
 * 应用入口
 *
 * 本文件只负责按正确顺序加载各个模块并启动动画循环。
 *
 * 模块加载顺序很重要：
 * 1. scene.js 必须先加载，创建场景、相机、渲染器。
 * 2. cloth.js 依赖 scene.js，创建布料网格并加入场景。
 * 3. htmlRenderer.js 依赖 scene.js 和 cloth.js，把 HTML 内容绑定到布料。
 * 4. input.js 依赖上述模块，注册用户交互事件。
 * 5. animation.js 最后加载，启动 requestAnimationFrame 循环。
 */

import './scene.js';
import './cloth.js';
import './htmlRenderer.js';
import './input.js';
import './sceneControls.js';
import { animate } from './animation.js';

// 启动动画循环
animate();
