/**
 * Componente para renderizar modelos 3D .glb usando expo-gl y Three.js.
 * Soporta rotacion manual por gestos tactiles (PanResponder overlay),
 * zoom con pinch, y un entorno realista estilo Pokemon GO con pasto,
 * briznas de hierba, iluminacion calida y cielo.
 * Si falla la carga muestra un placeholder con icono de planta.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ViewStyle, Text, PanResponder } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { Ionicons } from '@expo/vector-icons';
import * as THREE from 'three';
// @ts-ignore - GLTFLoader no tiene tipos completos en React Native
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

interface Model3DViewerProps {
  modelUrl: string;
  style?: ViewStyle;
  autoRotate?: boolean;
  characterMood?: string;
  /** Show the 3D garden environment. Default: true */
  gardenBackground?: boolean;
  /**
   * Códigos de accesorios de la tienda a dibujar sobre el personaje
   * (ej: ['sombrero_paja']). Se generan proceduralmente con geometría de
   * three.js mientras no existan los .glb reales de cada accesorio.
   */
  accessories?: string[];
  /** Called when the 3D model has loaded successfully */
  onLoad?: () => void;
  /** Called when the 3D model fails to load */
  onError?: () => void;
}

interface GLTFResult {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  cameras: THREE.Camera[];
  asset: {
    copyright?: string;
    generator?: string;
    version?: string;
  };
}

// Seeded pseudo-random for consistent look across renders
const seeded = (i: number) => Math.abs(Math.sin(i * 127.1 + 311.7)) % 1;

// ─── Accesorios procedurales de la tienda ────────────────────────────────────
// Se construyen en el espacio LOCAL del modelo (antes del escalado), usando su
// bounding box original como ancla: así heredan la escala y la rotación del
// personaje sin cálculos extra. Cuando existan .glb reales por accesorio, esta
// función se reemplaza por un loader sin tocar el resto del visor.

function _mat(color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, ...extra });
}

function buildAccessoryMesh(
  code: string,
  box: THREE.Box3,
  size: THREE.Vector3,
  center: THREE.Vector3,
): THREE.Group | null {
  const g = new THREE.Group();
  // Radio de referencia de la "cabeza" del personaje
  const r = Math.max(size.x, size.z) / 2;
  const topY = box.max.y;
  const cx = center.x;
  const cz = center.z;

  switch (code) {
    case 'sombrero_paja': {
      const straw = 0xd9a94e;
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.15, r * 1.25, size.y * 0.03, 24), _mat(straw));
      brim.position.set(cx, topY + size.y * 0.015, cz);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.6, size.y * 0.16, 24), _mat(0xc99a3f));
      crown.position.set(cx, topY + size.y * 0.1, cz);
      g.add(brim, crown);
      g.rotation.z = 0.08; // leve inclinación con gracia
      break;
    }
    case 'gorro_fiesta': {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 0.45, size.y * 0.35, 24), _mat(0xe91e63));
      cone.position.set(cx, topY + size.y * 0.17, cz);
      const pompom = new THREE.Mesh(new THREE.SphereGeometry(r * 0.14, 12, 12), _mat(0xffeb3b));
      pompom.position.set(cx, topY + size.y * 0.36, cz);
      g.add(cone, pompom);
      break;
    }
    case 'corona': {
      const gold = _mat(0xffd700, { metalness: 0.6, roughness: 0.3 });
      const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, size.y * 0.1, 16), gold);
      band.position.set(cx, topY + size.y * 0.05, cz);
      g.add(band);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(r * 0.09, size.y * 0.1, 8), gold);
        spike.position.set(cx + Math.cos(a) * r * 0.48, topY + size.y * 0.14, cz + Math.sin(a) * r * 0.48);
        g.add(spike);
      }
      break;
    }
    case 'mono_elegante': {
      const pink = _mat(0xd81b60);
      const l = new THREE.Mesh(new THREE.SphereGeometry(r * 0.28, 14, 14), pink);
      l.scale.set(1.3, 0.7, 0.5);
      l.position.set(cx - r * 0.3, topY + size.y * 0.05, cz);
      const rgt = l.clone();
      rgt.position.set(cx + r * 0.3, topY + size.y * 0.05, cz);
      const knot = new THREE.Mesh(new THREE.SphereGeometry(r * 0.13, 12, 12), _mat(0xad1457));
      knot.position.set(cx, topY + size.y * 0.05, cz);
      g.add(l, rgt, knot);
      break;
    }
    case 'lentes_sol': {
      const dark = _mat(0x1a1a1a, { roughness: 0.25 });
      const faceY = box.min.y + size.y * 0.72;
      const faceZ = box.max.z * 0.92;
      for (const side of [-1, 1]) {
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.22, r * 0.06, 20), dark);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(cx + side * r * 0.3, faceY, faceZ);
        g.add(lens);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(r * 0.2, r * 0.05, r * 0.05), dark);
      bridge.position.set(cx, faceY, faceZ);
      g.add(bridge);
      break;
    }
    case 'bufanda': {
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(r * 0.72, r * 0.17, 12, 24), _mat(0xc62828));
      wrap.rotation.x = Math.PI / 2;
      wrap.position.set(cx, box.min.y + size.y * 0.58, cz);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(r * 0.24, size.y * 0.22, r * 0.08), _mat(0xb71c1c));
      tail.position.set(cx + r * 0.4, box.min.y + size.y * 0.45, box.max.z * 0.8);
      g.add(wrap, tail);
      break;
    }
    default:
      return null;
  }
  return g;
}

// ─── Helper: build a realistic Pokemon GO-style environment ─────────────────
function buildRealisticGarden(scene: THREE.Scene) {
  // ── Layered ground: concentric rings with varying green shades ──
  const groundLayers = [
    { radius: 6.0, color: 0x2f5e1e }, // outermost - dark
    { radius: 5.0, color: 0x3a6f28 },
    { radius: 4.0, color: 0x447a30 },
    { radius: 3.0, color: 0x4e8838 },
    { radius: 2.0, color: 0x569440 },
    { radius: 1.2, color: 0x5a7355 }, // innermost - lighter
  ];

  for (let li = 0; li < groundLayers.length; li++) {
    const layer = groundLayers[li];
    const geo = new THREE.CircleGeometry(layer.radius, 48);
    const mat = new THREE.MeshStandardMaterial({
      color: layer.color,
      roughness: 0.92,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -1.0 + li * 0.002; // slight stacking to avoid z-fight
    scene.add(mesh);
  }

  // ── Shadow disc directly under the model (fake ambient occlusion) ──
  const shadowGeo = new THREE.CircleGeometry(0.6, 24);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.2,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.98;
  scene.add(shadow);

  // ── Grass blades ──
  const grassColors = [0x3a6f28, 0x447a30, 0x4e8838, 0x569440, 0x5a7355, 0x4a8530];
  const grassCount = 70;
  // Reuse a single geometry for all blades
  const bladeGeo = new THREE.PlaneGeometry(0.02, 0.12);

  for (let i = 0; i < grassCount; i++) {
    const angle = seeded(i + 200) * Math.PI * 2;
    const dist = 0.5 + seeded(i + 210) * 4.5;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    const mat = new THREE.MeshStandardMaterial({
      color: grassColors[i % grassColors.length],
      roughness: 0.8,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const blade = new THREE.Mesh(bladeGeo, mat);
    blade.position.set(x, -0.94, z);
    // Random Y rotation so they face all directions
    blade.rotation.y = seeded(i + 220) * Math.PI;
    // Slight tilt for a natural look
    blade.rotation.z = (seeded(i + 230) - 0.5) * 0.4;
    blade.rotation.x = (seeded(i + 240) - 0.5) * 0.15;
    scene.add(blade);
  }

  // ── A few taller grass tufts for variation ──
  const tallGeo = new THREE.PlaneGeometry(0.025, 0.2);
  const tallCount = 20;
  for (let i = 0; i < tallCount; i++) {
    const angle = seeded(i + 300) * Math.PI * 2;
    const dist = 1.0 + seeded(i + 310) * 3.5;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    const mat = new THREE.MeshStandardMaterial({
      color: grassColors[(i + 3) % grassColors.length],
      roughness: 0.75,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const blade = new THREE.Mesh(tallGeo, mat);
    blade.position.set(x, -0.9, z);
    blade.rotation.y = seeded(i + 320) * Math.PI;
    blade.rotation.z = (seeded(i + 330) - 0.5) * 0.3;
    scene.add(blade);
  }
}

// ─── Main component ─────────────────────────────────────────────────────────
export const Model3DViewer: React.FC<Model3DViewerProps> = ({
  modelUrl,
  style,
  autoRotate = true,
  characterMood,
  gardenBackground = true,
  accessories = [],
  onLoad,
  onError,
}) => {
  const [loadError, setLoadError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  onLoadRef.current = onLoad;
  onErrorRef.current = onError;
  // Ref para leer los accesorios vigentes dentro del callback del loader.
  // OJO: el visor arma la escena una sola vez; si cambian los accesorios,
  // el consumidor debe remontar el componente (ej: key={accessories.join()}).
  const accessoriesRef = useRef(accessories);
  accessoriesRef.current = accessories;
  const errorLoggedRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);

  // ── Touch gesture refs ──
  const rotationYRef = useRef(0);
  const rotationXRef = useRef(0);
  const zoomRef = useRef(3);
  const lastTouchDist = useRef<number | null>(null);

  // Mapeo de character_mood a nombres de animacion
  const animationMap: Record<string, string> = {
    happy: 'Happy',
    sad: 'Sad',
    thirsty: 'Sad',
    overwatered: 'Sick',
    sick: 'Sick',
  };

  // ── PanResponder: transparent overlay captures all touch events ──
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !autoRotate,
        onMoveShouldSetPanResponder: () => !autoRotate,
        onPanResponderGrant: () => {
          lastTouchDist.current = null;
        },
        onPanResponderMove: (_evt, gestureState) => {
          const touches = _evt.nativeEvent.touches;

          if (touches && touches.length >= 2) {
            // ── Pinch to zoom ──
            const t0 = touches[0];
            const t1 = touches[1];
            const dx = t0.pageX - t1.pageX;
            const dy = t0.pageY - t1.pageY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (lastTouchDist.current !== null) {
              const delta = dist - lastTouchDist.current;
              zoomRef.current = Math.max(
                1.5,
                Math.min(6.0, zoomRef.current - delta * 0.01),
              );
            }
            lastTouchDist.current = dist;
          } else {
            // ── Single finger: rotate model ──
            lastTouchDist.current = null;
            const sensitivity = 0.006;
            rotationYRef.current += gestureState.dx * sensitivity;
            rotationXRef.current += gestureState.dy * sensitivity;
            // Clamp vertical rotation
            rotationXRef.current = Math.max(
              -Math.PI / 3,
              Math.min(Math.PI / 3, rotationXRef.current),
            );
            // Reset dx/dy so next move is a delta, not accumulated
            gestureState.dx = 0;
            gestureState.dy = 0;
          }
        },
        onPanResponderRelease: () => {
          lastTouchDist.current = null;
        },
      }),
    [autoRotate],
  );

  const onContextCreate = async (gl: any) => {
    const currentMood = characterMood;
    try {
      // ── Scene ──
      const skyColor = gardenBackground ? 0xa8d8ea : 0xf0f0f0;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(skyColor);
      if (gardenBackground) {
        scene.fog = new THREE.Fog(skyColor, 8, 20);
      }
      sceneRef.current = scene;

      // ── Camera ──
      const camera = new THREE.PerspectiveCamera(
        75,
        gl.drawingBufferWidth / gl.drawingBufferHeight,
        0.1,
        1000,
      );
      camera.position.set(0, gardenBackground ? 0.6 : 0, 3);
      if (gardenBackground) {
        camera.lookAt(0, -0.3, 0);
      }
      cameraRef.current = camera;

      // ── Renderer ──
      const renderer = new Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(skyColor, 1);
      rendererRef.current = renderer;

      // ── Lighting ──
      if (gardenBackground) {
        // Warm ambient
        const ambientLight = new THREE.AmbientLight(0xfff8f0, 0.55);
        scene.add(ambientLight);

        // Warm sunlight from upper-right
        const sunLight = new THREE.DirectionalLight(0xfff4e0, 0.9);
        sunLight.position.set(4, 8, 3);
        scene.add(sunLight);

        // Subtle fill from left
        const fillLight = new THREE.DirectionalLight(0xddeeff, 0.25);
        fillLight.position.set(-4, 2, -3);
        scene.add(fillLight);

        // Hemisphere: sky blue top, olive-green bottom
        const hemiLight = new THREE.HemisphereLight(0x99ccff, 0x556b2f, 0.35);
        scene.add(hemiLight);
      } else {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(5, 8, 5);
        scene.add(directionalLight1);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
        directionalLight2.position.set(-5, -3, -5);
        scene.add(directionalLight2);
      }

      // ── Garden environment ──
      if (gardenBackground) {
        buildRealisticGarden(scene);
      }

      // ── Load GLB model ──
      const loader = new GLTFLoader();

      loader.load(
        modelUrl,
        (gltf: GLTFResult) => {
          const model = gltf.scene;

          // Bounding box to center and scale
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          model.position.sub(center);

          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = maxDim > 0 ? 2 / maxDim : 1;
          model.scale.multiplyScalar(scale);

          // Place model on ground
          if (gardenBackground) {
            const scaledBox = new THREE.Box3().setFromObject(model);
            const scaledSize = scaledBox.getSize(new THREE.Vector3());
            model.position.y += scaledSize.y * 0.5 - 1.0;
          }

          // ── Parche de color para modelos sin textura ──
          // Los modelos actuales (meshy.ai, exportados solo con geometría) no
          // traen material ni textura, así que GLTFLoader les asigna un material
          // blanco plano. Mientras no subamos las versiones texturizadas, les
          // aplicamos un verde del design system y calculamos las normales que
          // faltan para que el sombreado no se vea plano. Los modelos que SÍ
          // traigan textura (map) no se tocan, así el reemplazo futuro es directo.
          model.traverse((child: any) => {
            if (child.isMesh && !(child.material && child.material.map)) {
              if (child.geometry && !child.geometry.attributes.normal) {
                child.geometry.computeVertexNormals();
              }
              child.material = new THREE.MeshStandardMaterial({
                color: 0x5a7355,
                roughness: 0.85,
                metalness: 0.0,
              });
            }
          });

          // ── Accesorios equipados (tienda) ──
          // Se agregan como hijos del modelo, construidos con el bounding box
          // ORIGINAL (pre-escala): heredan escala y rotación del personaje.
          for (const code of accessoriesRef.current) {
            const acc = buildAccessoryMesh(code, box, size, center);
            if (acc) model.add(acc);
          }

          scene.add(model);
          modelRef.current = model;
          setIsLoaded(true);
          onLoadRef.current?.();

          // Configure animations
          if (gltf.animations && gltf.animations.length > 0) {
            mixerRef.current = new THREE.AnimationMixer(model);

            const mood = currentMood;
            if (mood && mixerRef.current) {
              const animationName = animationMap[mood.toLowerCase()] || 'Idle';
              const targetAnimation = gltf.animations.find(
                (clip: THREE.AnimationClip) =>
                  clip.name.toLowerCase() === animationName.toLowerCase(),
              );

              if (targetAnimation) {
                const action = mixerRef.current.clipAction(targetAnimation);
                action.play();
                currentActionRef.current = action;
              } else {
                const idleAnimation = gltf.animations.find(
                  (clip: THREE.AnimationClip) =>
                    clip.name.toLowerCase() === 'idle',
                );
                if (idleAnimation) {
                  const action = mixerRef.current.clipAction(idleAnimation);
                  action.play();
                  currentActionRef.current = action;
                } else {
                  gltf.animations.forEach((clip: THREE.AnimationClip) => {
                    mixerRef.current?.clipAction(clip).play();
                  });
                }
              }
            } else {
              gltf.animations.forEach((clip: THREE.AnimationClip) => {
                mixerRef.current?.clipAction(clip).play();
              });
            }
          }
        },
        undefined,
        () => {
          setLoadError(true);
          errorLoggedRef.current = true;
          onErrorRef.current?.();
        },
      );

      // ── Render loop ──
      let lastTime = Date.now();
      const render = () => {
        frameRef.current = requestAnimationFrame(render);

        const now = Date.now();
        const delta = (now - lastTime) / 1000;
        lastTime = now;

        if (mixerRef.current) {
          mixerRef.current.update(delta);
        }

        if (autoRotate) {
          if (modelRef.current) {
            modelRef.current.rotation.y += delta * 0.5;
          }
        } else {
          if (modelRef.current) {
            modelRef.current.rotation.y = rotationYRef.current;
            modelRef.current.rotation.x = rotationXRef.current;
          }
          if (cameraRef.current) {
            cameraRef.current.position.z = zoomRef.current;
          }
        }

        renderer.render(scene, camera);
        gl.endFrameEXP();
      };

      render();
    } catch (error) {
      console.error('Error inicializando escena 3D:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  if (loadError) {
    return (
      <View style={[styles.container, styles.placeholder, style]}>
        <Ionicons name="leaf" size={48} color="#8FA889" />
        <Text style={styles.placeholderText}>Planta</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <GLView
        style={StyleSheet.absoluteFill}
        onContextCreate={onContextCreate}
      />
      {/* Transparent overlay that captures touch events above the GLView */}
      {!autoRotate && (
        <View
          style={styles.touchOverlay}
          {...panResponder.panHandlers}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#a8d8ea',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F0E4',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#4A6146',
  },
  touchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
});
