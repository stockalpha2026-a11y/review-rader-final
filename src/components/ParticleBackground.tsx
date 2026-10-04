import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ParticleBackground() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const scene  = new THREE.Scene()

    // Low angle camera = dramatic 3D perspective like Antigravity
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300)
    camera.position.set(0, 18, 22)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.domElement.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:0'
    ref.current.appendChild(renderer.domElement)

    // Sharper, more visible dot texture
    const tex = (() => {
      const c  = document.createElement('canvas')
      c.width  = c.height = 32
      const cx = c.getContext('2d')!
      // Outer soft ring
      const g = cx.createRadialGradient(16, 16, 0, 16, 16, 16)
      g.addColorStop(0,    'rgba(0,0,0,0.55)')
      g.addColorStop(0.35, 'rgba(0,0,0,0.30)')
      g.addColorStop(0.7,  'rgba(0,0,0,0.08)')
      g.addColorStop(1,    'rgba(0,0,0,0)')
      cx.fillStyle = g
      cx.fillRect(0, 0, 32, 32)
      return new THREE.CanvasTexture(c)
    })()

    // Bigger denser grid
    const GW = 55, GD = 55, SP = 1.05
    const N   = GW * GD
    const pos  = new Float32Array(N * 3)
    const init = new Float32Array(N * 3)

    let i = 0
    for (let x = 0; x < GW; x++) {
      for (let z = 0; z < GD; z++) {
        const px = (x - GW / 2) * SP
        const pz = (z - GD / 2) * SP
        pos[i] = init[i] = px;  i++
        pos[i] = init[i] = 0;   i++
        pos[i] = init[i] = pz;  i++
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))

    const mat = new THREE.PointsMaterial({
      size: 0.38,
      map: tex,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })

    scene.add(new THREE.Points(geo, mat))

    // Mouse
    const mouse2D  = new THREE.Vector2(-999, -999)
    const mouse3D  = new THREE.Vector3()
    const target3D = new THREE.Vector3()
    const plane    = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const ray      = new THREE.Raycaster()
    let onScreen   = false

    const onMove = (e: MouseEvent) => {
      onScreen  = true
      mouse2D.x =  (e.clientX / window.innerWidth)  * 2 - 1
      mouse2D.y = -(e.clientY / window.innerHeight)  * 2 + 1
    }
    const onLeave  = () => { onScreen = false }
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('resize', onResize)

    let raf: number
    const t0 = performance.now()
    let frame = 0
    let paused = false

    const onVisibility = () => { paused = document.hidden }
    document.addEventListener('visibilitychange', onVisibility)

    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (paused) return
      frame++
      const t = (performance.now() - t0) * 0.001

      // Slow dramatic camera drift
      const drift = t * 0.018
      const tx = Math.sin(drift) * 4    + (onScreen ? mouse2D.x * 6  : 0)
      const ty = 18 + Math.cos(drift * 0.5) * 2 + (onScreen ? mouse2D.y * 3  : 0)
      const tz = 22 + Math.sin(drift * 0.3) * 2

      camera.position.x += (tx - camera.position.x) * 0.035
      camera.position.y += (ty - camera.position.y) * 0.035
      camera.position.z += (tz - camera.position.z) * 0.035
      camera.lookAt(0, 0, 0)

      // Mouse → 3D plane
      if (onScreen) {
        ray.setFromCamera(mouse2D, camera)
        ray.ray.intersectPlane(plane, target3D)
      } else {
        target3D.set(0, -999, 0)
      }
      mouse3D.lerp(target3D, 0.07)

      // Particle wave heights — this is the expensive part (thousands of
      // sin/cos calls per frame), so it only runs every other frame.
      // The camera keeps moving smoothly every frame regardless, so this
      // is imperceptible while roughly halving CPU cost during scroll.
      if (frame % 2 === 0) {
        const attr = geo.getAttribute('position') as THREE.BufferAttribute
        const arr  = attr.array as Float32Array

        for (let k = 0; k < N; k++) {
          const idx = k * 3
          const x   = init[idx]
          const z   = init[idx + 2]

          // Bigger wave amplitude — more dramatic
          let y = Math.sin(x * 0.07 + t * 0.35) * Math.cos(z * 0.07 + t * 0.35) * 0.55
          y    += Math.sin(x * 0.025 - t * 0.12) * 0.25
          y    += Math.cos(z * 0.04  + t * 0.18) * 0.15

          // Mouse swell — bigger radius and height
          if (mouse3D.y > -100) {
            const dx   = x - mouse3D.x
            const dz   = z - mouse3D.z
            const dist = Math.sqrt(dx * dx + dz * dz)
            const R    = 28
            if (dist < R) {
              const f = 1 - dist / R
              y += Math.sin(f * Math.PI * 0.5) * 2.2
            }
          }

          arr[idx + 1] = y
        }

        attr.needsUpdate = true
      }

      renderer.render(scene, camera)
    }

    tick()

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      cancelAnimationFrame(raf)
      if (ref.current?.contains(renderer.domElement)) {
        ref.current.removeChild(renderer.domElement)
      }
      geo.dispose(); mat.dispose(); tex.dispose(); renderer.dispose()
    }
  }, [])

  return <div ref={ref} className="pointer-events-none" />
}
