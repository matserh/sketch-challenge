'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type ColorMode = 'normal' | 'gradient'
type GameMode = 'draw' | 'eraser'

interface User {
  id: string
  name: string
  email: string
}

// HSL to RGB
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return { r: Math.round(255 * f(0)), g: Math.round(255 * f(8)), b: Math.round(255 * f(4)) }
}

export default function EtchASketch() {
  const router = useRouter()
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef<HTMLDivElement>(null)
  const moveKnobRef = useRef<HTMLDivElement>(null)
  const drawKnobRef = useRef<HTMLDivElement>(null)
  const toyRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  
  // State
  const [isStarted, setIsStarted] = useState(false)
  const [isLandscape, setIsLandscape] = useState(false)
  const [isErasing, setIsErasing] = useState(false)
  const [dustProgress, setDustProgress] = useState(0)
  const [showDustBar, setShowDustBar] = useState(false)
  const [colorMode, setColorMode] = useState<ColorMode>('gradient')
  const [gameMode, setGameMode] = useState<GameMode>('draw')
  const [showMenu, setShowMenu] = useState(false)
  
  // Auth state
  const [user, setUser] = useState<User | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authForm, setAuthForm] = useState({ email: '', name: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  
  // Save state
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const [savePublic, setSavePublic] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  
  // Pen refs
  const penX = useRef(0)
  const penY = useRef(0)
  const lastPenX = useRef(0)
  const lastPenY = useRef(0)
  
  const vxMove = useRef(0)
  const vyMove = useRef(0)
  const vxDraw = useRef(0)
  const vyDraw = useRef(0)
  
  const targetVxMove = useRef(0)
  const targetVyMove = useRef(0)
  const targetVxDraw = useRef(0)
  const targetVyDraw = useRef(0)
  
  // Eraser refs
  const eraserX = useRef(0)
  const eraserY = useRef(0)
  const eraserRadius = useRef(25)
  const lastEraserX = useRef(0)
  const lastEraserY = useRef(0)
  
  // Shake detection
  const lastAccel = useRef({ x: 0, y: 0, z: 0 })
  const shakeCount = useRef(0)
  const lastShakeTime = useRef(0)
  const shakeDecayTimer = useRef<NodeJS.Timeout | null>(null)
  
  // Color toggle
  const colorShakeCount = useRef(0)
  const lastColorShakeTime = useRef(0)
  
  // Gradient
  const gradientHue = useRef(Math.random() * 360)
  const colorModeRef = useRef<ColorMode>('gradient')
  const gameModeRef = useRef<GameMode>('draw')
  
  // Canvas tracking
  const canvasInitialized = useRef(false)
  const lastCanvasSize = useRef({ width: 0, height: 0 })
  
  // Fetch user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        setUser(data.user)
      } catch {
        setUser(null)
      }
    }
    fetchUser()
  }, [])
  
  // Orientation
  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  
  // Update pointer
  const updatePointer = useCallback(() => {
    const p = pointerRef.current
    if (p) {
      const x = gameModeRef.current === 'eraser' ? eraserX.current : penX.current
      const y = gameModeRef.current === 'eraser' ? eraserY.current : penY.current
      p.style.left = `${x}px`
      p.style.top = `${y}px`
      
      if (gameModeRef.current === 'eraser') {
        p.style.width = `${eraserRadius.current * 2}px`
        p.style.height = `${eraserRadius.current * 2}px`
        p.style.background = 'rgba(255,255,255,0.5)'
        p.style.border = '2px solid rgba(0,0,0,0.5)'
      } else {
        p.style.width = '8px'
        p.style.height = '8px'
        p.style.background = colorModeRef.current === 'gradient' ? '#FF6B6B' : 'black'
        p.style.border = ''
      }
    }
  }, [])
  
  // Get stroke color
  const getStrokeColor = useCallback(() => {
    if (colorModeRef.current === 'normal') return 'rgba(25, 25, 25, 0.9)'
    gradientHue.current = (gradientHue.current + 1) % 360
    const c = hslToRgb(gradientHue.current, 70, 55)
    return `rgba(${c.r}, ${c.g}, ${c.b}, 0.9)`
  }, [])
  
  // Init canvas
  const initCanvas = useCallback((forceResize = false) => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return
    
    const rect = wrapper.getBoundingClientRect()
    if (rect.width === 0) return
    
    const needsResize = forceResize || 
      lastCanvasSize.current.width !== rect.width || 
      lastCanvasSize.current.height !== rect.height
    
    if (needsResize) {
      // Save existing drawing before resize
      let imageData: string | null = null
      const ctx = canvas.getContext('2d')
      if (canvas.width > 0 && canvas.height > 0) {
        imageData = canvas.toDataURL()
      }
      
      canvas.width = rect.width
      canvas.height = rect.height
      lastCanvasSize.current = { width: rect.width, height: rect.height }
      
      if (ctx) {
        ctx.strokeStyle = 'rgba(25, 25, 25, 0.9)'
        ctx.lineJoin = 'round'
        ctx.lineCap = 'square'
        ctx.lineWidth = 3.5
        
        // Restore drawing if we had one
        if (imageData) {
          const img = new Image()
          img.onload = () => {
            ctx.drawImage(img, 0, 0)
          }
          img.src = imageData
        }
      }
    }
    
    if (!canvasInitialized.current) {
      penX.current = rect.width / 2
      penY.current = rect.height / 2
      lastPenX.current = penX.current
      lastPenY.current = penY.current
      
      eraserX.current = rect.width / 2
      eraserY.current = rect.height / 2
      lastEraserX.current = eraserX.current
      lastEraserY.current = eraserY.current
      
      canvasInitialized.current = true
    }
    
    updatePointer()
  }, [updatePointer])
  
  // Erase screen
  const eraseScreen = useCallback(() => {
    if (isErasing) return
    setIsErasing(true)
    setDustProgress(0)
    shakeCount.current = 0
    
    const canvas = canvasRef.current
    const toy = toyRef.current
    const ctx = canvas?.getContext('2d')
    
    if (!canvas || !ctx) {
      setIsErasing(false)
      return
    }
    
    if (toy) toy.classList.add('shaking')
    
    let opacity = 0
    const fade = setInterval(() => {
      ctx.fillStyle = 'rgba(196, 196, 196, 0.3)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      opacity += 0.3
      if (opacity >= 1.5) {
        clearInterval(fade)
        if (toy) toy.classList.remove('shaking')
        setIsErasing(false)
        setShowDustBar(false)
        penX.current = canvas.width / 2
        penY.current = canvas.height / 2
        lastPenX.current = penX.current
        lastPenY.current = penY.current
        updatePointer()
      }
    }, 50)
  }, [isErasing, updatePointer])
  
  // Erase part
  const erasePart = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, eraserRadius.current, 0, Math.PI * 2)
    ctx.fillStyle = '#c4c4c4'
    ctx.fill()
    ctx.restore()
  }, [])
  
  // Toggle color mode
  const toggleColorMode = useCallback(() => {
    const newMode = colorModeRef.current === 'normal' ? 'gradient' : 'normal'
    colorModeRef.current = newMode
    setColorMode(newMode)
    colorShakeCount.current = 0
    lastColorShakeTime.current = 0
  }, [])
  
  // Toggle eraser mode
  const toggleEraserMode = useCallback(() => {
    const newMode = gameModeRef.current === 'draw' ? 'eraser' : 'draw'
    gameModeRef.current = newMode
    setGameMode(newMode)
    
    if (newMode === 'eraser') {
      const canvas = canvasRef.current
      if (canvas) {
        eraserX.current = canvas.width / 2
        eraserY.current = canvas.height / 2
      }
    }
    
    updatePointer()
  }, [updatePointer])
  
  // Exit eraser mode
  const exitEraserMode = useCallback(() => {
    gameModeRef.current = 'draw'
    setGameMode('draw')
    updatePointer()
  }, [updatePointer])
  
  // Handle shake
  const onShakeDetected = useCallback(() => {
    if (isErasing) return
    
    const now = Date.now()
    
    if (gameModeRef.current === 'eraser') {
      exitEraserMode()
      return
    }
    
    if (now - lastShakeTime.current < 250) {
      shakeCount.current++
    } else {
      shakeCount.current = Math.max(1, shakeCount.current - 2)
    }
    lastShakeTime.current = now
    
    setShowDustBar(true)
    const progress = Math.min(100, shakeCount.current * 10)
    setDustProgress(progress)
    
    if (progress >= 100) {
      eraseScreen()
      return
    }
    
    if (shakeDecayTimer.current) clearTimeout(shakeDecayTimer.current)
    shakeDecayTimer.current = setTimeout(() => {
      const decay = setInterval(() => {
        shakeCount.current = Math.max(0, shakeCount.current - 1)
        const p = shakeCount.current * 10
        setDustProgress(p)
        if (shakeCount.current <= 0) {
          clearInterval(decay)
          setShowDustBar(false)
        }
      }, 50)
    }, 300)
    
    const timeSinceColor = now - lastColorShakeTime.current
    if (lastColorShakeTime.current === 0 || timeSinceColor > 1200) {
      colorShakeCount.current = 1
    } else if (timeSinceColor >= 300 && timeSinceColor <= 800) {
      colorShakeCount.current++
      if (colorShakeCount.current >= 2) {
        toggleColorMode()
      }
    }
    lastColorShakeTime.current = now
  }, [isErasing, eraseScreen, exitEraserMode, toggleColorMode])
  
  // Game loop
  useEffect(() => {
    if (!isStarted) return
    
    const gameLoop = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas) {
        rafRef.current = requestAnimationFrame(gameLoop)
        return
      }
      
      vxMove.current += (targetVxMove.current - vxMove.current) * 0.15
      vyMove.current += (targetVyMove.current - vyMove.current) * 0.15
      vxDraw.current += (targetVxDraw.current - vxDraw.current) * 0.20
      vyDraw.current += (targetVyDraw.current - vyDraw.current) * 0.20
      
      if (gameModeRef.current === 'eraser') {
        if (Math.abs(vxMove.current) > 0.1 || Math.abs(vyMove.current) > 0.1) {
          eraserX.current += vxMove.current
          eraserY.current += vyMove.current
          eraserX.current = Math.max(eraserRadius.current, Math.min(canvas.width - eraserRadius.current, eraserX.current))
          eraserY.current = Math.max(eraserRadius.current, Math.min(canvas.height - eraserRadius.current, eraserY.current))
          updatePointer()
        }
        
        if (Math.abs(vxDraw.current) > 0.5 || Math.abs(vyDraw.current) > 0.5) {
          eraserX.current += vxDraw.current * 0.5
          eraserY.current += vyDraw.current * 0.5
          eraserX.current = Math.max(eraserRadius.current, Math.min(canvas.width - eraserRadius.current, eraserX.current))
          eraserY.current = Math.max(eraserRadius.current, Math.min(canvas.height - eraserRadius.current, eraserY.current))
          
          erasePart(eraserX.current, eraserY.current)
          updatePointer()
        }
        
        rafRef.current = requestAnimationFrame(gameLoop)
        return
      }
      
      let moved = false
      
      if (Math.abs(vxMove.current) > 0.1 || Math.abs(vyMove.current) > 0.1) {
        penX.current += vxMove.current
        penY.current += vyMove.current
        moved = true
        lastPenX.current = penX.current
        lastPenY.current = penY.current
      }
      
      if (Math.abs(vxDraw.current) > 0.1 || Math.abs(vyDraw.current) > 0.1) {
        penX.current += vxDraw.current
        penY.current += vyDraw.current
        moved = true
        
        ctx.strokeStyle = getStrokeColor()
        ctx.beginPath()
        ctx.moveTo(lastPenX.current, lastPenY.current)
        ctx.lineTo(penX.current, penY.current)
        ctx.stroke()
        
        lastPenX.current = penX.current
        lastPenY.current = penY.current
      }
      
      if (moved) {
        penX.current = Math.max(0, Math.min(canvas.width, penX.current))
        penY.current = Math.max(0, Math.min(canvas.height, penY.current))
        updatePointer()
      }
      
      rafRef.current = requestAnimationFrame(gameLoop)
    }
    
    rafRef.current = requestAnimationFrame(gameLoop)
    if (!canvasInitialized.current) {
      initCanvas()
    }
    
    return () => cancelAnimationFrame(rafRef.current)
  }, [isStarted, initCanvas, updatePointer, getStrokeColor, erasePart])
  
  // Joystick handlers
  const createJoystickHandlers = useCallback((type: 'move' | 'draw') => {
    let isActive = false
    let centerX = 0
    let centerY = 0
    let maxRadius = 50
    
    const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault()
      isActive = true
      const knob = type === 'move' ? moveKnobRef.current : drawKnobRef.current
      const rect = knob?.parentElement?.getBoundingClientRect()
      if (rect) {
        centerX = rect.left + rect.width / 2
        centerY = rect.top + rect.height / 2
        maxRadius = rect.width / 2.2
      }
    }
    
    const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
      if (!isActive) return
      e.preventDefault()
      
      const knob = type === 'move' ? moveKnobRef.current : drawKnobRef.current
      if (!knob) return
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      
      const dx = clientX - centerX
      const dy = clientY - centerY
      const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxRadius)
      const angle = Math.atan2(dy, dx)
      
      knob.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`
      
      const speed = Math.pow(dist / maxRadius, 1.3) * 3.5
      
      if (type === 'move') {
        targetVxMove.current = Math.cos(angle) * speed
        targetVyMove.current = Math.sin(angle) * speed
      } else {
        if (Math.abs(dx) > Math.abs(dy)) {
          targetVxDraw.current = Math.sign(dx) * speed
          targetVyDraw.current = 0
        } else {
          targetVxDraw.current = 0
          targetVyDraw.current = Math.sign(dy) * speed
        }
      }
    }
    
    const handleEnd = () => {
      if (!isActive) return
      isActive = false
      
      const knob = type === 'move' ? moveKnobRef.current : drawKnobRef.current
      if (knob) {
        knob.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
        knob.style.transform = 'translate(0px, 0px)'
        setTimeout(() => { if (knob) knob.style.transition = '' }, 600)
      }
      
      if (type === 'move') {
        targetVxMove.current = 0
        targetVyMove.current = 0
      } else {
        targetVxDraw.current = 0
        targetVyDraw.current = 0
      }
    }
    
    return { handleStart, handleMove, handleEnd }
  }, [])
  
  const moveHandlers = useRef(createJoystickHandlers('move'))
  const drawHandlers = useRef(createJoystickHandlers('draw'))
  
  // Device motion
  useEffect(() => {
    if (!isStarted) return
    
    let lastX = 0, lastY = 0, lastZ = 0
    let initialized = false
    
    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity
      if (!acc || acc.x === null) return
      
      const x = acc.x || 0
      const y = acc.y || 0
      const z = acc.z || 0
      
      if (!initialized) {
        lastX = x; lastY = y; lastZ = z
        initialized = true
        return
      }
      
      const dx = Math.abs(x - lastX)
      const dy = Math.abs(y - lastY)
      const dz = Math.abs(z - lastZ)
      
      if (dx > 15 || dy > 15 || dz > 15) {
        onShakeDetected()
      }
      
      lastX = x; lastY = y; lastZ = z
    }
    
    window.addEventListener('devicemotion', handleMotion)
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [isStarted, onShakeDetected])
  
  // Double tap to erase
  useEffect(() => {
    if (!isStarted) return
    let lastTap = 0
    const handle = () => {
      const now = Date.now()
      if (now - lastTap < 300) eraseScreen()
      lastTap = now
    }
    canvasRef.current?.addEventListener('dblclick', handle)
    return () => canvasRef.current?.removeEventListener('dblclick', handle)
  }, [isStarted, eraseScreen])
  
  // Start
  const handleStart = async () => {
    try {
      const elem = document.documentElement
      if (elem.requestFullscreen) await elem.requestFullscreen()
    } catch {}
    
    if (typeof DeviceMotionEvent !== 'undefined' && 
        typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        await (DeviceMotionEvent as any).requestPermission()
      } catch {}
    }
    
    setIsStarted(true)
    setTimeout(initCanvas, 100)
  }
  
  // Resize
  useEffect(() => {
    if (!isStarted) return
    const handle = () => setTimeout(() => initCanvas(true), 100)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [isStarted, initCanvas])
  
  // Auth submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    
    try {
      const url = authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = authMode === 'login' 
        ? { email: authForm.email, password: authForm.password }
        : authForm
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setAuthError(data.error || 'Erreur')
        return
      }
      
      setUser(data)
      setShowAuthModal(false)
      setAuthForm({ email: '', name: '', password: '' })
    } catch {
      setAuthError('Erreur de connexion')
    } finally {
      setAuthLoading(false)
    }
  }
  
  // Logout
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setShowMenu(false)
  }
  
  // Open save modal
  const openSaveModal = () => {
    if (!user) {
      setShowAuthModal(true)
      return
    }
    setSaveTitle('')
    setSavePublic(true)
    setSaveError('')
    setShowSaveModal(true)
    setShowMenu(false)
  }
  
  // Save drawing
  const handleSaveDrawing = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const canvas = canvasRef.current
    if (!canvas) {
      setSaveError('Erreur: canvas non trouvé')
      return
    }
    
    // Get the actual image data from canvas
    const imageData = canvas.toDataURL('image/png')
    
    if (!imageData || imageData === 'data:,') {
      setSaveError('Erreur: impossible de capturer le dessin')
      return
    }
    
    setSaveLoading(true)
    setSaveError('')
    
    try {
      const res = await fetch('/api/drawings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: saveTitle || 'Mon dessin',
          imageData,
          isPublic: savePublic
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setSaveError(data.error || 'Erreur lors de la sauvegarde')
        return
      }
      
      setShowSaveModal(false)
      // Show success message or navigate to classement
      router.push('/classement')
    } catch {
      setSaveError('Erreur de connexion')
    } finally {
      setSaveLoading(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-[#080808] flex justify-center items-center overflow-hidden touch-none select-none">
      <style jsx global>{`
        @keyframes shakeFast {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          20%, 60% { transform: translate(-15px, 8px) rotate(-1deg); }
          40%, 80% { transform: translate(15px, -8px) rotate(1deg); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .shaking { animation: shakeFast 0.6s ease-in-out; }
        .menu-slide { animation: slideDown 0.2s ease-out; }
      `}</style>
      
      {/* Orientation */}
      {!isLandscape && (
        <div className="absolute inset-0 bg-black/98 text-white z-[99999] flex flex-col justify-center items-center text-center p-5">
          <svg className="w-20 h-20 mb-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16,1H8C6.34,1 5,2.34 5,4V20C5,21.66 6.34,23 8,23H16C17.66,23 19,21.66 19,20V4C19,2.34 17.66,1 16,1M17,19H7V5H17V19Z"/>
          </svg>
          <h2 className="text-xl font-bold">Mode Paysage Requis</h2>
        </div>
      )}
      
      {/* Main Etch-A-Sketch */}
      <div 
        ref={toyRef}
        className="relative w-full h-full max-w-[1200px] bg-[#d10a0a] rounded-[4vh] flex flex-col items-center p-[4vh_4vw]"
        style={{
          boxShadow: 'inset 15px 15px 30px rgba(255,255,255,0.2), inset -15px -15px 30px rgba(0,0,0,0.5), 0 20px 50px rgba(0,0,0,0.9)'
        }}
      >
        {/* Top bar */}
        {isStarted && (
          <div className="absolute top-[1.5vh] left-[2vw] right-[2vw] z-20 flex justify-between items-center">
            {gameMode === 'draw' && (
              <div 
                className="text-white/80 text-[1.2vh] font-bold tracking-wider text-center whitespace-nowrap px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(0,0,0,0.3)' }}
              >
                Secouez vite = Effacer tout
              </div>
            )}
            
            {gameMode === 'eraser' && (
              <div 
                className="text-white text-[1.2vh] font-bold tracking-wider px-3 py-1.5 rounded-full flex items-center gap-2"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(78,205,196,0.8), rgba(69,183,209,0.8))',
                  boxShadow: '0 0 15px rgba(78,205,196,0.3)'
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                MODE GOMME
                <button 
                  onClick={exitEraserMode}
                  className="ml-1 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors text-[10px]"
                >
                  ✕
                </button>
              </div>
            )}
            
            {/* Menu button */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 rounded-full flex flex-col justify-center items-center gap-1 transition-all duration-300"
              style={{ 
                background: showMenu ? 'rgba(212,175,55,0.9)' : 'rgba(0,0,0,0.4)',
                boxShadow: showMenu ? '0 0 15px rgba(212,175,55,0.5)' : 'none'
              }}
            >
              <span 
                className="w-4 h-0.5 bg-white rounded transition-all duration-300"
                style={{ transform: showMenu ? 'rotate(45deg) translateY(4px)' : 'none' }}
              />
              <span 
                className="w-4 h-0.5 bg-white rounded transition-all duration-300"
                style={{ opacity: showMenu ? 0 : 1 }}
              />
              <span 
                className="w-4 h-0.5 bg-white rounded transition-all duration-300"
                style={{ transform: showMenu ? 'rotate(-45deg) translateY(-4px)' : 'none' }}
              />
            </button>
          </div>
        )}
        
        {/* Dropdown menu */}
        {isStarted && showMenu && (
          <div 
            className="absolute top-[6vh] right-[2vw] z-30 rounded-xl overflow-hidden menu-slide"
            style={{
              background: 'linear-gradient(145deg, rgba(42,42,42,0.98), rgba(26,26,26,0.98))',
              boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
              border: '1px solid rgba(212,175,55,0.3)'
            }}
          >
            {/* User info */}
            {user && (
              <div className="px-4 py-2 border-b border-white/10">
                <div className="text-white text-sm font-bold">{user.name}</div>
                <div className="text-white/50 text-[10px]">{user.email}</div>
              </div>
            )}
            
            {/* Classement */}
            <button
              onClick={() => {
                setShowMenu(false)
                router.push('/classement')
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-colors"
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #d4af37, #b8962e)' }}
              >
                <span className="text-black text-sm">🏆</span>
              </div>
              <div className="text-left">
                <div className="text-white text-sm font-bold">Classement</div>
                <div className="text-white/50 text-[10px]">Voir les dessins</div>
              </div>
            </button>
            
            {/* Save */}
            <button
              onClick={openSaveModal}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-colors"
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
              >
                <span className="text-white text-sm">💾</span>
              </div>
              <div className="text-left">
                <div className="text-white text-sm font-bold">
                  {user ? 'Sauvegarder' : 'Connexion requise'}
                </div>
                <div className="text-white/50 text-[10px]">Partager votre dessin</div>
              </div>
            </button>
            
            {/* Eraser toggle */}
            <button
              onClick={() => {
                toggleEraserMode()
                setShowMenu(false)
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-colors"
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ 
                  background: gameMode === 'eraser' 
                    ? 'linear-gradient(135deg, #4ECDC4, #45B7D1)' 
                    : 'linear-gradient(135deg, #d4af37, #b8962e)'
                }}
              >
                <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-white text-sm font-bold">
                  {gameMode === 'eraser' ? 'Quitter Gomme' : 'Gomme'}
                </div>
                <div className="text-white/50 text-[10px]">
                  {gameMode === 'eraser' ? 'Retour au dessin' : 'Effacer une partie'}
                </div>
              </div>
            </button>
            
            {/* Login/Logout */}
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-colors border-t border-white/10"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-600/80">
                  <span className="text-white text-sm">🚪</span>
                </div>
                <div className="text-left">
                  <div className="text-white text-sm font-bold">Déconnexion</div>
                </div>
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowMenu(false)
                  setShowAuthModal(true)
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-colors border-t border-white/10"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600/80">
                  <span className="text-white text-sm">👤</span>
                </div>
                <div className="text-left">
                  <div className="text-white text-sm font-bold">Connexion</div>
                  <div className="text-white/50 text-[10px]">Sauvegarder vos dessins</div>
                </div>
              </button>
            )}
          </div>
        )}
        
        {/* Screen bezel */}
        <div 
          className="relative w-[90%] h-[68%] bg-[#d4d4d4] rounded-[2.5vh] p-[1.5vh]"
          style={{ boxShadow: 'inset 6px 6px 18px rgba(0,0,0,0.5), inset -6px -6px 18px rgba(255,255,255,0.9)' }}
        >
          <div 
            ref={wrapperRef}
            className="relative w-full h-full rounded-[1.5vh] overflow-hidden" 
            style={{ boxShadow: 'inset 3px 3px 10px rgba(0,0,0,0.4)' }}
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
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 0 2px rgba(255,255,255,0.7)'
              }}
            />
            
            {/* Dust bar */}
            {showDustBar && (
              <div className="absolute top-0 left-0 right-0 h-[6px] bg-black/15 z-50 rounded-t-[1.5vh] overflow-hidden">
                <div
                  className="h-full"
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
              <div className="absolute inset-0 z-[10000] flex justify-center items-center pointer-events-none">
                <button
                  onClick={handleStart}
                  className="bg-[#d4af37] text-black border-[3px] border-white px-[5vw] py-[2.5vh] text-[2.5vh] font-bold rounded-full cursor-pointer uppercase tracking-wider pointer-events-auto"
                  style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}
                >
                  À toi de jouer !
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Logo */}
        <div className="flex-grow flex justify-center items-center relative">
          <div 
            className="text-[#d4af37] text-[4vh] italic font-bold tracking-wider"
            style={{ fontFamily: 'Georgia, serif', textShadow: '2px 2px 3px rgba(0,0,0,0.7), -1px -1px 0 rgba(255,255,255,0.3)' }}
          >
            Sketch Challenge
          </div>
          <div className="absolute -bottom-[2.5vh] text-white/50 text-[1.5vh] tracking-widest uppercase">
            Designed by <span className="text-[#d4af37]">Aaron</span>
          </div>
        </div>
        
        {/* Joysticks */}
        {isStarted && (
          <>
            {/* Move joystick */}
            <div
              className="absolute bottom-[3vh] left-[4vw] w-[18vh] h-[18vh] min-w-[100px] min-h-[100px] max-w-[150px] max-h-[150px] rounded-full bg-black/10 flex justify-center items-center"
              style={{ boxShadow: 'inset 4px 4px 12px rgba(0,0,0,0.4)' }}
              onTouchStart={moveHandlers.current.handleStart}
              onTouchMove={moveHandlers.current.handleMove}
              onTouchEnd={moveHandlers.current.handleEnd}
              onMouseDown={moveHandlers.current.handleStart}
              onMouseMove={moveHandlers.current.handleMove}
              onMouseUp={moveHandlers.current.handleEnd}
              onMouseLeave={moveHandlers.current.handleEnd}
            >
              <div
                ref={moveKnobRef}
                className="w-[65%] h-[65%] rounded-full flex justify-center items-center cursor-grab active:cursor-grabbing"
                style={{ 
                  background: gameMode === 'eraser' 
                    ? 'linear-gradient(135deg, #fff, #ccc)' 
                    : 'radial-gradient(circle at 30% 30%, #ffffff, #e0e0e0)', 
                  boxShadow: '-3px -3px 8px rgba(255,255,255,0.9), 5px 5px 15px rgba(0,0,0,0.4)' 
                }}
              >
                <div className="w-[35%] h-[35%] rounded-full bg-[#d0d0d0]" style={{ boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.3)' }} />
              </div>
              <div className="absolute -bottom-[4vh] text-white text-[1.5vh] font-bold" style={{ textShadow: '1px 1px 3px #000' }}>
                {gameMode === 'eraser' ? 'DEPLACER' : 'POSITION'}
              </div>
            </div>
            
            {/* Draw/Erase joystick */}
            <div
              className="absolute bottom-[3vh] right-[4vw] w-[18vh] h-[18vh] min-w-[100px] min-h-[100px] max-w-[150px] max-h-[150px] rounded-full bg-black/10 flex justify-center items-center"
              style={{ boxShadow: 'inset 4px 4px 12px rgba(0,0,0,0.4)' }}
              onTouchStart={drawHandlers.current.handleStart}
              onTouchMove={drawHandlers.current.handleMove}
              onTouchEnd={drawHandlers.current.handleEnd}
              onMouseDown={drawHandlers.current.handleStart}
              onMouseMove={drawHandlers.current.handleMove}
              onMouseUp={drawHandlers.current.handleEnd}
              onMouseLeave={drawHandlers.current.handleEnd}
            >
              <div
                ref={drawKnobRef}
                className="w-[65%] h-[65%] rounded-full flex justify-center items-center cursor-grab active:cursor-grabbing"
                style={{ 
                  background: gameMode === 'eraser' 
                    ? 'linear-gradient(135deg, #fff, #aaa)' 
                    : colorMode === 'gradient' 
                      ? 'linear-gradient(135deg, #FF6B6B, #4ECDC4, #45B7D1)' 
                      : 'radial-gradient(circle at 30% 30%, #ffffff, #e0e0e0)', 
                  boxShadow: '-3px -3px 8px rgba(255,255,255,0.9), 5px 5px 15px rgba(0,0,0,0.4)' 
                }}
              >
                <div 
                  className="w-[35%] h-[35%] rounded-full" 
                  style={{ 
                    background: gameMode === 'eraser' || colorMode === 'gradient' ? 'rgba(255,255,255,0.5)' : '#d0d0d0', 
                    boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.3)' 
                  }} 
                />
              </div>
              <div className="absolute -bottom-[4vh] text-white text-[1.5vh] font-bold" style={{ textShadow: '1px 1px 3px #000' }}>
                {gameMode === 'eraser' ? 'EFFACER' : 'DESSIN'}
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div 
            className="w-[90vw] max-w-[400px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden"
            style={{ maxHeight: '80vh' }}
          >
            <div className="bg-black/30 p-3 flex justify-between items-center">
              <h2 className="text-white text-lg font-bold">
                {authMode === 'login' ? 'Connexion' : 'Inscription'}
              </h2>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-white/60 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAuthSubmit} className="p-4 space-y-3">
              {authError && (
                <div className="text-red-400 text-sm text-center">{authError}</div>
              )}
              
              <input
                type="email"
                placeholder="Email"
                value={authForm.email}
                onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#d4af37]"
                required
              />
              
              {authMode === 'register' && (
                <input
                  type="text"
                  placeholder="Nom"
                  value={authForm.name}
                  onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#d4af37]"
                  required
                />
              )}
              
              <input
                type="password"
                placeholder="Mot de passe"
                value={authForm.password}
                onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#d4af37]"
                required
              />
              
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2 bg-[#d4af37] text-black font-bold rounded-lg hover:bg-[#e5c048] transition-colors disabled:opacity-50"
              >
                {authLoading ? 'Chargement...' : (authMode === 'login' ? 'Se connecter' : "S'inscrire")}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login')
                  setAuthError('')
                }}
                className="w-full text-white/60 text-sm hover:text-white"
              >
                {authMode === 'login' ? "Pas de compte? S'inscrire" : 'Déjà un compte? Se connecter'}
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div 
            className="w-[90vw] max-w-[500px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden"
            style={{ maxHeight: '85vh' }}
          >
            <div className="bg-black/30 p-3 flex justify-between items-center">
              <h2 className="text-white text-lg font-bold">Sauvegarder le dessin</h2>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-white/60 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSaveDrawing} className="p-4 space-y-3">
              {/* Preview */}
              <div className="w-full aspect-video bg-[#c4c4c4] rounded-lg overflow-hidden">
                <img
                  src={canvasRef.current?.toDataURL('image/png') || ''}
                  alt="Aperçu"
                  className="w-full h-full object-contain"
                />
              </div>
              
              {saveError && (
                <div className="text-red-400 text-sm text-center">{saveError}</div>
              )}
              
              <input
                type="text"
                placeholder="Titre du dessin"
                value={saveTitle}
                onChange={e => setSaveTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#d4af37]"
              />
              
              <label className="flex items-center gap-2 text-white">
                <input
                  type="checkbox"
                  checked={savePublic}
                  onChange={e => setSavePublic(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Rendre public (visible dans le classement)</span>
              </label>
              
              <button
                type="submit"
                disabled={saveLoading}
                className="w-full py-2 bg-[#22c55e] text-white font-bold rounded-lg hover:bg-[#16a34a] transition-colors disabled:opacity-50"
              >
                {saveLoading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
