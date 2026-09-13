import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const container = document.querySelector("#tachikoma-viewer");
const shell = document.querySelector("#viewer-shell");
const modes = [...document.querySelectorAll(".mode")];
const viewButtons = [...document.querySelectorAll("[data-orbit]")];
const transport = document.querySelector("#transport");
const playToggle = document.querySelector("#play-toggle");
const timeline = document.querySelector("#timeline");
const timecode = document.querySelector("#timecode");
const progressFill = document.querySelector("#progress-fill");
const loadState = document.querySelector("#load-state");
const status = document.querySelector("#viewer-status");
const fullscreen = document.querySelector("#fullscreen");

const models = {
  walk: { src: "assets/tachikoma-walk.glb?v=19", label: "步行姿态", animated: false },
  roll: { src: "assets/tachikoma-roll.glb?v=19", label: "轮式姿态", animated: false },
  open: { src: "assets/tachikoma-open.glb?v=19", label: "开舱姿态", animated: false },
  patrol: { src: "assets/tachikoma-patrol.glb?v=19", label: "巡逻动画", animated: true },
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(31, 1, 0.05, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute("aria-label", "交互式塔奇克马三维视图");
container.prepend(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.minPolarAngle = THREE.MathUtils.degToRad(18);
controls.maxPolarAngle = THREE.MathUtils.degToRad(155);
controls.zoomToCursor = true;

scene.add(new THREE.HemisphereLight(0xc8f5ff, 0x16333b, 2.0));
const keyLight = new THREE.DirectionalLight(0xffffff, 4.0);
keyLight.position.set(5, 8, 6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.1;
keyLight.shadow.camera.far = 35;
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x46e7ff, 3.2);
rimLight.position.set(-5, 4, -6);
scene.add(rimLight);
const warmLight = new THREE.DirectionalLight(0xff744d, 1.2);
warmLight.position.set(4, 2, -4);
scene.add(warmLight);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(16, 64),
  new THREE.ShadowMaterial({ color: 0x02090b, opacity: 0.42 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const loader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/draco/");
loader.setDRACOLoader(draco);

const clock = new THREE.Clock();
const modelGroup = new THREE.Group();
scene.add(modelGroup);

let activeMode = "walk";
let mixer = null;
let action = null;
let animatedModel = null;
const animatedBox = new THREE.Box3();
const animatedCenter = new THREE.Vector3();
let scrubbing = false;
let paused = false;
let viewRadius = 6;
let modelCenter = new THREE.Vector3(0, 2.5, 0);
let loadSerial = 0;

function tuneMaterial(material) {
  const name = material.name || "";
  material.emissive?.set("#000000");
  material.emissiveIntensity = 0;
  if (/RedLight/i.test(name)) {
    material.color.set("#ff3e34"); material.emissive?.set("#ff2018"); material.emissiveIntensity = 2.4;
  } else if (/GripperGreen/i.test(name)) {
    material.color.set("#48de73"); material.emissive?.set("#1abf51"); material.emissiveIntensity = 1.5;
  } else if (/OpticWhite/i.test(name)) {
    material.color.set("#e9f4f2"); material.metalness = 0.12; material.roughness = 0.2;
  } else if (/Silver/i.test(name)) {
    material.color.set("#b9c9ca"); material.metalness = 0.65; material.roughness = 0.28;
  } else if (/BlueDark/i.test(name)) {
    material.color.set("#063f67"); material.metalness = 0.12; material.roughness = 0.38;
  } else if (/BluePanel/i.test(name)) {
    material.color.set("#0b6eaf"); material.metalness = 0.18; material.roughness = 0.32;
  } else if (/Blue_Paint|TKM2_Blue$/i.test(name)) {
    material.color.set("#148bd1"); material.metalness = 0.18; material.roughness = 0.3;
  } else if (/Black|Rubber/i.test(name)) {
    material.color.set("#101719"); material.metalness = 0.05; material.roughness = 0.72;
  }
  material.needsUpdate = true;
}

function clearModel() {
  mixer?.stopAllAction();
  mixer = null;
  action = null;
  animatedModel = null;
  modelGroup.position.set(0, 0, 0);
  while (modelGroup.children.length) {
    const child = modelGroup.children.pop();
    child.traverse((object) => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.filter(Boolean).forEach((material) => material.dispose());
    });
  }
}

function frameModel(azimuth = 38, elevation = 70, scale = 1.1) {
  const polar = THREE.MathUtils.degToRad(elevation);
  const theta = THREE.MathUtils.degToRad(azimuth);
  const responsiveScale = container.clientWidth <= 640 ? Math.max(scale, 1.4) : scale;
  const distance = viewRadius * responsiveScale;
  camera.position.set(
    modelCenter.x + distance * Math.sin(polar) * Math.sin(theta),
    modelCenter.y + distance * Math.cos(polar),
    modelCenter.z + distance * Math.sin(polar) * Math.cos(theta),
  );
  controls.target.copy(modelCenter);
  controls.minDistance = viewRadius * 0.53;
  controls.maxDistance = viewRadius * 2.4;
  controls.update();
}

function loadModel(mode) {
  const serial = ++loadSerial;
  const config = models[mode];
  activeMode = mode;
  modes.forEach((button) => button.classList.toggle("is-active", button.dataset.mode === mode));
  transport.hidden = !config.animated;
  progressFill.style.width = "0%";
  loadState.classList.remove("is-hidden");
  status.textContent = `${config.label}正在载入`;
  paused = false;

  loader.load(
    config.src,
    (gltf) => {
      if (serial !== loadSerial) return;
      clearModel();
      const modelRoot = gltf.scene;
      modelRoot.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(tuneMaterial);
      });
      modelGroup.add(modelRoot);
      animatedModel = modelRoot;

      const box = new THREE.Box3().setFromObject(modelRoot);
      const size = box.getSize(new THREE.Vector3());
      modelCenter = box.getCenter(new THREE.Vector3());
      viewRadius = Math.max(size.x, size.y, size.z) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
      ground.position.y = box.min.y - 0.015;
      frameModel();

      if (config.animated && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(modelRoot);
        action = mixer.clipAction(gltf.animations[0]);
        action.setLoop(THREE.LoopRepeat, Infinity).play();
        paused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        action.paused = paused;
      }
      loadState.classList.add("is-hidden");
      progressFill.style.width = "100%";
      status.textContent = `${config.label}已载入`;
      updateTransport();
    },
    (event) => {
      if (serial !== loadSerial || !event.total) return;
      progressFill.style.width = `${Math.round(event.loaded / event.total * 100)}%`;
    },
    () => {
      if (serial !== loadSerial) return;
      loadState.querySelector("span:last-child").textContent = "3D 载入失败，请刷新重试";
      status.textContent = `${config.label}载入失败`;
    },
  );
}

function animationDuration() { return action?.getClip().duration || 0; }

function updateTransport() {
  if (activeMode !== "patrol" || !action) return;
  const duration = animationDuration();
  const elapsed = mixer?.time % duration || 0;
  if (!scrubbing && duration) timeline.value = String(elapsed / duration);
  timecode.value = `${formatTime(elapsed)} / ${formatTime(duration)}`;
  playToggle.textContent = paused ? "▶" : "Ⅱ";
  playToggle.setAttribute("aria-label", paused ? "播放动画" : "暂停动画");
}

function formatTime(seconds) {
  const value = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  return `${Math.floor(value / 60).toString().padStart(2, "0")}:${Math.floor(value % 60).toString().padStart(2, "0")}`;
}

function resize() {
  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (mixer && !paused && !scrubbing) mixer.update(delta);
  if (mixer && animatedModel) {
    modelGroup.updateMatrixWorld(true);
    animatedBox.setFromObject(animatedModel).getCenter(animatedCenter);
    modelGroup.position.x += modelCenter.x - animatedCenter.x;
    modelGroup.position.z += modelCenter.z - animatedCenter.z;
  }
  controls.update();
  updateTransport();
  renderer.render(scene, camera);
}

modes.forEach((button) => button.addEventListener("click", () => loadModel(button.dataset.mode)));
viewButtons.forEach((button) => button.addEventListener("click", () => {
  const [azimuth, elevation, scale] = button.dataset.orbit.match(/[\d.]+/g).map(Number);
  frameModel(azimuth, elevation, scale / 100);
}));

playToggle.addEventListener("click", () => {
  if (!action) return;
  paused = !paused;
  action.paused = paused;
  updateTransport();
});
timeline.addEventListener("pointerdown", () => { scrubbing = true; });
timeline.addEventListener("input", () => {
  if (!action || !mixer) return;
  mixer.setTime(Number(timeline.value) * animationDuration());
  updateTransport();
});
timeline.addEventListener("change", () => { scrubbing = false; });
timeline.addEventListener("pointerup", () => { scrubbing = false; });

fullscreen.addEventListener("click", async () => {
  if (document.fullscreenElement) await document.exitFullscreen();
  else if (shell.requestFullscreen) await shell.requestFullscreen();
});
document.addEventListener("fullscreenchange", () => {
  fullscreen.textContent = document.fullscreenElement ? "×" : "↗";
  fullscreen.setAttribute("aria-label", document.fullscreenElement ? "退出全屏" : "全屏查看");
  resize();
});

new ResizeObserver(resize).observe(container);
resize();
loadModel("walk");
animate();
