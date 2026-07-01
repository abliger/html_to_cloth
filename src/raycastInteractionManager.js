/**
 * RaycastInteractionManager
 *
 * 从 three-html-render 源码移植（npm 包 0.1.2 未导出此模块）。
 * 通过射线检测把单个 HTML 元素定位到指针下方的曲面 UV 位置，
 * 从而让曲面（如布料）上的 HTML 内容保持原生 DOM 交互。
 *
 * 与 InteractionManager 的区别：
 * - InteractionManager 用 matrix3d 把元素整体贴到 mesh 正面，只适用于平面。
 * - RaycastInteractionManager 每帧 raycast 命中点，只移动元素使命中 UV 的像素对准指针，
 *   因此适用于任意曲面（布料、球面、立方体多面等）。
 *
 * 原项目地址：https://github.com/repalash/three-html-render
 */

import { Raycaster, Vector2 } from 'three';

export class RaycastInteractionManager {
  objects = [];
  element = null;
  camera = null;

  _raycaster = new Raycaster();
  _pointer = new Vector2();
  _onPointerBound = null;

  add(...objects) {
    for (const o of objects) {
      if (this.objects.indexOf(o) === -1) this.objects.push(o);
    }
    return this;
  }

  remove(...objects) {
    for (const o of objects) {
      const i = this.objects.indexOf(o);
      if (i !== -1) this.objects.splice(i, 1);
    }
    return this;
  }

  connect(renderer, camera) {
    this.disconnect();
    this.camera = camera;
    this.element = renderer.domElement;
    const h = (e) => this._onPointer(e);
    this._onPointerBound = h;
    this.element.addEventListener('pointermove', h);
    this.element.addEventListener('pointerdown', h);
  }

  disconnect() {
    if (this.element && this._onPointerBound) {
      this.element.removeEventListener('pointermove', this._onPointerBound);
      this.element.removeEventListener('pointerdown', this._onPointerBound);
    }
    this._onPointerBound = null;
    this.element = null;
    this.camera = null;
  }

  // 与 InteractionManager API 保持一致，但本类是事件驱动的，无需每帧调用。
  update() { /* no-op */ }

  _onPointer(e) {
    const canvas = this.element;
    const camera = this.camera;
    if (!canvas || !camera) return;

    const rect = canvas.getBoundingClientRect();
    this._pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._pointer, camera);

    const hit = this._raycaster.intersectObjects(this.objects, false).find((h) => !!h.uv);
    if (!hit || !hit.uv) {
      this._parkAllElements();
      return;
    }

    const element = this._getElement(hit.object);
    if (!element) return;

    const w = element.offsetWidth;
    const h = element.offsetHeight;
    if (w === 0 || h === 0) return;

    const texX = hit.uv.x * w;
    const texY = (1 - hit.uv.y) * h;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    for (const obj of this.objects) {
      const other = this._getElement(obj);
      if (other && other !== element) this._parkElement(other);
    }

    element.style.position = 'absolute';
    element.style.left = '0';
    element.style.top = '0';
    element.style.transform = `translate(${mouseX - texX}px, ${mouseY - texY}px)`;
  }

  _parkAllElements() {
    for (const obj of this.objects) {
      const el = this._getElement(obj);
      if (el) this._parkElement(el);
    }
  }

  _parkElement(el) {
    el.style.transform = 'translate(-99999px, 0)';
  }

  _getElement(obj) {
    const mesh = obj;
    const material = mesh.material;
    const texture = material && material.map;
    if (!texture || !texture.isHTMLTexture) return null;
    // 原生 THREE.HTMLTexture: image === element
    // three-html-render fallback: _sourceElement === element, image === canvas 快照
    const el = texture._sourceElement || texture.image;
    return el instanceof HTMLElement ? el : null;
  }
}
