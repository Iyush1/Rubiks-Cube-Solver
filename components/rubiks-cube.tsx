"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const modelPath = "/rubiks_cube.glb";
const PIXELATION = 3; // 1 = normal resolution, higher = chunkier pixels

function disposeModel(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    geometries.add(object.geometry);
    const meshMaterials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    meshMaterials.forEach((material) => {
      materials.add(material);
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) {
          textures.add(value);
        }
      });
    });
  });

  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}

export function RubiksCube() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    // Keep pixel ratio at 1 so the low-res render target isn't smoothed away.
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.domElement.className = "block size-full [image-rendering:pixelated]";
    container.appendChild(renderer.domElement);

    const modelGroup = new THREE.Group();
    modelGroup.rotation.set(-0.45, 0.65, 0.08);
    scene.add(modelGroup);

    let loadedModel: THREE.Object3D | null = null;
    let disposed = false;
    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      ({ scene: model }) => {
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        const largestDimension = Math.max(size.x, size.y, size.z);

        if (largestDimension > 0) {
          model.scale.multiplyScalar(3.2 / largestDimension);
        }

        const scaledBounds = new THREE.Box3().setFromObject(model);
        const center = scaledBounds.getCenter(new THREE.Vector3());
        model.position.sub(center);

        if (disposed) {
          disposeModel(model);
          return;
        }

        loadedModel = model;
        modelGroup.add(model);
      },
      undefined,
      (error) => {
        console.error(`Unable to load ${modelPath}`, error);
      },
    );

    // Soft ambient base — carries most of the brightness now, truly shadow-free
scene.add(new THREE.HemisphereLight(0xffffff, 0x4a4a5a, 3.6));

// Key light — front-ish, soft
const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
keyLight.position.set(3, 4, 6);
scene.add(keyLight);

// Fill light — opposite side of key
const fillLight = new THREE.DirectionalLight(0xffffff, 1.4);
fillLight.position.set(-4, 1, 3);
scene.add(fillLight);

// Rim/back light
const rimLight = new THREE.DirectionalLight(0xffffff, 1.3);
rimLight.position.set(-2, 3, -5);
scene.add(rimLight);

// Top light
const topLight = new THREE.DirectionalLight(0xffffff, 1.2);
topLight.position.set(0, 8, 0);
scene.add(topLight);

// Bottom light
const bottomLight = new THREE.DirectionalLight(0xffffff, 3);
bottomLight.position.set(0, -8, 0);
scene.add(bottomLight);

// Two extra diagonal fills — close remaining gaps so no face reads flat/dark
const diagFillA = new THREE.DirectionalLight(0xffffff, 1.0);
diagFillA.position.set(5, -3, -2);
scene.add(diagFillA);

const diagFillB = new THREE.DirectionalLight(0xffffff, 1.0);
diagFillB.position.set(-5, 3, 2);
scene.add(diagFillB);

    const idleDelayMs = 1000;
    const autoRotateSpeed = { x: 0.28, y: 0.42 };
    const baseRotation = {
      x: modelGroup.rotation.x,
      y: modelGroup.rotation.y,
    };
    const pointerOffset = { x: 0, y: 0 };
    let lastPointerMove = 0;
    const timer = new THREE.Timer();
    timer.connect(document);

    const isIdle = () =>
      lastPointerMove === 0 || performance.now() - lastPointerMove > idleDelayMs;

    const handlePointerMove = (event: PointerEvent) => {
      const normalizedX = event.clientX / window.innerWidth - 0.5;
      const normalizedY = event.clientY / window.innerHeight - 0.5;
      const offsetX = normalizedY * 1.05;
      const offsetY = normalizedX * 1.4;

      if (isIdle()) {
        baseRotation.x = modelGroup.rotation.x - offsetX;
        baseRotation.y = modelGroup.rotation.y - offsetY;
      }

      pointerOffset.x = offsetX;
      pointerOffset.y = offsetY;
      lastPointerMove = performance.now();
    };

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();

      // Render small, then let the browser upscale the canvas with
      // image-rendering: pixelated (set via CSS above) for a blocky look.
      const renderWidth = Math.max(1, Math.floor(width / PIXELATION));
      const renderHeight = Math.max(1, Math.floor(height / PIXELATION));

      renderer.setSize(renderWidth, renderHeight, false);
      renderer.domElement.style.width = `${width}px`;
      renderer.domElement.style.height = `${height}px`;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    resize();

    let animationFrame = 0;
    const render = () => {
      timer.update();
      const delta = timer.getDelta();

      if (isIdle()) {
        baseRotation.x += autoRotateSpeed.x * delta;
        baseRotation.y += autoRotateSpeed.y * delta;
      }

      const targetX = baseRotation.x + pointerOffset.x;
      const targetY = baseRotation.y + pointerOffset.y;
      modelGroup.rotation.x += (targetX - modelGroup.rotation.x) * 0.075;
      modelGroup.rotation.y += (targetY - modelGroup.rotation.y) * 0.075;

      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointermove", handlePointerMove);
      resizeObserver.disconnect();
      timer.dispose();
      if (loadedModel) {
        disposeModel(loadedModel);
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="size-[clamp(15rem,42vw,25rem)] cursor-crosshair filter-[drop-shadow(0_1.5rem_1.75rem_rgb(0_0_0/0.55))]"
      aria-hidden="true"
    />
  );
}