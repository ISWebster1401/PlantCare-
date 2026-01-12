/**
 * Componente para renderizar modelos 3D .glb usando Three.js en React web
 */
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
// Usar importación estática con ruta completa para evitar problemas de webpack
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import './Model3DViewer.css';

interface Model3DViewerProps {
  modelUrl: string;
  className?: string;
  autoRotate?: boolean;
  style?: React.CSSProperties;
  characterMood?: string;
}

export const Model3DViewer: React.FC<Model3DViewerProps> = ({ 
  modelUrl, 
  className = '',
  autoRotate = true,
  style,
  characterMood
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);

  // Mapeo de character_mood a nombres de animación
  const animationMap: Record<string, string> = {
    'happy': 'Happy',
    'sad': 'Sad',
    'thirsty': 'Sad',
    'overwatered': 'Sick',
    'sick': 'Sick'
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Crear escena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Configurar cámara
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    // Crear renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0xf0f0f0, 1);
    container.appendChild(renderer.domElement);
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
    const loader = new GLTFLoader();
    
    loader.load(
      modelUrl,
      (gltf) => {
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
          if (characterMood && mixerRef.current) {
            const animationName = animationMap[characterMood.toLowerCase()] || 'Idle';
            
            // Buscar la animación por nombre (case-insensitive)
            const targetAnimation = gltf.animations.find((clip) => 
              clip.name.toLowerCase() === animationName.toLowerCase()
            );
            
            if (targetAnimation) {
              // Detener acción anterior si existe
              if (currentActionRef.current) {
                currentActionRef.current.stop();
              }
              
              // Reproducir la animación seleccionada
              const action = mixerRef.current.clipAction(targetAnimation);
              action.play();
              currentActionRef.current = action;
              console.log(`✅ Animación '${animationName}' reproducida para mood '${characterMood}'`);
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
      }
    );

    // Loop de renderizado
    let lastTime = Date.now();
    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);

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
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    render();

    // Manejar resize
    const handleResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      
      cameraRef.current.aspect = container.clientWidth / container.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      const renderer = rendererRef.current;
      
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (renderer && container && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
        renderer.dispose();
      }
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
    };
  }, [modelUrl, autoRotate, characterMood]);

  return (
    <div 
      ref={containerRef} 
      className={`model-3d-viewer ${className}`}
      style={style}
    />
  );
};
