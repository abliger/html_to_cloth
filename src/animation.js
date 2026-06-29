import * as THREE from 'three';
import { scene, camera, renderer } from './scene.js';
import { threeHtml } from './htmlRenderer.js';
import { updateCloth } from './cloth.js';

const clock = new THREE.Clock();

export function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.getElapsedTime();

  updateCloth(dt, time);
  threeHtml.update();
  renderer.render(scene, camera);
}
