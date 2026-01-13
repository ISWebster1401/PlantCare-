/**
 * Componente para renderizar modelos 3D .glb usando expo-gl y Three.js
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

interface Model3DViewerProps {
  modelUrl: string;
  style?: any;
  autoRotate?: boolean;
  characterMood?: string;
}

export const Model3DViewer: React.FC<Model3DViewerProps> = ({ 
  modelUrl, 
  style,
  autoRotate = true,
  characterMood
}) => {
  const frameRef = useRef<number | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  
  // Mapeo de character_mood a nombres de animación
  const animationMap: Record<string, string> = {
    'happy': 'Happy',
    'sad': 'Sad',
    'thirsty': 'Sad',
    'overwatered': 'Sick',
    'sick': 'Sick'
  };

  const onContextCreate = async (gl: any) => {
    // Capturar characterMood al momento de crear el contexto
    const currentMood = characterMood;
    try {
      // Crear escena
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf0f0f0);
      sceneRef.current = scene;

      // Configurar cámara
      const camera = new THREE.PerspectiveCamera(
        75,
        gl.drawingBufferWidth / gl.drawingBufferHeight,
        0.1,
        1000
      );
      camera.position.set(0, 0, 3);
      cameraRef.current = camera;

      // Crear renderer
      const renderer = new Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(0xf0f0f0, 1);
      rendererRef.current = renderer;

      // Agregar iluminación
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight1.position.set(5, 5, 5);
      scene.add(directionalLight1);

      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
      directionalLight2.position.set(-5, -5, -5);
      scene.add(directionalLight2);

      // Cargar modelo GLB
      // En React Native, GLTFLoader.load() puede funcionar directamente con URLs
      // ya que usa fetch internamente
      const loader = new GLTFLoader();
      
      console.log(`🔄 Cargando modelo 3D desde: ${modelUrl}`);
      
      loader.load(
        modelUrl,
        (gltf) => {
          console.log('✅ Modelo GLB cargado exitosamente:', gltf);
          // Agregar modelo a la escena
          const model = gltf.scene;
          
          // Calcular bounding box para centrar el modelo
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          // Centrar modelo
          model.position.sub(center);
          
          // Escalar modelo para que quepa en la vista
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = maxDim > 0 ? 2 / maxDim : 1;
          model.scale.multiplyScalar(scale);
          
          scene.add(model);
          modelRef.current = model;

          // Configurar animaciones si existen
          if (gltf.animations && gltf.animations.length > 0) {
            mixerRef.current = new THREE.AnimationMixer(model);
            
            // Si hay characterMood, seleccionar animación específica
            const mood = currentMood;
            if (mood && mixerRef.current) {
              const animationName = animationMap[mood.toLowerCase()] || 'Idle';
              
              // Buscar la animación por nombre (case-insensitive)
              const targetAnimation = gltf.animations.find((clip) => 
                clip.name.toLowerCase() === animationName.toLowerCase()
              );
              
              if (targetAnimation) {
                // Reproducir la animación seleccionada
                const action = mixerRef.current.clipAction(targetAnimation);
                action.play();
                currentActionRef.current = action;
                console.log(`✅ Animación '${animationName}' reproducida para mood '${mood}'`);
              } else {
                // Si no se encuentra la animación, intentar con 'Idle'
                const idleAnimation = gltf.animations.find((clip) => 
                  clip.name.toLowerCase() === 'idle'
                );
                
                if (idleAnimation) {
                  const action = mixerRef.current.clipAction(idleAnimation);
                  action.play();
                  currentActionRef.current = action;
                  console.log(`⚠️ Animación '${animationName}' no encontrada, usando 'Idle'`);
                } else {
                  // Si no hay Idle, reproducir todas las animaciones (fallback)
                  gltf.animations.forEach((clip) => {
                    mixerRef.current?.clipAction(clip).play();
                  });
                  console.log(`⚠️ No se encontró animación específica, reproduciendo todas`);
                }
              }
            } else {
              // Si no hay characterMood, reproducir todas las animaciones (comportamiento original)
              gltf.animations.forEach((clip) => {
                mixerRef.current?.clipAction(clip).play();
              });
            }
          }

          console.log('✅ Modelo 3D cargado exitosamente');
        },
        (progress) => {
          // Progreso de carga (opcional)
          if (progress.total > 0) {
            const percent = (progress.loaded / progress.total) * 100;
            console.log(`Cargando modelo: ${percent.toFixed(0)}%`);
          }
        },
        (error) => {
          console.error('❌ Error cargando modelo 3D:', error);
          console.error('   URL:', modelUrl);
          console.error('   Error completo:', JSON.stringify(error, null, 2));
        }
      );

      // Loop de renderizado
      let lastTime = Date.now();
      const render = () => {
        frameRef.current = requestAnimationFrame(render);

        const now = Date.now();
        const delta = (now - lastTime) / 1000;
        lastTime = now;

        // Actualizar animaciones
        if (mixerRef.current) {
          mixerRef.current.update(delta);
        }

        // Rotar modelo automáticamente si está habilitado
        if (autoRotate && modelRef.current) {
          modelRef.current.rotation.y += delta * 0.5;
        }

        // Renderizar escena
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };

      render();
    } catch (error) {
      console.error('❌ Error inicializando escena 3D:', error);
    }
  };

  useEffect(() => {
    return () => {
      // Limpiar al desmontar
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

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
    backgroundColor: '#f0f0f0',
  },
});
