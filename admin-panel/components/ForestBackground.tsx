'use client'

import { useEffect, useRef } from 'react'

export default function ForestBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (typeof window !== 'undefined') {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    // Particles (fireflies)
    const particles: Array<{
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      opacity: number
      opacityDirection: number
    }> = []

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random(),
        opacityDirection: Math.random() > 0.5 ? 0.01 : -0.01
      })
    }

    // Trees
    const trees: Array<{
      x: number
      height: number
      width: number
      layers: number
    }> = []

    for (let i = 0; i < 30; i++) {
      trees.push({
        x: Math.random() * canvas.width,
        height: Math.random() * 200 + 150,
        width: Math.random() * 60 + 40,
        layers: Math.floor(Math.random() * 2) + 3
      })
    }

    function drawTree(tree: typeof trees[0]) {
      if (!ctx || !canvas) return

      const baseY = canvas.height - 50

      // Trunk
      ctx.fillStyle = '#3a2817'
      ctx.fillRect(tree.x - 10, baseY - tree.height * 0.3, 20, tree.height * 0.3)

      // Tree layers
      for (let i = 0; i < tree.layers; i++) {
        const layerY = baseY - tree.height * 0.3 - (i * tree.height * 0.25)
        const layerWidth = tree.width - (i * 15)
        
        ctx.fillStyle = `hsl(${120 + i * 10}, ${40 + i * 5}%, ${20 + i * 5}%)`
        ctx.beginPath()
        ctx.moveTo(tree.x, layerY - 50)
        ctx.lineTo(tree.x - layerWidth / 2, layerY)
        ctx.lineTo(tree.x + layerWidth / 2, layerY)
        ctx.closePath()
        ctx.fill()
      }
    }

    function animate() {
      if (!ctx || !canvas) return

      // Clear with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, '#0a1f0f')
      gradient.addColorStop(0.5, '#1a3a1f')
      gradient.addColorStop(1, '#0f2a15')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      for (let i = 0; i < 200; i++) {
        const x = (i * 123) % canvas.width
        const y = (i * 456) % (canvas.height * 0.6)
        const size = Math.random() * 2
        ctx.fillRect(x, y, size, size)
      }

      // Draw trees (sorted by x for depth)
      trees.sort((a, b) => a.x - b.x).forEach(tree => drawTree(tree))

      // Draw ground
      ctx.fillStyle = '#0d2410'
      ctx.fillRect(0, canvas.height - 50, canvas.width, 50)

      // Draw and update particles (fireflies)
      particles.forEach(particle => {
        particle.x += particle.speedX
        particle.y += particle.speedY
        particle.opacity += particle.opacityDirection

        if (particle.opacity >= 1 || particle.opacity <= 0) {
          particle.opacityDirection *= -1
        }

        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        ctx.fillStyle = `rgba(255, 235, 59, ${particle.opacity})`
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
      })

      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      if (typeof window !== 'undefined') {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{ background: '#0a1f0f' }}
    />
  )
}
