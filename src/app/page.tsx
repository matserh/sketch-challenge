'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'

// Types
interface ShakeEvent {
  timestamp: number
}

type ColorMode = 'normal' | 'gradient'

// HSL to RGB conversion for beautiful gradients
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return {
    r: Math.round(255 * f(0)),
    g: Math.round(255 * f(8)),
    b: Math.round(255 * f(4))
  }
}

export default function EtchASketch() {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef<HTMLDivElement>(null)
  const moveKnobRef = useRef<HTMLDivElement>(null)
  const drawKnobRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const lastAccelerationRef = useRef<{ x: number; y: number; z: number } | null>(null)
  
  // State - COLOR MODE ACTIVATED BY DEFAULT
  const [isStarted, setIsStarted] = useState(false)
  const [isLandscape, setIsLandscape] = useState(false)
  const [isErasing, setIsErasing] = useState(false)
  const [dustProgress, setDustProgress] = useState(0)
  const [showDustBar, setShowDustBar] = useState(false)
  const [colorMode, setColorMode] = useState<ColorMode>('gradient') // ACTIVÉ PAR DÉFAUT
  const [showColorModeIndicator, setShowColorModeIndicator] = useState(false)
  
  // Pen state
  const penRef = useRef({ x: 0, y: 0, lastX: 0, lastY: 0 })
  const velocityRef = useRef({ vxMove: 0, vyMove: 0, vxDraw: 0, vyDraw: 0 })
  const targetVelocityRef = useRef({ vxMove: 0, vyMove: 0, vxDraw: 0, vyDraw: 0 })
  
  // Joystick state
  const moveJoystickRef = useRef({ active: false })
  const drawJoystickRef = useRef({ active: false })
  
  // Shake detection - separate tracking for each feature
  const lastShakeTimeRef = useRef(0)
  const eraseShakeCountRef = useRef(0)
  const colorShakeCountRef = useRef(0)
  const lastColorShakeTimeRef = useRef(0)
  const dustProgressRef = useRef(0)
  const decayTimerRef = useRef<NodeJS.Timeout | null>(null)
  const eraseDecayTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Gradient animation state
  const gradientTimeRef = useRef(0)
  const gradientHueRef = useRef(Math.random() * 360) // Random start
  
  // Color mode ref for immediate access
  const colorModeRef = useRef<ColorMode>('gradient') // ACTIVÉ PAR DÉFAUT
  
  // Check orientation
  useEffect(() => {
    const checkOrientation = () => {
      const landscape = window.innerWidth > window.innerHeight
      setIsLandscape(landscape)
    }
    
    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    return () => window.removeEventListener('resize', checkOrientation)
  }, [])
  
  // Update pointer position
  const updatePointer = useCallback(() => {
    const pointer = pointerRef.current
    if (!pointer) return
    
    pointer.style.left = `${penRef.current.x}px`
    pointer.style.top = `${penRef.current.y}px`
  }, [])
  
  // Get current stroke color with beautiful gradient effect
  const getStrokeColor = useCallback(() => {
    if (colorModeRef.current === 'normal') {
      return 'rgba(25, 25, 25, 0.9)'
    }
    
    // Gradient mode - beautiful flowing colors
    gradientTimeRef.current += 0.02
    gradientHueRef.current = (gradientHueRef.current + 0.8) % 360
    
    const t = gradientTimeRef.current
    const hue1 = gradientHueRef.current
    const hue2 = (hue1 + 60) % 360
    const hue3 = (hue1 + 120) % 360
    
    // Create flowing gradient between three hues
    const phase = t % 3
    let h1: number, h2: number, blend: number
    
    if (phase < 1) {
      h1 = hue1
      h2 = hue2
      blend = phase
    } else if (phase < 2) {
      h1 = hue2
      h2 = hue3
      blend = phase - 1
    } else {
      h1 = hue3
      h2 = hue1
      blend = phase - 2
    }
    
    // Smooth easing
    blend = (Math.sin(blend * Math.PI - Math.PI / 2) + 1) / 2
    
    const color1 = hslToRgb(h1, 75, 55)
    const color2 = hslToRgb(h2, 75, 55)
    
    const r = Math.round(color1.r + (color2.r - color1.r) * blend)
    const g = Math.round(color1.g + (color2.g - color1.g) * blend)
    const b = Math.round(color1.b + (color2.b - color1.b) * blend)
    
    return `rgba(${r}, ${g}, ${b}, 0.9)`
  }, [])
  
  // Initialize canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return
    
    const rect = wrapper.getBoundingClientRect()
    if (rect.width === 0) return
    
    canvas.width = rect.width
    canvas.height = rect.height
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.strokeStyle = getStrokeColor()
    ctx.lineJoin = 'round'
    ctx.lineCap = 'square'
    ctx.lineWidth = 3.5
    
    penRef.current = {
      x: rect.width / 2,
      y: rect.height / 2,
      lastX: rect.width / 2,
      lastY: rect.height / 2
    }
    
    updatePointer()
  }, [updatePointer, getStrokeColor])
  
  // Erase screen
  const eraseScreen = useCallback(() => {
    if (isErasing) return
    
    setIsErasing(true)
    setDustProgress(0)
    dustProgressRef.current = 0
    eraseShakeCountRef.current = 0
    
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) {
      setIsErasing(false)
      return
    }
    
    // Shake animation on the main container
    const toy = canvas.closest('#etch-container')
    if (toy) {
      toy.classList.add('shaking')
    }
    
    let opacity = 0
    const fade = setInterval(() => {
      ctx.fillStyle = 'rgba(196, 196, 196, 0.35)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      opacity += 0.35
      
      if (opacity >= 2) {
        clearInterval(fade)
        if (toy) toy.classList.remove('shaking')
        setIsErasing(false)
        setShowDustBar(false)
        
        // Reset pen position to center after erase
        penRef.current = {
          x: canvas.width / 2,
          y: canvas.height / 2,
          lastX: canvas.width / 2,
          lastY: canvas.height / 2
        }
        updatePointer()
      }
    }, 50)
  }, [isErasing, updatePointer])
  
  // Toggle color mode
  const toggleColorMode = useCallback(() => {
    const newMode = colorModeRef.current === 'normal' ? 'gradient' : 'normal'
    colorModeRef.current = newMode
    setColorMode(newMode)
    
    if (newMode === 'gradient') {
      gradientHueRef.current = Math.random() * 360
      gradientTimeRef.current = 0
    }
    
    // Show indicator
    setShowColorModeIndicator(true)
    setTimeout(() => setShowColorModeIndicator(false), 2000)
    
    // Reset shake tracking
    colorShakeCountRef.current = 0
    lastColorShakeTimeRef.current = 0
  }, [])
  
  // Handle shake detection - SIMPLIFIED AND ROBUST
  const handleShake = useCallback(() => {
    const now = Date.now()
    
    // === ERASE DETECTION (continuous shaking) ===
    // If shakes are close together (< 300ms), count for erase
    if (now - lastShakeTimeRef.current < 300) {
      eraseShakeCountRef.current++
      
      // Show and fill dust bar
      setShowDustBar(true)
      dustProgressRef.current = Math.min(100, eraseShakeCountRef.current * 12)
      setDustProgress(dustProgressRef.current)
      
      // Clear decay timer
      if (eraseDecayTimerRef.current) {
        clearTimeout(eraseDecayTimerRef.current)
        eraseDecayTimerRef.current = null
      }
      
      // Erase when bar is full
      if (dustProgressRef.current >= 100) {
        eraseScreen()
        eraseShakeCountRef.current = 0
        lastShakeTimeRef.current = 0
        return
      }
    } else {
      // Start decay if no shake for 300ms
      if (eraseShakeCountRef.current > 0 && !eraseDecayTimerRef.current) {
        eraseDecayTimerRef.current = setTimeout(() => {
          const decay = setInterval(() => {
            eraseShakeCountRef.current = Math.max(0, eraseShakeCountRef.current - 1)
            dustProgressRef.current = eraseShakeCountRef.current * 12
            setDustProgress(dustProgressRef.current)
            
            if (eraseShakeCountRef.current <= 0) {
              clearInterval(decay)
              setShowDustBar(false)
              eraseDecayTimerRef.current = null
            }
          }, 50)
        }, 400)
      }
    }
    
    // === COLOR MODE DETECTION (2 shakes with pause) ===
    // We need: shake - pause (300-1000ms) - shake
    const timeSinceLastColorShake = now - lastColorShakeTimeRef.current
    
    if (lastColorShakeTimeRef.current === 0) {
      // First shake
      colorShakeCountRef.current = 1
    } else if (timeSinceLastColorShake > 300 && timeSinceLastColorShake < 1500) {
      // Second shake with proper pause - TOGGLE COLOR MODE
      colorShakeCountRef.current++
      
      if (colorShakeCountRef.current >= 2) {
        toggleColorMode()
        colorShakeCountRef.current = 0
        lastColorShakeTimeRef.current = 0
        lastShakeTimeRef.current = now
        return
      }
    } else if (timeSinceLastColorShake > 1500) {
      // Too long, reset
      colorShakeCountRef.current = 1
    }
    
    lastColorShakeTimeRef.current = now
    lastShakeTimeRef.current = now
  }, [eraseScreen, toggleColorMode])
  
  // Game loop
  useEffect(() => {
    if (!isStarted) return
    
    const gameLoop = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) {
        animationRef.current = requestAnimationFrame(gameLoop)
        return
      }
      
      // Smooth velocity interpolation
      velocityRef.current.vxMove += (targetVelocityRef.current.vxMove - velocityRef.current.vxMove) * 0.15
      velocityRef.current.vyMove += (targetVelocityRef.current.vyMove - velocityRef.current.vyMove) * 0.15
      velocityRef.current.vxDraw += (targetVelocityRef.current.vxDraw - velocityRef.current.vxDraw) * 0.20
      velocityRef.current.vyDraw += (targetVelocityRef.current.vyDraw - velocityRef.current.vyDraw) * 0.20
      
      let moved = false
      
      // Movement from move joystick
      if (Math.abs(velocityRef.current.vxMove) > 0.1 || Math.abs(velocityRef.current.vyMove) > 0.1) {
        penRef.current.x += velocityRef.current.vxMove
        penRef.current.y += velocityRef.current.vyMove
        moved = true
        penRef.current.lastX = penRef.current.x
        penRef.current.lastY = penRef.current.y
      }
      
      // Drawing from draw joystick
      if (Math.abs(velocityRef.current.vxDraw) > 0.1 || Math.abs(velocityRef.current.vyDraw) > 0.1) {
        penRef.current.x += velocityRef.current.vxDraw
        penRef.current.y += velocityRef.current.vyDraw
        moved = true
        
        ctx.strokeStyle = getStrokeColor()
        ctx.beginPath()
        ctx.moveTo(penRef.current.lastX, penRef.current.lastY)
        ctx.lineTo(penRef.current.x, penRef.current.y)
        ctx.stroke()
        
        penRef.current.lastX = penRef.current.x
        penRef.current.lastY = penRef.current.y
      }
      
      // Clamp pen position
      if (moved) {
        penRef.current.x = Math.max(0, Math.min(canvas.width, penRef.current.x))
        penRef.current.y = Math.max(0, Math.min(canvas.height, penRef.current.y))
        updatePointer()
      }
      
      animationRef.current = requestAnimationFrame(gameLoop)
    }
    
    animationRef.current = requestAnimationFrame(gameLoop)
    initCanvas()
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isStarted, initCanvas, updatePointer, getStrokeColor])
  
  // Joystick handlers
  const handleJoystickStart = useCallback((type: 'move' | 'draw', e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    const joystick = type === 'move' ? moveJoystickRef.current : drawJoystickRef.current
    joystick.active = true
  }, [])
  
  const handleJoystickMove = useCallback((type: 'move' | 'draw', e: React.TouchEvent | React.MouseEvent) => {
    const joystick = type === 'move' ? moveJoystickRef.current : drawJoystickRef.current
    const knob = type === 'move' ? moveKnobRef.current : drawKnobRef.current
    
    if (!joystick.active || !knob) return
    
    const rect = knob.parentElement?.getBoundingClientRect()
    if (!rect) return
    
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const maxRadius = rect.width / 2.2
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const dx = clientX - centerX
    const dy = clientY - centerY
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxRadius)
    const angle = Math.atan2(dy, dx)
    
    // Update knob visual position
    knob.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`
    
    // Calculate velocity
    const speed = Math.pow(dist / maxRadius, 1.3) * 3.5
    
    if (type === 'move') {
      targetVelocityRef.current.vxMove = Math.cos(angle) * speed
      targetVelocityRef.current.vyMove = Math.sin(angle) * speed
    } else {
      // Draw joystick - only allow horizontal or vertical movement
      if (Math.abs(dx) > Math.abs(dy)) {
        targetVelocityRef.current.vxDraw = Math.sign(dx) * speed
        targetVelocityRef.current.vyDraw = 0
      } else {
        targetVelocityRef.current.vxDraw = 0
        targetVelocityRef.current.vyDraw = Math.sign(dy) * speed
      }
    }
  }, [])
  
  const handleJoystickEnd = useCallback((type: 'move' | 'draw') => {
    const joystick = type === 'move' ? moveJoystickRef.current : drawJoystickRef.current
    const knob = type === 'move' ? moveKnobRef.current : drawKnobRef.current
    
    joystick.active = false
    
    if (knob) {
      knob.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
      knob.style.transform = 'translate(0px, 0px)'
      setTimeout(() => {
        if (knob) knob.style.transition = ''
      }, 600)
    }
    
    if (type === 'move') {
      targetVelocityRef.current.vxMove = 0
      targetVelocityRef.current.vyMove = 0
    } else {
      targetVelocityRef.current.vxDraw = 0
      targetVelocityRef.current.vyDraw = 0
    }
  }, [])
  
  // Device motion handler - SIMPLIFIED
  useEffect(() => {
    if (!isStarted) return
    
    let lastX = 0, lastY = 0, lastZ = 0
    let initialized = false
    
    const handleDeviceMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity
      if (!acc || acc.x === null) return
      
      if (!initialized) {
        lastX = acc.x || 0
        lastY = acc.y || 0
        lastZ = acc.z || 0
        initialized = true
        return
      }
      
      const deltaX = Math.abs((acc.x || 0) - lastX)
      const deltaY = Math.abs((acc.y || 0) - lastY)
      const deltaZ = Math.abs((acc.z || 0) - lastZ)
      
      // Lower threshold for better detection
      const threshold = 12
      
      if (deltaX > threshold || deltaY > threshold || deltaZ > threshold) {
        handleShake()
      }
      
      lastX = acc.x || 0
      lastY = acc.y || 0
      lastZ = acc.z || 0
    }
    
    window.addEventListener('devicemotion', handleDeviceMotion)
    return () => window.removeEventListener('devicemotion', handleDeviceMotion)
  }, [isStarted, handleShake])
  
  // Double tap to erase
  useEffect(() => {
    if (!isStarted) return
    
    let lastTap = 0
    
    const handleDoubleTap = () => {
      const now = Date.now()
      if (now - lastTap < 300) {
        eraseScreen()
      }
      lastTap = now
    }
    
    const canvas = canvasRef.current
    canvas?.addEventListener('dblclick', handleDoubleTap)
    
    return () => {
      canvas?.removeEventListener('dblclick', handleDoubleTap)
    }
  }, [isStarted, eraseScreen])
  
  // Request device motion permission (iOS)
  const requestMotionPermission = async () => {
    if (typeof DeviceMotionEvent !== 'undefined' && 
        typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission()
        return permission === 'granted'
      } catch {
        return false
      }
    }
    return true
  }
  
  // Handle start button
  const handleStart = async () => {
    try {
      const elem = document.documentElement
      if (elem.requestFullscreen) {
        await elem.requestFullscreen()
      }
    } catch {
      // Fullscreen not available
    }
    
    await requestMotionPermission()
    setIsStarted(true)
    
    // Show initial color mode indicator
    setShowColorModeIndicator(true)
    setTimeout(() => setShowColorModeIndicator(false), 2000)
    
    // Initialize canvas after state update
    setTimeout(() => {
      initCanvas()
    }, 100)
  }
  
  // Window resize handler
  useEffect(() => {
    if (!isStarted) return
    
    const handleResize = () => {
      setTimeout(initCanvas, 100)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isStarted, initCanvas])
  
  return (
    <div className="fixed inset-0 bg-[#080808] flex justify-center items-center overflow-hidden touch-none select-none">
      {/* Shake animation styles */}
      <style jsx global>{`
        @keyframes shakeFast {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          20%, 60% { transform: translate(-15px, 8px) rotate(-1deg); }
          40%, 80% { transform: translate(15px, -8px) rotate(1deg); }
        }
        .shaking {
          animation: shakeFast 0.6s ease-in-out !important;
        }
      `}</style>
      
      {/* Orientation overlay */}
      {!isLandscape && (
        <div className="absolute inset-0 bg-black/98 text-white z-[99999] flex flex-col justify-center items-center text-center p-5">
          <svg className="w-20 h-20 mb-4 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16,1H8C6.34,1 5,2.34 5,4V20C5,21.66 6.34,23 8,23H16C17.66,23 19,21.66 19,20V4C19,2.34 17.66,1 16,1M17,19H7V5H17V19Z"/>
          </svg>
          <h2 className="text-xl font-bold">Mode Paysage Requis</h2>
          <p className="text-sm mt-2 opacity-70">Tournez votre appareil pour jouer</p>
        </div>
      )}
      
      {/* Main Etch-A-Sketch */}
      <div 
        id="etch-container"
        className="relative w-full h-full max-w-[1200px] bg-[#d10a0a] rounded-[4vh] flex flex-col items-center p-[4vh_4vw]"
        style={{
          boxShadow: 'inset 15px 15px 30px rgba(255,255,255,0.2), inset -15px -15px 30px rgba(0,0,0,0.5), 0 20px 50px rgba(0,0,0,0.9)'
        }}
      >
        {/* Instructions */}
        {isStarted && (
          <div className="absolute top-[1.5vh] left-1/2 -translate-x-1/2 text-white/90 text-[1.4vh] font-bold tracking-wider z-10 text-center whitespace-nowrap bg-black/30 px-4 py-1 rounded-full">
            <span className="text-yellow-300">Secouez vite</span> = Effacer | <span className="text-cyan-300">Secouez 2x avec pause</span> = Couleur
          </div>
        )}
        
        {/* Color mode indicator - large and visible */}
        {showColorModeIndicator && (
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] px-8 py-4 rounded-2xl text-xl font-bold text-white"
            style={{
              background: colorMode === 'gradient' 
                ? 'linear-gradient(135deg, #FF6B6B, #4ECDC4, #45B7D1, #A8E6CF, #FFD3B6)'
                : 'rgba(50,50,50,0.9)',
              boxShadow: '0 0 40px rgba(255,255,255,0.4)',
              animation: 'pulse 0.5s ease-in-out 3'
            }}
          >
            {colorMode === 'gradient' ? '🌈 Mode Couleur Activé !' : '⚫ Mode Normal'}
          </div>
        )}
        
        {/* Screen bezel */}
        <div 
          ref={wrapperRef}
          className="relative w-[90%] h-[68%] bg-[#d4d4d4] rounded-[2.5vh] p-[1.5vh]"
          style={{
            boxShadow: 'inset 6px 6px 18px rgba(0,0,0,0.5), inset -6px -6px 18px rgba(255,255,255,0.9)'
          }}
        >
          {/* Canvas wrapper */}
          <div 
            className="relative w-full h-full rounded-[1.5vh] overflow-hidden"
            style={{
              boxShadow: 'inset 3px 3px 10px rgba(0,0,0,0.4)'
            }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
              style={{
                backgroundColor: '#c4c4c4',
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E")`
              }}
            />
            
            {/* Pointer */}
            <div
              ref={pointerRef}
              className="absolute w-2 h-2 rounded-full pointer-events-none z-10"
              style={{
                backgroundColor: colorMode === 'gradient' ? '#FF6B6B' : 'black',
                boxShadow: colorMode === 'gradient' 
                  ? '0 0 15px #FF6B6B, 0 0 25px #4ECDC4, 0 0 35px #45B7D1' 
                  : '0 0 0 2px rgba(255,255,255,0.7)'
              }}
            />
            
            {/* Dust bar for erase */}
            {showDustBar && (
              <div className="absolute top-0 left-0 right-0 h-[10px] bg-black/30 z-50 rounded-t-[1.5vh] overflow-hidden">
                <div
                  className="h-full transition-[width] duration-[30ms]"
                  style={{
                    width: `${dustProgress}%`,
                    background: 'linear-gradient(90deg, #d4af37, #ff6b35, #ff2222)',
                    boxShadow: '0 0 20px rgba(255,100,50,0.8)'
                  }}
                />
              </div>
            )}
            
            {/* Start button */}
            {!isStarted && isLandscape && (
              <div className="absolute inset-0 z-[10000] flex flex-col justify-center items-center pointer-events-none">
                <button
                  onClick={handleStart}
                  className="bg-[#d4af37] text-black border-[3px] border-white px-[5vw] py-[2.5vh] text-[2.5vh] font-bold rounded-full cursor-pointer uppercase tracking-wider pointer-events-auto"
                  style={{
                    boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
                  }}
                >
                  À toi de jouer !
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Logo area */}
        <div className="flex-grow flex justify-center items-center relative">
          <div 
            className="text-[#d4af37] text-[4vh] italic font-bold tracking-wider"
            style={{
              fontFamily: 'Georgia, serif',
              textShadow: '2px 2px 3px rgba(0,0,0,0.7), -1px -1px 0 rgba(255,255,255,0.3)'
            }}
          >
            Sketch Challenge
          </div>
          <div className="absolute -bottom-[2.5vh] text-white/50 text-[1.5vh] tracking-widest uppercase">
            Designed by <span className="text-[#d4af37]">Aaron</span>
          </div>
        </div>
        
        {/* Color mode badge - always visible when in gradient mode */}
        {colorMode === 'gradient' && isStarted && (
          <div 
            className="absolute top-16 right-4 px-4 py-2 rounded-full text-sm font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #FF6B6B, #4ECDC4, #45B7D1)',
              boxShadow: '0 0 15px rgba(78,205,196,0.5)'
            }}
          >
            🌈 Couleur
          </div>
        )}
        
        {/* Joysticks */}
        {isStarted && (
          <>
            {/* Move joystick */}
            <div
              className="absolute bottom-[3vh] left-[4vw] w-[18vh] h-[18vh] min-w-[100px] min-h-[100px] max-w-[150px] max-h-[150px] rounded-full bg-black/10 flex justify-center items-center"
              style={{
                boxShadow: 'inset 4px 4px 12px rgba(0,0,0,0.4)'
              }}
              onTouchStart={(e) => handleJoystickStart('move', e)}
              onTouchMove={(e) => handleJoystickMove('move', e)}
              onTouchEnd={() => handleJoystickEnd('move')}
              onMouseDown={(e) => handleJoystickStart('move', e)}
              onMouseMove={(e) => moveJoystickRef.current.active && handleJoystickMove('move', e)}
              onMouseUp={() => handleJoystickEnd('move')}
              onMouseLeave={() => handleJoystickEnd('move')}
            >
              <div
                ref={moveKnobRef}
                className="w-[65%] h-[65%] rounded-full flex justify-center items-center cursor-grab active:cursor-grabbing"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, #ffffff, #e0e0e0)',
                  boxShadow: '-3px -3px 8px rgba(255,255,255,0.9), 5px 5px 15px rgba(0,0,0,0.4)'
                }}
              >
                <div 
                  className="w-[35%] h-[35%] rounded-full bg-[#d0d0d0]"
                  style={{ boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.3)' }}
                />
              </div>
              <div className="absolute -bottom-[4vh] text-white text-[1.5vh] font-bold whitespace-nowrap" style={{ textShadow: '1px 1px 3px #000' }}>
                POSITION
              </div>
            </div>
            
            {/* Draw joystick - with gradient in color mode */}
            <div
              className="absolute bottom-[3vh] right-[4vw] w-[18vh] h-[18vh] min-w-[100px] min-h-[100px] max-w-[150px] max-h-[150px] rounded-full bg-black/10 flex justify-center items-center"
              style={{
                boxShadow: 'inset 4px 4px 12px rgba(0,0,0,0.4)'
              }}
              onTouchStart={(e) => handleJoystickStart('draw', e)}
              onTouchMove={(e) => handleJoystickMove('draw', e)}
              onTouchEnd={() => handleJoystickEnd('draw')}
              onMouseDown={(e) => handleJoystickStart('draw', e)}
              onMouseMove={(e) => drawJoystickRef.current.active && handleJoystickMove('draw', e)}
              onMouseUp={() => handleJoystickEnd('draw')}
              onMouseLeave={() => handleJoystickEnd('draw')}
            >
              <div
                ref={drawKnobRef}
                className="w-[65%] h-[65%] rounded-full flex justify-center items-center cursor-grab active:cursor-grabbing"
                style={{
                  background: colorMode === 'gradient'
                    ? 'linear-gradient(135deg, #FF6B6B, #4ECDC4, #45B7D1)'
                    : 'radial-gradient(circle at 30% 30%, #ffffff, #e0e0e0)',
                  boxShadow: colorMode === 'gradient'
                    ? '-3px -3px 8px rgba(255,255,255,0.9), 5px 5px 15px rgba(0,0,0,0.4), 0 0 20px rgba(78,205,196,0.5)'
                    : '-3px -3px 8px rgba(255,255,255,0.9), 5px 5px 15px rgba(0,0,0,0.4)'
                }}
              >
                <div 
                  className="w-[35%] h-[35%] rounded-full"
                  style={{ 
                    background: colorMode === 'gradient' ? 'rgba(255,255,255,0.6)' : '#d0d0d0',
                    boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.3)' 
                  }}
                />
              </div>
              <div className="absolute -bottom-[4vh] text-white text-[1.5vh] font-bold whitespace-nowrap" style={{ textShadow: '1px 1px 3px #000' }}>
                DESSIN
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
