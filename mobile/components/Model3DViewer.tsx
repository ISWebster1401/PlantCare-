/**
 * Componente para renderizar modelos 3D .glb usando expo-gl y Three.js.
 * Soporta rotación manual por gestos táctiles, zoom con pinch, y
 * un entorno de jardín 3D inmersivo con pasto, arbustos y flores.
 * Si falla la carga (red, etc.), muestra un placeholder con icono de planta.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ViewStyle, Text } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { Ionicons } from '@expo/vector-icons';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import * as THREE from 'three';
// @ts-ignore - GLTFLoader no tiene tipos completos en React Native
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

interface Model3DViewerProps {
  modelUrl: string;
  style?: ViewStyle;
  autoRotate?: boolean;
  characterMood?: string;
  /** Show the 3D garden environment (ground, bushes, flowers). Default: true */
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

// ─── Helper: build the garden environment ───────────────────────────────────
function buildGardenScene(scene: THREE.Scene) {
  // ── Ground plane (grass) ──
  const groundGeo = new THREE.CircleGeometry(5, 32);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x4a8f3c,
    roughness: 0.95,
    metalness: 0,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.0;
  ground.receiveShadow = true;
  scene.add(ground);

  // Darker ring for depth
  const ringGeo = new THREE.RingGeometry(4.5, 6, 32);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x3b6e2c,
    roughness: 1,
    metalness: 0,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -1.01;
  scene.add(ring);

  // ── Dirt patch under model ──
  const dirtGeo = new THREE.CircleGeometry(0.8, 16);
  const dirtMat = new THREE.MeshStandardMaterial({
    color: 0x6d4c2e,
    roughness: 1,
    metalness: 0,
  });
  const dirt = new THREE.Mesh(dirtGeo, dirtMat);
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = -0.99;
  scene.add(dirt);

  // ── Decorative bushes around the model ──
  const bushColors = [0x2d6b22, 0x5ca848, 0x3b7a2e, 0x48953a];
  const trunkColor = 0x5d4037;
  const bushCount = 8;

  // Seeded pseudo-random for consistent look
  const seeded = (i: number) => Math.abs(Math.sin(i * 127.1 + 311.7)) % 1;

  for (let i = 0; i < bushCount; i++) {
    const angle = (i / bushCount) * Math.PI * 2 + seeded(i) * 0.4;
    const radius = 2.5 + seeded(i + 10) * 1.2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const bushScale = 0.25 + seeded(i + 20) * 0.35;

    // Bush crown (cluster of spheres)
    const crownGroup = new THREE.Group();
    const mainGeo = new THREE.DodecahedronGeometry(1, 1);
    const mainMat = new THREE.MeshStandardMaterial({
      color: bushColors[i % bushColors.length],
      roughness: 0.85,
      metalness: 0,
    });
    const mainSphere = new THREE.Mesh(mainGeo, mainMat);
    crownGroup.add(mainSphere);

    // Smaller secondary blob
    const secGeo = new THREE.DodecahedronGeometry(0.65, 1);
    const secMat = new THREE.MeshStandardMaterial({
      color: bushColors[(i + 1) % bushColors.length],
      roughness: 0.85,
      metalness: 0,
    });
    const secSphere = new THREE.Mesh(secGeo, secMat);
    secSphere.position.set(0.4, 0.3, 0.2);
    crownGroup.add(secSphere);

    crownGroup.scale.setScalar(bushScale);
    crownGroup.position.set(x, -1.0 + bushScale * 0.8, z);
    scene.add(crownGroup);

    // Trunk for taller bushes
    if (bushScale > 0.4) {
      const trunkGeo = new THREE.CylinderGeometry(0.04, 0.06, bushScale * 0.6, 6);
      const trunkMat = new THREE.MeshStandardMaterial({
        color: trunkColor,
        roughness: 0.9,
        metalness: 0,
      });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x, -1.0 + bushScale * 0.25, z);
      scene.add(trunk);
    }
  }

  // ── Small flowers scattered on the ground ──
  const flowerColors = [0xff6b9d, 0xffd93d, 0xffffff, 0xff9a56, 0xc471ed];
  const flowerCount = 18;
  for (let i = 0; i < flowerCount; i++) {
    const angle = seeded(i + 50) * Math.PI * 2;
    const radius = 0.8 + seeded(i + 60) * 3.5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const petalGeo = new THREE.SphereGeometry(0.035, 6, 6);
    const petalMat = new THREE.MeshStandardMaterial({
      color: flowerColors[i % flowerColors.length],
      roughness: 0.5,
      metalness: 0.1,
    });
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.position.set(x, -0.97, z);
    scene.add(petal);

    // Flower center
    if (i % 3 === 0) {
      const centerGeo = new THREE.SphereGeometry(0.02, 4, 4);
      const centerMat = new THREE.MeshStandardMaterial({ color: 0xffeb3b });
      const center = new THREE.Mesh(centerGeo, centerMat);
      center.position.set(x, -0.95, z);
      scene.add(center);
    }
  }

  // ── Small rocks ──
  const rockCount = 6;
  for (let i = 0; i < rockCount; i++) {
    const angle = seeded(i + 80) * Math.PI * 2;
    const radius = 1.0 + seeded(i + 90) * 3.0;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const rockScale = 0.06 + seeded(i + 100) * 0.1;

    const rockGeo = new THREE.IcosahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x757575,
      roughness: 0.95,
      metalness: 0,
    });
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.scale.setScalar(rockScale);
    rock.position.set(x, -0.98, z);
    rock.rotation.set(seeded(i + 110) * Math.PI, seeded(i + 120) * Math.PI, 0);
    scene.add(rock);
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
  const rotationYRef = useRef(0);   // accumulated Y rotation (horizontal pan)
  const rotationXRef = useRef(0);   // accumulated X rotation (vertical pan)
  const zoomRef = useRef(3);        // camera Z distance
  const panStartYRef = useRef(0);
  const panStartXRef = useRef(0);
  const pinchStartRef = useRef(3);

  // Mapeo de character_mood a nombres de animación
  const animationMap: Record<string, string> = {
    'happy': 'Happy',
    'sad': 'Sad',
    'thirsty': 'Sad',
    'overwatered': 'Sick',
    'sick': 'Sick',
  };

  // ── Gesture definitions (react-native-gesture-handler v2 API) ──
  const panGesture = Gesture.Pan()
    .onStart(() => {
      panStartYRef.current = rotationYRef.current;
      panStartXRef.current = rotationXRef.current;
    })
    .onUpdate((e) => {
      if (!autoRotate) {
        const sensitivity = 0.005;
        rotationYRef.current = panStartYRef.current + e.translationX * sensitivity;
        rotationXRef.current = panStartXRef.current + e.translationY * sensitivity;
        // Clamp vertical rotation to avoid flipping
        rotationXRef.current = Math.max(
          -Math.PI / 3,
          Math.min(Math.PI / 3, rotationXRef.current),
        );
      }
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      pinchStartRef.current = zoomRef.current;
    })
    .onUpdate((e) => {
      if (!autoRotate) {
        const newZoom = pinchStartRef.current / e.scale;
        zoomRef.current = Math.max(1.5, Math.min(6.0, newZoom));
      }
    });

  const combinedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const onContextCreate = async (gl: any) => {
    const currentMood = characterMood;
    try {
      // ── Scene ──
      const scene = new THREE.Scene();
      const skyColor = gardenBackground ? 0x87ceeb : 0xf0f0f0;
      scene.background = new THREE.Color(skyColor);
      if (gardenBackground) {
        scene.fog = new THREE.Fog(skyColor, 6, 18);
      }
      sceneRef.current = scene;

      // ── Camera ──
      const camera = new THREE.PerspectiveCamera(
        75,
        gl.drawingBufferWidth / gl.drawingBufferHeight,
        0.1,
        1000,
      );
      camera.position.set(0, 0.3, 3);
      if (gardenBackground) {
        camera.lookAt(0, -0.2, 0);
      }
      cameraRef.current = camera;

      // ── Renderer ──
      const renderer = new Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(skyColor, 1);
      rendererRef.current = renderer;

      // ── Lighting ──
      const ambientLight = new THREE.AmbientLight(0xffffff, gardenBackground ? 0.7 : 0.6);
      scene.add(ambientLight);

      const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight1.position.set(5, 8, 5);
      scene.add(directionalLight1);

      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
      directionalLight2.position.set(-5, -3, -5);
      scene.add(directionalLight2);

      if (gardenBackground) {
        // Hemisphere light: sky blue on top, ground green on bottom
        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4a8f3c, 0.4);
        scene.add(hemiLight);
      }

      // ── Garden environment ──
      if (gardenBackground) {
        buildGardenScene(scene);
      }

      // ── Load GLB model ──
      const loader = new GLTFLoader();

      loader.load(
        modelUrl,
        (gltf: GLTFResult) => {
          const model = gltf.scene;

          // Calculate bounding box to center model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          // Center the model
          model.position.sub(center);

          // Scale model to fit view
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = maxDim > 0 ? 2 / maxDim : 1;
          model.scale.multiplyScalar(scale);

          // Lift model so it sits on the ground plane
          if (gardenBackground) {
            const scaledBox = new THREE.Box3().setFromObject(model);
            const scaledSize = scaledBox.getSize(new THREE.Vector3());
            model.position.y += scaledSize.y * 0.5 - 1.0;
          }

          scene.add(model);
          modelRef.current = model;

          // Configure animations if present
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

        // Update animations
        if (mixerRef.current) {
          mixerRef.current.update(delta);
        }

        if (autoRotate) {
          // Auto-rotate mode
          if (modelRef.current) {
            modelRef.current.rotation.y += delta * 0.5;
          }
        } else {
          // Manual touch rotation mode
          if (modelRef.current) {
            modelRef.current.rotation.y = rotationYRef.current;
            modelRef.current.rotation.x = rotationXRef.current;
          }
          // Apply zoom via camera position
          if (cameraRef.current) {
            cameraRef.current.position.z = zoomRef.current;
          }
        }

        // Render scene
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

  // When autoRotate is disabled, wrap with gesture detector for touch controls
  if (!autoRotate) {
    return (
      <View style={[styles.container, style]}>
        <GestureDetector gesture={combinedGesture}>
          <View style={StyleSheet.absoluteFill}>
            <GLView
              style={StyleSheet.absoluteFill}
              onContextCreate={onContextCreate}
            />
          </View>
        </GestureDetector>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <GLView
        style={StyleSheet.absoluteFill}
        onContextCreate={onContextCreate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87ceeb',
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
});
