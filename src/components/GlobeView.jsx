import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const RADIUS = 1.6;

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function latLngToVec(lat, lng, r = RADIUS) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

function makeAtmosphere() {
  const geom = new THREE.SphereGeometry(RADIUS * 1.08, 64, 48);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    uniforms: {},
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float i = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.2);
        gl_FragColor = vec4(0.89, 0.55, 1.0, i * 0.85);
      }
    `,
  });
  return new THREE.Mesh(geom, mat);
}

function buildArcs(pins, parent) {
  const byKey = new Map();
  for (const p of pins) {
    const k = p.rareDiseaseKey && p.rareDiseaseKey !== 'other' ? p.rareDiseaseKey : p.rareDisease;
    if (!k) continue;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(p);
  }
  const group = new THREE.Group();
  let count = 0;
  for (const list of byKey.values()) {
    if (list.length < 2) continue;
    const n = Math.min(list.length, 6);
    for (let i = 0; i < n && count < 36; i++) {
      const a = list[i];
      const b = list[(i + 1) % n];
      if (a.id === b.id) continue;
      const start = latLngToVec(a.lat, a.lng, RADIUS * 1.01);
      const end = latLngToVec(b.lat, b.lng, RADIUS * 1.01);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const lift = 1 + start.distanceTo(end) * 0.35;
      mid.normalize().multiplyScalar(RADIUS * lift);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const pts = curve.getPoints(32);
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: 0xf0b4ea,
        transparent: true,
        opacity: 0.35,
      });
      group.add(new THREE.Line(geom, mat));
      count += 1;
    }
  }
  parent.add(group);
  return group;
}

export default function GlobeView({ pins, highlightId, onPinClick, paused }) {
  const wrapRef = useRef(null);
  const pinsRef = useRef(pins);
  const highlightRef = useRef(highlightId);
  const pausedRef = useRef(paused);
  const clickRef = useRef(onPinClick);
  pinsRef.current = pins;
  highlightRef.current = highlightId;
  pausedRef.current = paused;
  clickRef.current = onPinClick;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !hasWebGL()) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0.4, 5.2);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: el.clientWidth > 720,
        alpha: true,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
      });
    } catch (err) {
      console.warn('Rare Disease Planet globe:', err);
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.touchAction = 'none';
    el.appendChild(renderer.domElement);
    el.classList.add('is-live');

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.6;
    controls.maxDistance = 8;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.45;
    controls.rotateSpeed = 0.6;

    scene.add(new THREE.AmbientLight(0xf2d9ff, 1.35));
    const key = new THREE.DirectionalLight(0xffe1c4, 1.6);
    key.position.set(4, 2, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xc084fc, 0.7);
    rim.position.set(-3, -1, -2);
    scene.add(rim);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const earthMat = new THREE.MeshPhongMaterial({
      color: 0x9b6bb5,
      emissive: 0x220818,
      shininess: 8,
      specular: 0x442244,
    });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 64, 48), earthMat);
    globeGroup.add(earth);
    globeGroup.add(makeAtmosphere());

    const loader = new THREE.TextureLoader();
    loader.load(
      '/earth-night.jpg',
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        earth.material = new THREE.MeshPhongMaterial({
          map: tex,
          specular: 0x331122,
          shininess: 6,
          emissive: 0x1a0818,
          emissiveIntensity: 0.35,
        });
        earth.material.needsUpdate = true;
      },
      undefined,
      () => {},
    );

    const pinRoot = new THREE.Group();
    globeGroup.add(pinRoot);
    const pinMeshes = [];
    let arcGroup = null;

    const pinGeom = new THREE.SphereGeometry(0.048, 14, 14);

    function rebuildPins() {
      pinRoot.clear();
      pinMeshes.length = 0;
      if (arcGroup) {
        globeGroup.remove(arcGroup);
        arcGroup.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) obj.material.dispose();
        });
      }
      const list = pinsRef.current || [];
      for (const p of list) {
        const highlighted = p.id === highlightRef.current;
        const mat = new THREE.MeshBasicMaterial({
          color: highlighted ? 0xefb07a : 0xf4a6de,
        });
        const mesh = new THREE.Mesh(pinGeom, mat);
        const pos = latLngToVec(p.lat, p.lng, RADIUS * 1.02);
        mesh.position.copy(pos);
        mesh.scale.setScalar(highlighted ? 1.8 : 1);
        mesh.userData.pin = p;
        pinRoot.add(mesh);
        pinMeshes.push(mesh);

        const glow = new THREE.Mesh(
          pinGeom,
          new THREE.MeshBasicMaterial({
            color: highlighted ? 0xefb07a : 0xf4a6de,
            transparent: true,
            opacity: 0.28,
          }),
        );
        glow.position.copy(pos);
        glow.scale.setScalar(highlighted ? 3.4 : 2.2);
        glow.userData.pin = p;
        pinRoot.add(glow);
      }
      arcGroup = buildArcs(list, globeGroup);
    }

    function focusPin(id) {
      const p = (pinsRef.current || []).find((x) => x.id === id);
      if (!p) return;
      const dir = latLngToVec(p.lat, p.lng, 1).normalize();
      const dist = Math.max(4.2, camera.position.length() || 5.2);
      camera.position.copy(dir.multiplyScalar(dist));
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.update();
    }

    rebuildPins();
    if (highlightRef.current) focusPin(highlightRef.current);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown = null;
    const onDown = (event) => {
      pointerDown = { x: event.clientX, y: event.clientY };
    };
    const onClick = (event) => {
      if (!pointerDown) return;
      const dx = event.clientX - pointerDown.x;
      const dy = event.clientY - pointerDown.y;
      pointerDown = null;
      if (dx * dx + dy * dy > 25) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pinMeshes, false);
      if (hits[0]?.object?.userData?.pin) {
        clickRef.current?.(hits[0].object.userData.pin);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onClick);

    const setSize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(el);

    let raf = 0;
    const tick = () => {
      controls.autoRotate = !pausedRef.current;
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const api = { rebuildPins, focusPin };
    el._globe = api;

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onClick);
      controls.dispose();
      renderer.dispose();
      el.classList.remove('is-live');
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
    };
  }, []);

  useEffect(() => {
    const api = wrapRef.current?._globe;
    if (!api) return;
    api.rebuildPins();
    if (highlightId) api.focusPin(highlightId);
  }, [pins, highlightId]);

  return (
    <div className="globe-wrap" ref={wrapRef}>
      <div className="fallback" aria-hidden="true">
        <div className="fallback-planet" />
      </div>
    </div>
  );
}
