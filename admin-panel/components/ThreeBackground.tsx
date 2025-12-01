'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Stars, Float, PerspectiveCamera } from '@react-three/drei'
import { useMemo, useRef } from 'react'

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -8, 0]} receiveShadow>
      <planeGeometry args={[240, 240]} />
      <meshStandardMaterial color={'#0f2d1c'} roughness={1} metalness={0} />
    </mesh>
  )
}

function Trees() {
  const trees = useMemo(() => Array.from({ length: 26 }).map((_, i) => ({
    x: (Math.random() - 0.5) * 120,
    z: -20 - Math.random() * 60,
    h: 4 + Math.random() * 6,
    r: 0.6 + Math.random() * 0.6,
  })), [])
  return (
    <group position={[0, -8, 0]}>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <mesh castShadow position={[0, t.h * 0.25, 0]}> {/* trunk */}
            <cylinderGeometry args={[t.r * 0.25, t.r * 0.25, t.h * 0.5, 8]} />
            <meshStandardMaterial color={'#4a3628'} roughness={1} />
          </mesh>
          <mesh castShadow position={[0, t.h * 0.75, 0]}> {/* foliage */}
            <coneGeometry args={[t.r * 1.6, t.h * 0.8, 10]} />
            <meshStandardMaterial color={'#1f5a3a'} roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Moon() {
  return (
    <group position={[8, 10, -20]}>
      <mesh>
        <sphereGeometry args={[2.2, 32, 32]} />
        <meshStandardMaterial emissive={'#d9e5ff'} emissiveIntensity={0.45} color={'#e6ecff'} />
      </mesh>
    </group>
  )
}

function Duck({ startX = -30, y = 2.5, z = -12, speed = 3, delay = 0 }: { startX?: number; y?: number; z?: number; speed?: number; delay?: number }) {
  const ref = useRef<any>(null)
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.getElapsedTime() + delay
    const x = startX + ((t * speed) % 80)
    const bob = Math.sin(t * 2) * 0.3
    ref.current.position.set(x, y + bob, z)
    ref.current.rotation.set(0, Math.PI * 1.1, Math.sin(t * 3) * 0.05)
  })
  return (
    <group ref={ref} castShadow>
      {/* body */}
      <mesh>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial color={'#2d3b2f'} />
      </mesh>
      {/* head */}
      <mesh position={[0.55, 0.25, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color={'#2a5a3a'} />
      </mesh>
      {/* beak */}
      <mesh position={[0.9, 0.2, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.12, 0.28, 12]} />
        <meshStandardMaterial color={'#d97706'} />
      </mesh>
      {/* wings */}
      <mesh position={[0.1, 0.15, 0.35]} rotation={[0, 0, Math.PI * 0.1]}>
        <coneGeometry args={[0.18, 0.6, 6]} />
        <meshStandardMaterial color={'#223026'} />
      </mesh>
      <mesh position={[0.1, 0.15, -0.35]} rotation={[0, Math.PI, -Math.PI * 0.1]}>
        <coneGeometry args={[0.18, 0.6, 6]} />
        <meshStandardMaterial color={'#223026'} />
      </mesh>
    </group>
  )
}

function Flock() {
  const ducks = useMemo(() => Array.from({ length: 6 }).map((_, i) => ({
    startX: -30 - Math.random() * 20,
    y: 2 + Math.random() * 1.8,
    z: -10 - Math.random() * 6,
    speed: 2.5 + Math.random() * 1.2,
    delay: Math.random() * 2,
  })), [])
  return (
    <group>
      {ducks.map((d, i) => (
        <Duck key={i} startX={d.startX} y={d.y} z={d.z} speed={d.speed} delay={d.delay} />
      ))}
    </group>
  )
}

export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 -z-10 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-700">
      <Canvas dpr={[1, 2]} shadows gl={{ alpha: true }}>
        {/* Transparent canvas over orange gradient */}
        <fog attach="fog" args={["#0a1b12", 12, 70]} />
        <PerspectiveCamera makeDefault position={[0, 2.2, 10]} fov={55} />

        <ambientLight intensity={0.2} />
        <directionalLight position={[6, 10, 6]} intensity={0.9} castShadow color={'#ffe7cc'} />
        <pointLight position={[-8, 4, -6]} intensity={0.5} color={'#84cc16'} />
        <pointLight position={[8, 3, -8]} intensity={0.45} color={'#60a5fa'} />

        <Stars radius={90} depth={50} count={1000} factor={3.5} saturation={0} fade speed={0.5} />
        <Moon />
        <Ground />
        <Trees />
        <Flock />
      </Canvas>
    </div>
  )
}


