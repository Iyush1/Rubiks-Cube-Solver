import { OrthographicCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

const WORLD_HEIGHT = 10;

export default function ResponsiveCamera() {
    const cameraRef = useRef<THREE.OrthographicCamera>(null);
    const { size } = useThree();
  
    useLayoutEffect(() => {
      const camera = cameraRef.current;
  
      if (!camera) {
        return;
      }
  
      camera.zoom = size.height / WORLD_HEIGHT;
      camera.updateProjectionMatrix();
    }, [size.height]);
  
    return (
      <OrthographicCamera
        ref={cameraRef}
        makeDefault
        position={[0, 0, 20]}
        near={0.1}
        far={100}
      />
    );
  }