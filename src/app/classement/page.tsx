'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
}

interface Drawing {
  id: string
  title: string
  imageData: string
  isPublic: boolean
  createdAt: string
  author: User
  votes: {
    green: number
    blue: number
    red: number
    x: number
  }
  score: number
  userVote: string | null
}

interface CurrentUser {
  id: string
  name: string
  email: string
}

export default function ClassementPage() {
  const router = useRouter()
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authForm, setAuthForm] = useState({ email: '', name: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Fetch current user
  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      setUser(data.user)
    } catch {
      setUser(null)
    }
  }, [])

  // Fetch drawings
  const fetchDrawings = useCallback(async () => {
    try {
      const res = await fetch('/api/drawings')
      const data = await res.json()
      
      // Sort by score (highest first)
      const sorted = (data.drawings || []).sort((a: Drawing, b: Drawing) => b.score - a.score)
      setDrawings(sorted)
    } catch (error) {
      console.error('Error fetching drawings:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
    fetchDrawings()
  }, [fetchUser, fetchDrawings])

  // Vote for a drawing
  const handleVote = async (drawingId: string, type: string) => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    try {
      await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drawingId, type })
      })

      // Refresh drawings
      fetchDrawings()
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  // Auth form submission
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
    } catch (error) {
      setAuthError('Erreur de connexion')
    } finally {
      setAuthLoading(false)
    }
  }

  // Logout
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  // Get vote button style
  const getVoteButtonStyle = (type: string, isActive: boolean) => {
    const baseStyle = {
      green: { bg: isActive ? '#22c55e' : '#166534', icon: '💚', label: 'Super!' },
      blue: { bg: isActive ? '#3b82f6' : '#1e40af', icon: '🩵', label: 'Bien' },
      red: { bg: isActive ? '#ef4444' : '#991b1b', icon: '❤️', label: 'Pas mal' },
      x: { bg: isActive ? '#6b7280' : '#374151', icon: '❌', label: 'Non' }
    }
    return baseStyle[type as keyof typeof baseStyle] || baseStyle.x
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-red-900 to-red-700 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-red-900 to-red-700 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 h-[10vh] bg-black/20 flex items-center justify-between px-[2vw]">
        <button
          onClick={() => router.push('/')}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          ←
        </button>
        
        <h1 className="text-[#d4af37] text-[3vh] font-bold tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>
          Classement
        </h1>
        
        {user ? (
          <div className="flex items-center gap-2">
            <span className="text-white text-[1.5vh]">{user.name}</span>
            <button
              onClick={handleLogout}
              className="text-white/60 text-[1.2vh] hover:text-white"
            >
              Déconnexion
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-3 py-1 bg-[#d4af37] text-black text-[1.5vh] font-bold rounded-full"
          >
            Connexion
          </button>
        )}
      </div>

      {/* Drawings Grid - 2 columns for landscape */}
      <div className="flex-1 overflow-y-auto p-[2vw]">
        {drawings.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-white/80">
              <div className="text-[4vh] mb-4">🎨</div>
              <div className="text-[2vh]">Aucun dessin publié</div>
              <div className="text-[1.5vh] mt-2">Soyez le premier à partager votre création!</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-[2vw]">
            {drawings.map((drawing, index) => (
              <div
                key={drawing.id}
                className="bg-black/30 rounded-xl overflow-hidden flex"
                style={{ height: '30vh' }}
              >
                {/* Image */}
                <div className="w-[50%] p-2">
                  <div className="w-full h-full rounded-lg overflow-hidden bg-[#c4c4c4] relative">
                    <img
                      src={drawing.imageData}
                      alt={drawing.title}
                      className="w-full h-full object-contain"
                    />
                    {/* Rank badge */}
                    {index < 3 && (
                      <div
                        className="absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-[1.2vh] font-bold"
                        style={{
                          background: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : '#cd7f32',
                          color: index === 0 ? '#000' : '#fff'
                        }}
                      >
                        {index + 1}
                      </div>
                    )}
                  </div>
                </div>

                {/* Info and votes */}
                <div className="w-[50%] p-2 flex flex-col">
                  <div className="text-white text-[1.5vh] font-bold truncate">{drawing.title}</div>
                  <div className="text-white/60 text-[1.2vh]">par {drawing.author.name}</div>
                  
                  {/* Score */}
                  <div className="text-[#d4af37] text-[2vh] font-bold mt-1">
                    Score: {drawing.score}
                  </div>

                  {/* Vote buttons */}
                  <div className="flex-1 flex items-center">
                    <div className="grid grid-cols-4 gap-1 w-full">
                      {['green', 'blue', 'red', 'x'].map(type => {
                        const style = getVoteButtonStyle(type, drawing.userVote === type)
                        return (
                          <button
                            key={type}
                            onClick={() => handleVote(drawing.id, type)}
                            className="flex flex-col items-center justify-center py-1 rounded-lg transition-all hover:scale-105"
                            style={{ background: style.bg }}
                          >
                            <span className="text-[1.5vh]">{style.icon}</span>
                            <span className="text-[1vh] text-white/80">{drawing.votes[type as keyof typeof drawing.votes]}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div 
            className="w-[90vw] max-w-[400px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden"
            style={{ maxHeight: '80vh' }}
          >
            {/* Modal header */}
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

            {/* Form */}
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
    </div>
  )
}
