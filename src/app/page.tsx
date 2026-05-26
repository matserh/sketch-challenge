'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'

// Types
interface JoystickState {
  active: boolean
  angle: number
  distance: number
}

interface ShakeEvent {
  timestamp: number
  intensity: number
}

type ColorMode = 'normal' | 'gradient'

// Gradient color palettes - soft and beautiful
const GRADIENT_PALETTES = [
  ['#FF6B6B', '#4ECDC4', '#45B7D1'], // Coral to Teal
  ['#A8E6CF', '#FFD3B6', '#FFAAA5'], // Soft pastel
  ['#DDA0DD', '#98D8C8', '#F7DC6F'], // Lavender to Mint
  ['#FF9A9E', '#FECFEF', '#FECFEF'], // Pink gradient
  ['#A18CD1', '#FBC2EB', '#FBC2EB'], // Purple to Pink
  ['#FFD89B', '#19547B', '#19547B'], // Warm sunset
  ['#96E6A1', '#D4FC79', '#D4FC79'], // Fresh green
  ['#FDCBF1', '#E6DEE9', '#E6DEE9'], // Soft pink lavender
  ['#84FAB0', '#8FD3F4', '#8FD3F4'], // Mint to Sky
  ['#FA709A', '#FEE140', '#FEE140'], // Warm pink to yellow
]

// Hex to RGB helper function (defined at module level)
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
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
  
  // State
  const [isStarted, setIsStarted] = useState(false)
  const [isLandscape, setIsLandscape] = useState(false)
  const [isErasing, setIsErasing] = useState(false)
  const [dustProgress, setDustProgress] = useState(0)
  const [showDustBar, setShowDustBar] = useState(false)
  const [colorMode, setColorMode] = useState<ColorMode>('normal')
  const [currentColorIndex, setCurrentColorIndex] = useState(0)
  
  // Pen state
  const penRef = useRef({ x: 0, y: 0, lastX: 0, lastY: 0 })
  const velocityRef = useRef({ vxMove: 0, vyMove: 0, vxDraw: 0, vyDraw: 0 })
  const targetVelocityRef = useRef({ vxMove: 0, vyMove: 0, vxDraw: 0, vyDraw: 0 })
  
  // Joystick state
  const moveJoystickRef = useRef<JoystickState>({ active: false, angle: 0, distance: 0 })
  const drawJoystickRef = useRef<JoystickState>({ active: false, angle: 0, distance: 0 })
  
  // Shake detection state
  const shakeEventsRef = useRef<ShakeEvent[]>([])
  const dustProgressRef = useRef(0)
  const decayTimerRef = useRef<NodeJS.Timeout | null>(null)
  const colorModeShakesRef = useRef<ShakeEvent[]>([])
  
  // Gradient animation state
  const gradientTimeRef = useRef(0)
  
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
  
  // Get current stroke color
  const getStrokeColor = useCallback(() => {
    if (colorMode === 'normal') {
      return 'rgba(25, 25, 25, 0.9)'
    }
    
    // Gradient mode - smooth color transitions
    const palette = GRADIENT_PALETTES[currentColorIndex]
    gradientTimeRef.current += 0.02
    const t = gradientTimeRef.current
    
    // Animate through the palette colors
    const colorIndex = Math.floor(t) % palette.length
    const nextColorIndex = (colorIndex + 1) % palette.length
    const blend = t % 1
    
    // Parse colors and blend
    const color1 = hexToRgb(palette[colorIndex])
    const color2 = hexToRgb(palette[nextColorIndex])
    
    if (!color1 || !color2) return 'rgba(25, 25, 25, 0.9)'
    
    const r = Math.round(color1.r + (color2.r - color1.r) * blend)
    const g = Math.round(color1.g + (color2.g - color1.g) * blend)
    const b = Math.round(color1.b + (color2.b - color1.b) * blend)
    
    return `rgba(${r}, ${g}, ${b}, 0.9)`
  }, [colorMode, currentColorIndex])
  
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
    
    ctx.strokeStyle = 'rgba(25, 25, 25, 0.9)'
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
  }, [updatePointer])
  
  // Erase screen
  const eraseScreen = useCallback(() => {
    if (isErasing) return
    
    setIsErasing(true)
    setDustProgress(0)
    dustProgressRef.current = 0
    
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) {
      setIsErasing(false)
      return
    }
    
    let opacity = 0
    const fade = setInterval(() => {
      ctx.fillStyle = 'rgba(196, 196, 196, 0.3)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      opacity += 0.3
      
      if (opacity >= 1.5) {
        clearInterval(fade)
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
  
  // Shake detection for erase (continuous)
  const handleShakeForErase = useCallback((intensity: number) => {
    if (isErasing) return
    
    const now = Date.now()
    
    // Add shake event
    shakeEventsRef.current.push({ timestamp: now, intensity })
    
    // Keep only recent shakes (within 500ms for continuous detection)
    shakeEventsRef.current = shakeEventsRef.current.filter(e => now - e.timestamp < 500)
    
    // Check for continuous shaking (multiple shakes in short time)
    if (shakeEventsRef.current.length >= 3) {
      setShowDustBar(true)
      dustProgressRef.current += 15
      setDustProgress(Math.min(100, dustProgressRef.current))
      
      if (dustProgressRef.current >= 100) {
        eraseScreen()
        shakeEventsRef.current = []
        return
      }
      
      // Reset decay timer
      if (decayTimerRef.current) {
        clearTimeout(decayTimerRef.current)
      }
      
      decayTimerRef.current = setTimeout(() => {
        const decay = setInterval(() => {
          dustProgressRef.current -= 4
          setDustProgress(Math.max(0, dustProgressRef.current))
          
          if (dustProgressRef.current <= 0) {
            clearInterval(decay)
            setShowDustBar(false)
          }
        }, 25)
      }, 300)
    }
  }, [isErasing, eraseScreen])
  
  // Shake detection for color mode (2 shakes with pause)
  const handleShakeForColorMode = useCallback((intensity: number) => {
    const now = Date.now()
    
    // Add shake event
    colorModeShakesRef.current.push({ timestamp: now, intensity })
    
    // Keep only recent shakes (within 2 seconds)
    colorModeShakesRef.current = colorModeShakesRef.current.filter(e => now - e.timestamp < 2000)
    
    // Look for pattern: shake - pause - shake (2 shakes with ~300-1000ms gap)
    const shakes = colorModeShakesRef.current
    
    if (shakes.length >= 2) {
      // Check for two distinct shake groups with a pause between
      for (let i = 1; i < shakes.length; i++) {
        const gap = shakes[i].timestamp - shakes[i - 1].timestamp
        
        // If gap is between 300ms and 1000ms, it's considered a "pause"
        if (gap >= 300 && gap <= 1000) {
          // Toggle color mode
          if (colorMode === 'normal') {
            setColorMode('gradient')
            setCurrentColorIndex(Math.floor(Math.random() * GRADIENT_PALETTES.length))
            gradientTimeRef.current = 0
          } else {
            setColorMode('normal')
          }
          
          // Reset shake events
          colorModeShakesRef.current = []
          break
        }
      }
    }
  }, [colorMode])
  
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
  
  // Device motion handler
  useEffect(() => {
    if (!isStarted) return
    
    const handleDeviceMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity
      if (!acc || acc.x === null) return
      
      if (!lastAccelerationRef.current) {
        lastAccelerationRef.current = { x: acc.x, y: acc.y, z: acc.z || 0 }
        return
      }
      
      const deltaX = Math.abs((acc.x || 0) - lastAccelerationRef.current.x)
      const deltaY = Math.abs((acc.y || 0) - lastAccelerationRef.current.y)
      const deltaZ = Math.abs((acc.z || 0) - lastAccelerationRef.current.z)
      
      const threshold = 15
      const intensity = deltaX + deltaY + deltaZ
      
      if (deltaX > threshold || deltaY > threshold || deltaZ > threshold) {
        // Check for continuous shake (erase) vs pattern shake (color mode)
        handleShakeForErase(intensity)
        handleShakeForColorMode(intensity)
      }
      
      lastAccelerationRef.current = { x: acc.x || 0, y: acc.y || 0, z: acc.z || 0 }
    }
    
    window.addEventListener('devicemotion', handleDeviceMotion)
    return () => window.removeEventListener('devicemotion', handleDeviceMotion)
  }, [isStarted, handleShakeForErase, handleShakeForColorMode])
  
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
        className="relative w-full h-full max-w-[1200px] bg-[#d10a0a] rounded-[4vh] flex flex-col items-center p-[4vh_4vw]"
        style={{
          boxShadow: 'inset 15px 15px 30px rgba(255,255,255,0.2), inset -15px -15px 30px rgba(0,0,0,0.5), 0 20px 50px rgba(0,0,0,0.9)'
        }}
      >
        {/* Instructions */}
        {isStarted && (
          <div className="absolute top-[1.5vh] text-white/80 text-[1.6vh] font-bold tracking-wider z-10 animate-pulse">
            Secouez pour effacer | 2 secousses = couleur
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
              className="absolute w-2 h-2 bg-black rounded-full pointer-events-none z-10"
              style={{
                boxShadow: '0 0 0 2px rgba(255,255,255,0.7)'
              }}
            />
            
            {/* Dust bar */}
            {showDustBar && (
              <div className="absolute top-0 left-0 right-0 h-[6px] bg-black/15 z-50 rounded-t-[1.5vh] overflow-hidden">
                <div
                  className="h-full transition-[width] duration-[60ms]"
                  style={{
                    width: `${dustProgress}%`,
                    background: 'linear-gradient(90deg, #d4af37, #ff6b35, #ff2222)',
                    boxShadow: '0 0 8px rgba(255,100,50,0.6)'
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
        
        {/* Color mode indicator */}
        {colorMode === 'gradient' && isStarted && (
          <div 
            className="absolute top-16 right-4 px-3 py-1 rounded-full text-xs font-bold text-white animate-pulse"
            style={{
              background: `linear-gradient(90deg, ${GRADIENT_PALETTES[currentColorIndex].join(', ')})`,
            }}
          >
            Mode Couleur
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
            
            {/* Draw joystick */}
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
                DESSIN
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
