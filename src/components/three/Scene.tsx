import { useRef, useMemo, useEffect, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Icosahedron, Line, Float, Stars, Sphere } from "@react-three/drei";
import * as THREE from "three";

/* Only render WebGL on the client to avoid SSR crashes. */
function ClientCanvas({ children, ...props }: React.ComponentProps<typeof Canvas>) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <Canvas {...props}>{children}</Canvas>;
}

const BLUE = "#4f8cff";
const CYAN = "#38d0ff";
const DEEP = "#7aa2ff";

function fibonacciSphere(count: number, radius: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const offset = 2 / count;
  const increment = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = i * offset - 1 + offset / 2;
    const r = Math.sqrt(1 - y * y);
    const phi = i * increment;
    pts.push(new THREE.Vector3(Math.cos(phi) * r * radius, y * radius, Math.sin(phi) * r * radius));
  }
  return pts;
}

function NetworkGlobe() {
  const group = useRef<THREE.Group>(null);
  const nodes = useMemo(() => fibonacciSphere(46, 2.1), []);

  const arcs = useMemo(() => {
    const list: THREE.Vector3[][] = [];
    for (let i = 0; i < 14; i++) {
      const a = nodes[Math.floor(Math.random() * nodes.length)];
      const b = nodes[Math.floor(Math.random() * nodes.length)];
      const mid = a.clone().add(b).multiplyScalar(0.5).setLength(2.9);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      list.push(curve.getPoints(24));
    }
    return list;
  }, [nodes]);

  useFrame((_, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.12;
      group.current.rotation.x = Math.sin(Date.now() * 0.0002) * 0.15;
    }
  });

  return (
    <group ref={group}>
      <Icosahedron args={[2.1, 2]}>
        <meshBasicMaterial color={BLUE} wireframe transparent opacity={0.14} />
      </Icosahedron>
      <Icosahedron args={[2.08, 1]}>
        <meshStandardMaterial color="#0e1a33" transparent opacity={0.55} roughness={0.4} metalness={0.6} />
      </Icosahedron>
      {nodes.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshBasicMaterial color={i % 3 === 0 ? CYAN : DEEP} />
        </mesh>
      ))}
      {arcs.map((pts, i) => (
        <Line key={i} points={pts} color={i % 2 ? CYAN : BLUE} lineWidth={1} transparent opacity={0.5} />
      ))}
    </group>
  );
}

function OrbitingCraft({ radius, speed, offset, color }: { radius: number; speed: number; offset: number; color: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset;
    if (ref.current) {
      ref.current.position.set(Math.cos(t) * radius, Math.sin(t * 0.6) * 0.8, Math.sin(t) * radius);
      ref.current.rotation.y = -t;
    }
  });
  return (
    <group ref={ref}>
      <mesh>
        <boxGeometry args={[0.34, 0.16, 0.18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} metalness={0.8} roughness={0.2} />
      </mesh>
      <pointLight color={color} intensity={2} distance={2} />
    </group>
  );
}

function Particles() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(700 * 3);
    for (let i = 0; i < 700; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 24;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    return arr;
  }, []);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.02;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color={DEEP} transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

export function HeroScene() {
  return (
    <ClientCanvas
      camera={{ position: [0, 0, 7], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#0b1220"]} />
      <fog attach="fog" args={["#0b1220", 8, 20]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[6, 6, 6]} intensity={1.4} color={CYAN} />
      <pointLight position={[-6, -4, -4]} intensity={1} color={BLUE} />
      <Stars radius={60} depth={40} count={2200} factor={4} saturation={0} fade speed={1} />
      <Float speed={1.6} rotationIntensity={0.3} floatIntensity={0.6}>
        <NetworkGlobe />
      </Float>
      <OrbitingCraft radius={3.1} speed={0.5} offset={0} color={CYAN} />
      <OrbitingCraft radius={3.6} speed={0.35} offset={2} color={BLUE} />
      <OrbitingCraft radius={2.7} speed={0.62} offset={4} color="#9ec3ff" />
      <Particles />
    </ClientCanvas>
  );
}

function DriftField() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(400 * 3);
    for (let i = 0; i < 400; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 18;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    return arr;
  }, []);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.03;
      ref.current.rotation.x += delta * 0.008;
    }
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color={BLUE} transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

function GlowOrb() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 0.6) * 0.06;
      ref.current.scale.setScalar(s);
    }
  });
  return (
    <Sphere ref={ref} args={[3.4, 32, 32]} position={[6, 2, -6]}>
      <meshBasicMaterial color="#1c3d7a" transparent opacity={0.16} />
    </Sphere>
  );
}

export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 opacity-70">
      <ClientCanvas camera={{ position: [0, 0, 10], fov: 55 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.5} />
        <DriftField />
        <GlowOrb />
      </ClientCanvas>
    </div>
  );
}

export function SceneShell({ children }: { children: ReactNode }) {
  return <div className="relative">{children}</div>;
}
