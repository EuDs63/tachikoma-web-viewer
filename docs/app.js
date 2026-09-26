import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const MODELS = {
  walk: {
    src: "assets/tachikoma-walk.glb?v=21-optic1",
    index: "01",
    label: "步行姿态",
    description:
      "四足展开，静候下一次出发。转动视角，观察关节、装甲与每一处机械细节。",
    view: [38, 70, 1.05],
  },
  roll: {
    src: "assets/tachikoma-roll.glb?v=21-optic1",
    index: "02",
    label: "轮式姿态",
    description:
      "由步行切换至滑行。足端轮组展开，让同一副机体呈现截然不同的速度感。",
    view: [38, 70, 1.05],
  },
  open: {
    src: "assets/tachikoma-open.glb?v=21-optic1",
    index: "03",
    label: "开舱姿态",
    description:
      "打开装甲，走近内部。顶盖、后舱与检修组件展开，显露驾驶舱和结构连接。",
    view: [218, 70, 1.05],
  },
  patrol: {
    src: "assets/tachikoma-patrol.glb?v=21-optic1",
    index: "04",
    label: "巡逻动画",
    description:
      "426 帧，一次完整的机械呼吸。播放或拖动时间轴，细看四足之间的协调与节奏。",
    view: [38, 70, 1.05],
    animated: true,
  },
};

export async function initViewer() {
  const $ = (selector) => document.querySelector(selector);
  const container = $("#tachikoma-viewer");
  const shell = $("#viewer-shell");
  const modes = [...document.querySelectorAll(".mode[data-mode]")];
  const viewButtons = [...document.querySelectorAll("[data-orbit]")];
  const transport = $("#transport");
  const playToggle = $("#play-toggle");
  const timeline = $("#timeline");
  const timecode = $("#timecode");
  const progressFill = $("#progress-fill");
  const loadState = $("#load-state");
  const loadLabel = $("#load-label");
  const loadPercent = $("#load-percent");
  const retryLoad = $("#retry-load");
  const status = $("#viewer-status");
  const fullscreen = $("#fullscreen");
  const rotateToggle = $("#rotate-toggle");
  const wireframeToggle = $("#wireframe-toggle");
  const lightToggle = $("#light-toggle");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 1000);
  // Let the bootstrap show its accessible fallback if WebGL is unavailable.
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "default",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "交互式塔奇克马三维视图");
  canvas.setAttribute("aria-describedby", "camera-help camera-help-detail");
  canvas.setAttribute(
    "aria-keyshortcuts",
    "W S A D Q E ArrowUp ArrowDown ArrowLeft ArrowRight Home",
  );
  container.prepend(canvas);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.085;
  controls.minPolarAngle = THREE.MathUtils.degToRad(16);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(145);
  controls.zoomToCursor = true;
  controls.screenSpacePanning = true;
  controls.panSpeed = 0.8;
  controls.rotateSpeed = 0.65;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.65;

  let environment = null;
  function rebuildEnvironment() {
    environment?.dispose();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    environment = pmrem.fromScene(room, 0.025);
    scene.environment = environment.texture;
    room.dispose();
    pmrem.dispose();
  }
  rebuildEnvironment();
  scene.environmentIntensity = 0.5;
  const ambient = new THREE.HemisphereLight(0xfff8ed, 0x9faab7, 0.9);
  const keyLight = new THREE.DirectionalLight(0xfff5e8, 2.5);
  const fillLight = new THREE.DirectionalLight(0xdbe9ff, 0.7);
  const rimLight = new THREE.DirectionalLight(0xffffff, 1.7);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.bias = -0.00015;
  keyLight.shadow.normalBias = 0.025;
  scene.add(
    ambient,
    keyLight,
    keyLight.target,
    fillLight,
    fillLight.target,
    rimLight,
    rimLight.target,
  );

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShadowMaterial({
      color: 0x423e38,
      opacity: 0.11,
      depthWrite: false,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const contactCanvas = document.createElement("canvas");
  contactCanvas.width = contactCanvas.height = 128;
  const context = contactCanvas.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 64);
  gradient.addColorStop(0, "rgba(37, 35, 32, .2)");
  gradient.addColorStop(0.5, "rgba(37, 35, 32, .1)");
  gradient.addColorStop(1, "rgba(37, 35, 32, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const contactTexture = new THREE.CanvasTexture(contactCanvas);
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: contactTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.8,
    }),
  );
  contact.rotation.x = -Math.PI / 2;
  scene.add(contact);
  const modelGroup = new THREE.Group();
  scene.add(modelGroup);

  const draco = new DRACOLoader();
  draco.setDecoderPath(
    new URL("./vendor/three/examples/jsm/libs/draco/gltf/", import.meta.url)
      .href,
  );
  draco.setWorkerLimit(2);
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const cache = new Map();
  const pending = new Map();
  const modelBox = new THREE.Box3();
  const modelCenter = new THREE.Vector3();
  const modelSize = new THREE.Vector3();
  const framingPoints = [];
  const anchorInitial = new THREE.Vector3();
  const anchorPosition = new THREE.Vector3();
  const movementKeys = new Set();
  const movementCodes = new Set([
    "KeyW",
    "KeyS",
    "KeyA",
    "KeyD",
    "KeyQ",
    "KeyE",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ShiftLeft",
    "ShiftRight",
  ]);
  const direction = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);
  let activeMode = null;
  let requestedMode = "walk";
  let activeRoot = null;
  let mixer = null;
  let action = null;
  let anchor = null;
  let loadSerial = 0;
  let viewRadius = 8;
  let activeView = MODELS.walk.view;
  let userNavigated = false;
  let paused = false;
  let scrubbing = false;
  let wireframe = false;
  let night = false;
  let transition = null;
  let raf = 0;
  let lastTime = 0;
  let lastTransportTime = 0;
  let lastShadowTime = 0;
  let inViewport = true;
  let interacting = false;
  let contextLost = false;

  function announce(message) {
    if (status) status.textContent = message;
  }
  function setPressed(button, pressed) {
    if (!button) return;
    button.setAttribute("aria-pressed", String(pressed));
    button.classList.toggle("is-active", pressed);
  }
  function invalidate() {
    if (!raf && !document.hidden && inViewport && !contextLost)
      raf = requestAnimationFrame(render);
  }
  function tuneMaterial(material) {
    const name = material.name || "";
    material.emissive?.set(0x000000);
    material.emissiveIntensity = 0;
    if (/RedLight/i.test(name)) {
      material.color.set("#f03a2d");
      material.emissive?.set("#e32b20");
      material.emissiveIntensity = 0.7;
    } else if (/GripperGreen|SensorGreen/i.test(name)) {
      material.color.set("#52c978");
      material.emissive?.set("#36ac5a");
      material.emissiveIntensity = 0.4;
    } else if (/OpticWhite/i.test(name)) {
      material.color.set("#f3f2ea");
      material.metalness = 0.08;
      material.roughness = 0.27;
    } else if (/Silver/i.test(name)) {
      material.color.set("#aeb9c2");
      material.metalness = 0.65;
      material.roughness = 0.32;
    } else if (/BlueDark/i.test(name)) {
      material.color.set("#063b70");
      material.metalness = 0.12;
      material.roughness = 0.36;
    } else if (/BluePanel/i.test(name)) {
      material.color.set("#0c59a5");
      material.metalness = 0.14;
      material.roughness = 0.3;
    } else if (/Blue_Paint|TKM2_Blue$/i.test(name)) {
      material.color.set("#0872ce");
      material.metalness = 0.14;
      material.roughness = 0.29;
    } else if (/Black|Rubber/i.test(name)) {
      material.color.set("#20272e");
      material.metalness = 0.04;
      material.roughness = 0.75;
    }
    material.envMapIntensity = 0.8;
  }
  function eachMaterial(root, callback) {
    const seen = new Set();
    root?.traverse((object) => {
      if (!object.isMesh) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of materials)
        if (material && !seen.has(material)) {
          seen.add(material);
          callback(material);
        }
    });
  }
  function disposeAsset(asset) {
    const geometries = new Set();
    const textures = new Set();
    asset.scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
    });
    eachMaterial(asset.scene, (material) => {
      for (const value of Object.values(material))
        if (value?.isTexture) textures.add(value);
      material.dispose();
    });
    geometries.forEach((geometry) => geometry.dispose());
    textures.forEach((texture) => texture.dispose());
  }
  function trimCache() {
    for (const [mode, asset] of cache) {
      if (cache.size <= 2) break;
      if (mode === activeMode || mode === requestedMode) continue;
      cache.delete(mode);
      disposeAsset(asset);
    }
  }
  function updateProgress(value) {
    const percent = Math.round(Math.max(0, Math.min(100, value)));
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (loadPercent) loadPercent.textContent = `${percent}%`;
  }
  function fetchAsset(mode) {
    if (cache.has(mode)) {
      const asset = cache.get(mode);
      cache.delete(mode);
      cache.set(mode, asset);
      return Promise.resolve(asset);
    }
    if (pending.has(mode)) return pending.get(mode);
    const promise = new Promise((resolve, reject) => {
      loader.load(
        MODELS[mode].src,
        (asset) => {
          asset.scene.traverse((object) => {
            if (object.isMesh) {
              object.castShadow = true;
              object.receiveShadow = false;
            }
          });
          eachMaterial(asset.scene, tuneMaterial);
          pending.delete(mode);
          cache.set(mode, asset);
          trimCache();
          resolve(asset);
        },
        (event) => {
          if (mode === requestedMode && event.total)
            updateProgress((event.loaded / event.total) * 96);
        },
        (error) => {
          pending.delete(mode);
          reject(error);
        },
      );
    });
    pending.set(mode, promise);
    return promise;
  }

  function flushDamping() {
    controls.enableDamping = false;
    const rotating = controls.autoRotate;
    controls.autoRotate = false;
    controls.update(0);
    controls.autoRotate = rotating;
    controls.enableDamping = true;
  }
  function fitPosition(azimuth, elevation, scale) {
    const polar = THREE.MathUtils.degToRad(elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    const viewDirection = new THREE.Vector3(
      Math.sin(polar) * Math.sin(theta),
      Math.cos(polar),
      Math.sin(polar) * Math.cos(theta),
    );
    const horizontal = new THREE.Vector3()
      .crossVectors(worldUp, viewDirection)
      .normalize();
    const vertical = new THREE.Vector3()
      .crossVectors(viewDirection, horizontal)
      .normalize();
    const tangentV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const tangentH = tangentV * camera.aspect;
    let distance = 0;
    // Project each mesh's cached bounds instead of the large, mostly empty
    // corners of the whole vehicle's box. This keeps the exhibit substantial.
    const corner = new THREE.Vector3();
    for (const point of framingPoints) {
      corner.copy(point).sub(modelCenter);
      const depth = corner.dot(viewDirection);
      distance = Math.max(
        distance,
        depth + Math.abs(corner.dot(horizontal)) / tangentH,
        depth + Math.abs(corner.dot(vertical)) / tangentV,
      );
    }
    viewRadius = Math.max(distance, 1);
    controls.minDistance = Math.max(0.1, viewRadius * 0.27);
    controls.maxDistance = viewRadius * 4;
    return viewDirection.multiplyScalar(viewRadius * scale).add(modelCenter);
  }
  function frameModel(
    azimuth = 38,
    elevation = 70,
    scale = 1.05,
    smooth = true,
  ) {
    if (!activeRoot) return;
    flushDamping();
    activeView = [azimuth, elevation, scale];
    const destination = fitPosition(azimuth, elevation, scale);
    if (smooth && !reducedMotion.matches) {
      transition = {
        start: performance.now(),
        from: camera.position.clone(),
        to: destination,
        targetFrom: controls.target.clone(),
        targetTo: modelCenter.clone(),
      };
    } else {
      transition = null;
      camera.position.copy(destination);
      controls.target.copy(modelCenter);
      controls.update(0);
    }
    invalidate();
  }
  function updateViewSelection(selected = null) {
    viewButtons.forEach((button) => setPressed(button, button === selected));
  }
  function selectMatchingView(view) {
    updateViewSelection(
      viewButtons.find((button) => {
        const values = button.dataset.orbit.match(/-?[\d.]+/g)?.map(Number);
        return (
          values?.length === 3 &&
          values[0] === view[0] &&
          values[1] === view[1] &&
          Math.abs(values[2] / 100 - view[2]) < 0.001
        );
      }),
    );
  }
  function resetCamera() {
    movementKeys.clear();
    userNavigated = false;
    selectMatchingView(MODELS[activeMode || "walk"].view);
    frameModel(...MODELS[activeMode || "walk"].view);
    canvas.focus({ preventScroll: true });
    announce("视角已复位");
  }
  function configureStage() {
    const span = Math.max(modelSize.x, modelSize.y, modelSize.z);
    ground.position.set(modelCenter.x, modelBox.min.y - 0.025, modelCenter.z);
    ground.scale.set(span * 5, span * 5, 1);
    contact.position.set(modelCenter.x, modelBox.min.y - 0.012, modelCenter.z);
    contact.scale.set(modelSize.x * 1.2, modelSize.z * 1.25, 1);
    keyLight.position
      .copy(modelCenter)
      .add(new THREE.Vector3(0.7, 1.3, 0.9).multiplyScalar(span));
    fillLight.position
      .copy(modelCenter)
      .add(new THREE.Vector3(-1, 0.4, 0.4).multiplyScalar(span));
    rimLight.position
      .copy(modelCenter)
      .add(new THREE.Vector3(0.3, 0.8, -1).multiplyScalar(span));
    for (const light of [keyLight, fillLight, rimLight])
      light.target.position.copy(modelCenter);
    Object.assign(keyLight.shadow.camera, {
      left: -span,
      right: span,
      top: span,
      bottom: -span,
      near: 0.1,
      far: span * 6,
    });
    keyLight.shadow.camera.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
  }
  function stabilizeAnimation() {
    if (!anchor) return;
    anchor.getWorldPosition(anchorPosition);
    modelGroup.position.x += anchorInitial.x - anchorPosition.x;
    modelGroup.position.z += anchorInitial.z - anchorPosition.z;
  }
  async function loadModel(mode, retry = false) {
    if (!MODELS[mode]) return;
    if (mode === requestedMode && pending.has(mode) && !retry) return;
    if (mode === activeMode && !retry) {
      ++loadSerial;
      requestedMode = mode;
      shell.dataset.loading = "false";
      loadState.classList.add("is-hidden");
      return;
    }
    const serial = ++loadSerial;
    requestedMode = mode;
    shell.dataset.loading = "true";
    loadState.classList.remove("is-hidden", "is-error");
    if (loadLabel) loadLabel.textContent = `正在载入${MODELS[mode].label}`;
    if (retryLoad) retryLoad.hidden = true;
    updateProgress(0);
    announce(`${MODELS[mode].label}正在载入`);
    try {
      const asset = await fetchAsset(mode);
      if (serial !== loadSerial) {
        trimCache();
        return;
      }
      mixer?.stopAllAction();
      if (mixer && activeRoot) mixer.uncacheRoot(activeRoot);
      modelGroup.clear();
      modelGroup.position.set(0, 0, 0);
      activeRoot = asset.scene;
      activeMode = mode;
      movementKeys.clear();
      mixer = null;
      action = null;
      anchor = null;
      scrubbing = false;
      paused = reducedMotion.matches;
      modelGroup.add(activeRoot);
      eachMaterial(activeRoot, (material) => {
        material.wireframe = wireframe;
      });
      if (MODELS[mode].animated && asset.animations.length) {
        mixer = new THREE.AnimationMixer(activeRoot);
        action = mixer.clipAction(asset.animations[0]);
        action.setLoop(THREE.LoopRepeat, Infinity).play();
        mixer.update(0);
        action.paused = paused;
        anchor = activeRoot.getObjectByName("CTRL_ROOT") || null;
        if (anchor) anchor.getWorldPosition(anchorInitial);
      }
      modelBox.setFromObject(activeRoot);
      modelBox.getCenter(modelCenter);
      modelBox.getSize(modelSize);
      framingPoints.length = 0;
      activeRoot.traverse((object) => {
        if (!object.isMesh || !object.geometry) return;
        if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
        const bounds = object.geometry.boundingBox;
        for (const x of [bounds.min.x, bounds.max.x])
          for (const y of [bounds.min.y, bounds.max.y])
            for (const z of [bounds.min.z, bounds.max.z]) {
              framingPoints.push(
                new THREE.Vector3(x, y, z).applyMatrix4(object.matrixWorld),
              );
            }
      });
      configureStage();
      userNavigated = false;
      selectMatchingView(MODELS[mode].view);
      frameModel(...MODELS[mode].view, false);
      modes.forEach((button) =>
        setPressed(button, button.dataset.mode === mode),
      );
      transport.hidden = !action;
      if ($("#mode-name")) $("#mode-name").textContent = MODELS[mode].label;
      if ($("#mode-description"))
        $("#mode-description").textContent = MODELS[mode].description;
      if ($("#mode-index")) $("#mode-index").textContent = MODELS[mode].index;
      if ($("#download-model")) $("#download-model").href = MODELS[mode].src;
      shell.dataset.mode = mode;
      shell.dataset.loading = "false";
      loadState.classList.add("is-hidden");
      updateProgress(100);
      updateTransport(true);
      trimCache();
      announce(`${MODELS[mode].label}已载入`);
      invalidate();
    } catch (error) {
      if (serial !== loadSerial) return;
      console.warn("Model loading failed", error);
      shell.dataset.loading = "false";
      loadState.classList.add("is-error");
      if (loadLabel) loadLabel.textContent = "模型暂时未能载入";
      if (loadPercent) loadPercent.textContent = "请检查连接后重试";
      if (retryLoad) retryLoad.hidden = false;
      announce(`${MODELS[mode].label}载入失败，可重试或选择其他模式`);
    }
  }

  function formatTime(seconds) {
    const value = Math.max(0, Math.floor(seconds || 0));
    return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  }
  function updateTransport(force = false, now = performance.now()) {
    if (!action || (!force && now - lastTransportTime < 100)) return;
    lastTransportTime = now;
    const duration = action.getClip().duration;
    const elapsed = action.time;
    if (!scrubbing) timeline.value = String(duration ? elapsed / duration : 0);
    const text = `${formatTime(elapsed)} / ${formatTime(duration)}`;
    if (timecode.value !== text) timecode.value = text;
    playToggle.textContent = paused ? "▶" : "Ⅱ";
    playToggle.setAttribute("aria-label", paused ? "播放动画" : "暂停动画");
    playToggle.setAttribute("aria-pressed", String(!paused));
  }
  function updateMovement(delta) {
    if (!movementKeys.size || document.activeElement !== canvas) return false;
    camera.updateMatrixWorld();
    camera.getWorldDirection(forward);
    right.crossVectors(forward, camera.up).normalize();
    up.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
    direction.set(0, 0, 0);
    if (movementKeys.has("KeyW")) direction.add(forward);
    if (movementKeys.has("KeyS")) direction.sub(forward);
    if (movementKeys.has("KeyD") || movementKeys.has("ArrowRight"))
      direction.add(right);
    if (movementKeys.has("KeyA") || movementKeys.has("ArrowLeft"))
      direction.sub(right);
    if (movementKeys.has("KeyE")) direction.add(worldUp);
    if (movementKeys.has("KeyQ")) direction.sub(worldUp);
    if (movementKeys.has("ArrowUp")) direction.add(up);
    if (movementKeys.has("ArrowDown")) direction.sub(up);
    if (!direction.lengthSq()) return false;
    const fast =
      movementKeys.has("ShiftLeft") || movementKeys.has("ShiftRight");
    direction
      .normalize()
      .multiplyScalar(viewRadius * 0.32 * (fast ? 2.5 : 1) * delta);
    camera.position.add(direction);
    controls.target.add(direction);
    userNavigated = true;
    transition = null;
    return true;
  }
  function render(now) {
    raf = 0;
    if (document.hidden || !inViewport || contextLost) {
      lastTime = 0;
      return;
    }
    const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 1 / 60;
    lastTime = now;
    updateMovement(delta);
    const playing = !!action && !paused && !scrubbing;
    if (playing) {
      mixer.update(delta);
      stabilizeAnimation();
    }
    if (transition) {
      const t = Math.min(1, (now - transition.start) / 700);
      const ease = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(transition.from, transition.to, ease);
      controls.target.lerpVectors(
        transition.targetFrom,
        transition.targetTo,
        ease,
      );
      if (t >= 1) transition = null;
    }
    const changed = controls.update(delta);
    if (playing && now - lastShadowTime > 80) {
      renderer.shadowMap.needsUpdate = true;
      lastShadowTime = now;
    }
    updateTransport(false, now);
    renderer.render(scene, camera);
    if (
      playing ||
      controls.autoRotate ||
      transition ||
      movementKeys.size ||
      interacting ||
      changed
    )
      invalidate();
    else lastTime = 0;
  }
  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    const previous = camera.aspect;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (
      !userNavigated &&
      activeRoot &&
      Math.abs(previous - camera.aspect) > 0.01
    )
      frameModel(...activeView, false);
    invalidate();
  }
  function setLighting(isNight) {
    night = isNight;
    document.body.dataset.light = night ? "night" : "studio";
    setPressed(lightToggle, night);
    ambient.color.set(night ? 0xb9d5ff : 0xfff8ed);
    ambient.groundColor.set(night ? 0x15253f : 0x9faab7);
    ambient.intensity = night ? 0.7 : 0.9;
    keyLight.color.set(night ? 0xe4efff : 0xfff5e8);
    keyLight.intensity = night ? 2.7 : 2.5;
    fillLight.intensity = night ? 0.5 : 0.7;
    rimLight.color.set(night ? 0x759bff : 0xffffff);
    rimLight.intensity = night ? 3.2 : 1.7;
    scene.environmentIntensity = night ? 0.4 : 0.5;
    renderer.toneMappingExposure = night ? 0.95 : 0.9;
    ground.material.color.set(night ? 0x030817 : 0x423e38);
    ground.material.opacity = night ? 0.3 : 0.11;
    renderer.shadowMap.needsUpdate = true;
    invalidate();
  }

  modes.forEach((button) =>
    button.addEventListener("click", () => loadModel(button.dataset.mode)),
  );
  viewButtons.forEach((button) =>
    button.addEventListener("click", () => {
      const values = button.dataset.orbit.match(/-?[\d.]+/g)?.map(Number);
      if (!values || values.length < 3) return;
      userNavigated = false;
      updateViewSelection(button);
      frameModel(values[0], values[1], values[2] / 100);
    }),
  );
  $("#camera-reset")?.addEventListener("click", resetCamera);
  retryLoad?.addEventListener("click", () => loadModel(requestedMode, true));
  rotateToggle?.addEventListener("click", () => {
    controls.autoRotate = !controls.autoRotate;
    setPressed(rotateToggle, controls.autoRotate);
    if (controls.autoRotate) {
      transition = null;
      userNavigated = true;
      updateViewSelection();
    }
    announce(controls.autoRotate ? "自动环绕已开启" : "自动环绕已停止");
    invalidate();
  });
  wireframeToggle?.addEventListener("click", () => {
    wireframe = !wireframe;
    setPressed(wireframeToggle, wireframe);
    eachMaterial(activeRoot, (material) => {
      material.wireframe = wireframe;
    });
    ground.visible = contact.visible = !wireframe;
    renderer.shadowMap.needsUpdate = true;
    announce(wireframe ? "线框视图已开启" : "材质视图已恢复");
    invalidate();
  });
  lightToggle?.addEventListener("click", () => setLighting(!night));
  const captureButton = $("#capture-view");
  const captureDialog = $("#capture-dialog");
  const captureImage = $("#capture-image");
  const captureDownload = $("#capture-download");
  let captureUrl = null;
  captureButton?.addEventListener("click", () => {
    if (!activeRoot || contextLost) return;
    if (!captureDialog || !captureImage || !captureDownload) return;
    const filename = `tachikoma-${activeMode}-${night ? "night" : "studio"}.png`;
    renderer.render(scene, camera);
    const output = document.createElement("canvas");
    output.width = canvas.width;
    output.height = canvas.height;
    const outputContext = output.getContext("2d");
    outputContext.fillStyle =
      getComputedStyle(document.body).getPropertyValue("--stage-bg").trim() ||
      (night ? "#151c28" : "#ece9e1");
    outputContext.fillRect(0, 0, output.width, output.height);
    outputContext.drawImage(canvas, 0, 0);
    output.toBlob((blob) => {
      if (!blob) {
        announce("截图生成失败，请重试");
        return;
      }
      if (captureUrl) URL.revokeObjectURL(captureUrl);
      captureUrl = URL.createObjectURL(blob);
      captureImage.src = captureUrl;
      captureDownload.href = captureUrl;
      captureDownload.download = filename;
      if (!captureDialog.open) captureDialog.showModal();
      announce("截图已生成，可预览或下载");
    }, "image/png");
  });
  $("#capture-close")?.addEventListener("click", () => captureDialog?.close());
  captureDialog?.addEventListener("close", () => {
    captureButton?.focus({ preventScroll: true });
  });
  captureDialog?.addEventListener("keydown", (event) => {
    // Escape closes the native dialog without also exiting the CSS full view.
    if (event.code === "Escape") event.stopPropagation();
  });
  controls.addEventListener("change", invalidate);
  controls.addEventListener("start", () => {
    interacting = true;
    userNavigated = true;
    transition = null;
    updateViewSelection();
    invalidate();
  });
  controls.addEventListener("end", () => {
    interacting = false;
    invalidate();
  });
  canvas.addEventListener("pointerdown", () =>
    canvas.focus({ preventScroll: true }),
  );
  canvas.addEventListener("keydown", (event) => {
    if (event.code === "Home") {
      event.preventDefault();
      resetCamera();
      return;
    }
    if (!movementCodes.has(event.code)) return;
    event.preventDefault();
    movementKeys.add(event.code);
    invalidate();
  });
  canvas.addEventListener("keyup", (event) => {
    if (!movementCodes.has(event.code)) return;
    event.preventDefault();
    movementKeys.delete(event.code);
  });
  const stopMovement = () => {
    movementKeys.clear();
    interacting = false;
  };
  canvas.addEventListener("blur", stopMovement);
  window.addEventListener("blur", stopMovement);
  window.addEventListener("pagehide", stopMovement);
  document.addEventListener("visibilitychange", () => {
    stopMovement();
    lastTime = 0;
    if (!document.hidden) invalidate();
  });
  playToggle.addEventListener("click", () => {
    if (!action) return;
    paused = !paused;
    action.paused = paused;
    updateTransport(true);
    invalidate();
  });
  timeline.addEventListener("pointerdown", () => {
    scrubbing = true;
  });
  timeline.addEventListener("input", () => {
    if (!action || !mixer) return;
    // Evaluate the action directly: mixer.setTime() resets paused actions to 0.
    action.time =
      Number(timeline.value) * Math.max(0, action.getClip().duration - 0.00001);
    const wasPaused = action.paused;
    action.paused = false;
    mixer.update(0);
    action.paused = wasPaused;
    stabilizeAnimation();
    renderer.shadowMap.needsUpdate = true;
    updateTransport(true);
    invalidate();
  });
  const finishScrub = () => {
    if (scrubbing) {
      scrubbing = false;
      updateTransport(true);
      invalidate();
    }
  };
  timeline.addEventListener("change", finishScrub);
  window.addEventListener("pointerup", finishScrub);
  window.addEventListener("pointercancel", finishScrub);
  timeline.addEventListener("blur", finishScrub);
  fullscreen?.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (shell.requestFullscreen) await shell.requestFullscreen();
      else {
        const expanded = shell.classList.toggle("is-expanded");
        setPressed(fullscreen, expanded);
        fullscreen.setAttribute(
          "aria-label",
          expanded ? "退出全屏" : "全屏查看",
        );
        resize();
      }
    } catch {
      announce("当前浏览器暂不支持全屏查看");
    }
  });
  document.addEventListener("fullscreenchange", () => {
    const expanded = document.fullscreenElement === shell;
    setPressed(fullscreen, expanded);
    fullscreen?.setAttribute("aria-label", expanded ? "退出全屏" : "全屏查看");
    resize();
  });
  document.addEventListener("keydown", (event) => {
    if (event.code !== "Escape" || !shell.classList.contains("is-expanded"))
      return;
    shell.classList.remove("is-expanded");
    setPressed(fullscreen, false);
    fullscreen?.setAttribute("aria-label", "全屏查看");
    resize();
  });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    contextLost = true;
    stopMovement();
    loadState.classList.remove("is-hidden");
    loadState.classList.add("is-error");
    if (loadLabel) loadLabel.textContent = "图形显示暂时中断，正在恢复";
    announce("图形显示暂时中断，正在恢复");
  });
  canvas.addEventListener("webglcontextrestored", () => {
    contextLost = false;
    // Render-target pixels do not survive a lost context. Recreate the studio
    // illumination so restored meshes retain their original material response.
    rebuildEnvironment();
    renderer.shadowMap.needsUpdate = true;
    loadState.classList.add("is-hidden");
    invalidate();
    announce("三维显示已恢复");
  });
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const visibilityObserver = new IntersectionObserver(
    ([entry]) => {
      inViewport = entry.isIntersecting;
      lastTime = 0;
      if (inViewport) invalidate();
    },
    { threshold: 0 },
  );
  visibilityObserver.observe(container);
  reducedMotion.addEventListener("change", () => {
    if (!reducedMotion.matches) return;
    controls.autoRotate = false;
    setPressed(rotateToggle, false);
    if (action) {
      paused = true;
      action.paused = true;
      updateTransport(true);
    }
    if (transition) {
      camera.position.copy(transition.to);
      controls.target.copy(transition.targetTo);
      transition = null;
    }
    invalidate();
  });
  setPressed(rotateToggle, false);
  setPressed(wireframeToggle, false);
  setLighting(false);
  resize();
  await loadModel("walk");
}
