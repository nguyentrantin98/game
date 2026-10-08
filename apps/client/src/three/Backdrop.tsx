import { useMemo } from 'react';
import * as THREE from 'three';

/** Bầu trời gradient + 3 lớp núi low-poly (parallax tự nhiên nhờ camera phối cảnh). */
export function Backdrop({ width = 160 }: { width?: number }) {
  const sky = useMemo(
    () =>
      new THREE.ShaderMaterial({
        depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color('#2B4A5E') },
          mid: { value: new THREE.Color('#4F7466') },
          bottom: { value: new THREE.Color('#C98A4A') },
        },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec2 vUv;' +
          'void main(){ float t = vUv.y; vec3 c = t < 0.45 ? mix(bottom, mid, smoothstep(0.2,0.45,t)) : mix(mid, top, smoothstep(0.45,1.0,t)); gl_FragColor = vec4(c,1.0); }',
      }),
    [],
  );

  const ridges = useMemo(() => {
    const layers = [
      { z: -40, color: '#24423A', amp: 10, base: 4, seed: 1 },
      { z: -80, color: '#335448', amp: 16, base: 8, seed: 2 },
      { z: -130, color: '#4B6656', amp: 24, base: 12, seed: 3 },
    ];
    return layers.map((l) => {
      const shape = new THREE.Shape();
      const x0 = -150;
      const x1 = width + 150;
      shape.moveTo(x0, -40);
      for (let x = x0; x <= x1; x += 9) {
        const y = l.base + l.amp * (0.5 + 0.5 * Math.sin(x * 0.035 * l.seed + l.seed) * Math.cos(x * 0.013 + l.seed * 2));
        shape.lineTo(x, y + ((x * 7.3 + l.seed * 13) % 3));
      }
      shape.lineTo(x1, -40);
      return { geo: new THREE.ShapeGeometry(shape), ...l };
    });
  }, [width]);

  return (
    <group>
      <mesh position={[width / 2, 10, -200]} material={sky}>
        <planeGeometry args={[1400, 500]} />
      </mesh>
      {ridges.map((r) => (
        <mesh key={r.z} geometry={r.geo} position={[0, 0, r.z]}>
          <meshBasicMaterial color={r.color} fog />
        </mesh>
      ))}
    </group>
  );
}
