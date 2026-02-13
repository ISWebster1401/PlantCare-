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

// ─── Helper: build a realistic Pokemon GO-style environment ─────────────────
function buildRealisticGarden(scene: THREE.Scene) {
  // ── Layered ground: concentric rings with varying green shades ──
  const groundLayers = [
    { radius: 6.0, color: 0x2f5e1e }, // outermost - dark
    { radius: 5.0, color: 0x3a6f28 },
    { radius: 4.0, color: 0x447a30 },
    { radius: 3.0, color: 0x4e8838 },
    { radius: 2.0, color: 0x569440 },
    { radius: 1.2, color: 0x5a9e3a }, // innermost - lighter
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
  const grassColors = [0x3a6f28, 0x447a30, 0x4e8838, 0x569440, 0x5a9e3a, 0x4a8530];
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
}) => {
  const [loadError, setLoadError] = useState(false);
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

          scene.add(model);
          modelRef.current = model;

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
        <Ionicons name="leaf" size={48} color="#81C784" />
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
    backgroundColor: '#e8f5e9',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#2e7d32',
  },
  touchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
});
