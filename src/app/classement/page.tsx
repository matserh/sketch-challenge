'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, getDocs, where } from 'firebase/firestore'

interface Drawing {
  id: string
  title: string
  imageData: string
  isPublic: boolean
  authorName: string
  authorId: string
  createdAt: any
  votes: { green: number; blue: number; red: number; x: number }
  votedUsers: Record<string, string>
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

  // Firebase auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Artiste',
          email: firebaseUser.email || ''
        })
      } else {
        setUser(null)
      }
    })
    return () => unsub()
  }, [])

  // Real-time drawings listener
  useEffect(() => {
    const q = query(collection(db, 'drawings'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snapshot) => {
      const items: Drawing[] = []
      snapshot.forEach(d => {
        const data = d.data()
        const votes = data.votes || { green: 0, blue: 0, red: 0, x: 0 }
        const score = (votes.green * 2) + votes.blue - votes.red - (votes.x * 2)
        const votedUsers = data.votedUsers || {}
        items.push({
          id: d.id,
          title: data.title,
          imageData: data.imageData,
          isPublic: data.isPublic,
          authorName: data.authorName || 'Anonyme',
          authorId: data.authorId,
          createdAt: data.createdAt,
          votes,
          votedUsers,
          score,
          userVote: user ? (votedUsers[user.id] || null) : null
        })
      })
      setDrawings(items.sort((a, b) => b.score - a.score))
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [user])

  // Vote for a drawing
  const handleVote = async (drawingId: string, type: string) => {
    if (!user || !auth.currentUser) {
      setShowAuthModal(true)
      return
    }

    try {
      const drawing = drawings.find(d => d.id === drawingId)
      if (!drawing) return

      const currentVote = drawing.votedUsers[user.id]
      const votes = { ...drawing.votes }

      // Remove old vote if exists
      if (currentVote && currentVote in votes) {
        votes[currentVote as keyof typeof votes]--
      }

      // If same vote type, just remove it (toggle off)
      if (currentVote === type) {
        const newVotedUsers = { ...drawing.votedUsers }
        delete newVotedUsers[user.id]
        await updateDoc(doc(db, 'drawings', drawingId), {
          votes,
          votedUsers: newVotedUsers
        })
      } else {
        // Add new vote
        votes[type as keyof typeof votes]++
        await updateDoc(doc(db, 'drawings', drawingId), {
          votes,
          votedUsers: { ...drawing.votedUsers, [user.id]: type }
        })
      }
    } catch (error) {
      console.error('Vote error:', error)
    }
  }

  // Auth
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    try {
      if (authMode === 'login') {
        const cred = await signInWithEmailAndPassword(auth, authForm.email, authForm.password)
        setUser({ id: cred.user.uid, name: cred.user.displayName || 'Artiste', email: cred.user.email || '' })
      } else {
        const cred = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password)
        await updateProfile(cred.user, { displayName: authForm.name })
        setUser({ id: cred.user.uid, name: authForm.name, email: authForm.email })
      }
      setShowAuthModal(false)
      setAuthForm({ email: '', name: '', password: '' })
    } catch (err: any) {
      const msg = err?.code === 'auth/email-already-in-use' ? 'Cet email est déjà utilisé'
        : err?.code === 'auth/invalid-credential' ? 'Email ou mot de passe incorrect'
        : err?.code === 'auth/weak-password' ? 'Mot de passe trop faible (6 min.)'
        : 'Erreur'
      setAuthError(msg)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
    setUser(null)
  }

  const getVoteButtonStyle = (type: string, isActive: boolean) => {
    const base = {
      green: { bg: isActive ? '#22c55e' : '#166534', icon: '💚', label: 'Super!' },
      blue: { bg: isActive ? '#3b82f6' : '#1e40af', icon: '🩵', label: 'Bien' },
      red: { bg: isActive ? '#ef4444' : '#991b1b', icon: '❤️', label: 'Pas mal' },
      x: { bg: isActive ? '#6b7280' : '#374151', icon: '❌', label: 'Non' }
    }
    return base[type as keyof typeof base] || base.x
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
            <button onClick={handleLogout} className="text-white/60 text-[1.2vh] hover:text-white">Déco</button>
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

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-[2vw]">
        {drawings.filter(d => d.isPublic).length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-white/80">
              <div className="text-[4vh] mb-4">🎨</div>
              <div className="text-[2vh]">Aucun dessin publié</div>
              <div className="text-[1.5vh] mt-2">Soyez le premier à partager votre création!</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-[2vw]">
            {drawings.filter(d => d.isPublic).map((drawing, index) => (
              <div key={drawing.id} className="bg-black/30 rounded-xl overflow-hidden flex" style={{ height: '30vh' }}>
                <div className="w-[50%] p-2">
                  <div className="w-full h-full rounded-lg overflow-hidden bg-[#c4c4c4] relative">
                    <img src={drawing.imageData} alt={drawing.title} className="w-full h-full object-contain" />
                    {index < 3 && (
                      <div
                        className="absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-[1.2vh] font-bold"
                        style={{ background: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : '#cd7f32', color: index === 0 ? '#000' : '#fff' }}
                      >
                        {index + 1}
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-[50%] p-2 flex flex-col">
                  <div className="text-white text-[1.5vh] font-bold truncate">{drawing.title}</div>
                  <div className="text-white/60 text-[1.2vh]">par {drawing.authorName}</div>
                  <div className="text-[#d4af37] text-[2vh] font-bold mt-1">Score: {drawing.score}</div>
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
          <div className="w-[90vw] max-w-[400px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden" style={{ maxHeight: '80vh' }}>
            <div className="bg-black/30 p-3 flex justify-between items-center">
              <h2 className="text-white text-lg font-bold">{authMode === 'login' ? 'Connexion' : 'Inscription'}</h2>
              <button onClick={() => setShowAuthModal(false)} className="text-white/60 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={handleAuthSubmit} className="p-4 space-y-3">
              {authError && <div className="text-red-400 text-sm text-center">{authError}</div>}
              <input type="email" placeholder="Email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#d4af37]" required />
              {authMode === 'register' && (
                <input type="text" placeholder="Nom" value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#d4af37]" required />
              )}
              <input type="password" placeholder="Mot de passe" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#d4af37]" required />
              <button type="submit" disabled={authLoading} className="w-full py-2 bg-[#d4af37] text-black font-bold rounded-lg hover:bg-[#e5c048] transition-colors disabled:opacity-50">
                {authLoading ? 'Chargement...' : (authMode === 'login' ? 'Se connecter' : "S'inscrire")}
              </button>
              <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('') }} className="w-full text-white/60 text-sm hover:text-white">
                {authMode === 'login' ? "Pas de compte? S'inscrire" : 'Déjà un compte? Se connecter'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
