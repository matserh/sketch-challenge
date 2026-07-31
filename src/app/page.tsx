'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function LandingPage() {
  const [isMobile, setIsMobile] = useState(true)

  useEffect(() => {
    const check = () => {
      const ua = navigator.userAgent || ''
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const small = window.innerWidth <= 1024
      const mobileUA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua)
      // Considered mobile if touch device AND small screen, OR mobile UA
      setIsMobile((touch && small) || mobileUA)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!isMobile) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#C8102E',
          color: '#fff',
          fontFamily: 'Arial, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '64px',
            marginBottom: '16px',
          }}
        >
          📱
        </div>
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 'bold',
            margin: '0 0 12px',
            textTransform: 'uppercase',
            textShadow: '2px 2px 0 #000',
          }}
        >
          Désolé
        </h1>
        <p
          style={{
            fontSize: '16px',
            maxWidth: '420px',
            lineHeight: 1.6,
            opacity: 0.95,
          }}
        >
          Sketch Challenge n&apos;est disponible que sur mobile.
          <br />
          Ouvre cette page sur ton téléphone, en mode paysage, pour pouvoir
          dessiner avec les deux joysticks.
        </p>
        <div
          style={{
            marginTop: '24px',
            padding: '8px 14px',
            background: '#000',
            color: '#fff',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          Designed by Aeron
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fff',
        color: '#000',
        fontFamily: 'Times New Roman, Georgia, serif',
        padding: '0',
        boxSizing: 'border-box',
      }}
    >
      {/* Top red bar */}
      <div
        style={{
          background: '#C8102E',
          color: '#fff',
          padding: '6px 12px',
          textAlign: 'center',
          fontSize: '11px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          fontWeight: 'bold',
          borderBottom: '3px solid #000',
        }}
      >
        ★ Sketch Challenge ★ · Version Test · Mobile Uniquement
      </div>

      {/* Header */}
      <header
        style={{
          background: '#C8102E',
          color: '#fff',
          padding: '20px 16px',
          borderBottom: '4px double #000',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '42px',
            fontWeight: 'bold',
            letterSpacing: '-1px',
            fontStyle: 'italic',
            textShadow: '2px 2px 0 #000',
            lineHeight: 1,
          }}
        >
          SKETCH
        </div>
        <div
          style={{
            fontSize: '42px',
            fontWeight: 'bold',
            letterSpacing: '-1px',
            fontStyle: 'italic',
            textShadow: '2px 2px 0 #000',
            lineHeight: 1,
            marginTop: '-4px',
          }}
        >
          CHALLENGE
        </div>
        <div
          style={{
            marginTop: '8px',
            fontSize: '11px',
            color: '#fff',
            opacity: 0.85,
          }}
        >
          Le jeu de dessin à deux joysticks, comme un vrai Etch-A-Sketch.
        </div>
      </header>

      {/* Nav */}
      <nav
        style={{
          background: '#f0f0f0',
          borderBottom: '2px solid #000',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/play"
          style={{
            background: '#C8102E',
            color: '#fff',
            padding: '8px 16px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '13px',
            border: '2px solid #000',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          ▶ JOUER
        </Link>
        <Link
          href="/classement"
          style={{
            background: '#fff',
            color: '#000',
            padding: '8px 16px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '13px',
            border: '2px solid #000',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          🏆 CLASSEMENT
        </Link>
      </nav>

      {/* Hero - mockup of the toy */}
      <section
        style={{
          padding: '32px 16px',
          textAlign: 'center',
          borderBottom: '2px solid #000',
        }}
      >
        {/* Crude Etch-A-Sketch mockup */}
        <div
          style={{
            display: 'inline-block',
            background: '#C8102E',
            border: '4px solid #000',
            borderRadius: '12px',
            padding: '20px 16px 30px',
            maxWidth: '420px',
            width: '100%',
            boxShadow: '6px 6px 0 #000',
          }}
        >
          {/* Screen */}
          <div
            style={{
              background: '#c4c4c4',
              border: '3px solid #000',
              borderRadius: '6px',
              height: '180px',
              marginBottom: '14px',
              padding: '10px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#000',
                fontSize: '14px',
                fontStyle: 'italic',
                textAlign: 'center',
                fontFamily: 'cursive',
                lineHeight: 1.4,
              }}
            >
              ~ votre dessin apparaît ici ~
              <br />
              <span style={{ fontSize: '11px' }}>
                (tourne ton téléphone en mode paysage)
              </span>
            </div>
          </div>
          {/* Knobs */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0 6px',
            }}
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: '#fff',
                border: '3px solid #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              ◐
            </div>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: '#fff',
                border: '3px solid #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              ◑
            </div>
          </div>
          <div
            style={{
              marginTop: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0 4px',
              fontSize: '9px',
              color: '#fff',
              fontFamily: 'Arial, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            <span>Position</span>
            <span>Dessin</span>
          </div>
        </div>

        <h1
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '28px 0 10px',
            lineHeight: 1.2,
            fontFamily: 'Arial, sans-serif',
            textTransform: 'uppercase',
          }}
        >
          Dessine comme en 1985.
          <br />
          Mais sur ton téléphone.
        </h1>
        <p
          style={{
            fontSize: '14px',
            margin: '0 auto 20px',
            maxWidth: '480px',
            lineHeight: 1.5,
            color: '#333',
          }}
        >
          Deux joysticks. Un pour positionner le pinceau, l&apos;autre pour
          tracer. Secoue ton téléphone pour effacer. Exactement comme le vrai
          jouet, mais en mieux. Sauvegarde tes dessins et affronte la
          communauté.
        </p>
        <Link
          href="/play"
          style={{
            display: 'inline-block',
            background: '#C8102E',
            color: '#fff',
            padding: '14px 32px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '16px',
            border: '3px solid #000',
            fontFamily: 'Arial, sans-serif',
            textTransform: 'uppercase',
            boxShadow: '4px 4px 0 #000',
          }}
        >
          ▶ À toi de jouer
        </Link>
      </section>

      {/* Features */}
      <section
        style={{
          padding: '32px 16px',
          background: '#fff',
          borderBottom: '2px solid #000',
        }}
      >
        <h2
          style={{
            textAlign: 'center',
            fontSize: '20px',
            margin: '0 0 24px',
            fontFamily: 'Arial, sans-serif',
            textTransform: 'uppercase',
            textDecoration: 'underline',
          }}
        >
          Ce que tu peux faire
        </h2>
        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
          }}
        >
          {[
            {
              icon: '🎮',
              title: 'Double joystick',
              text: "Bouge le pinceau d'un côté, trace de l'autre. Comme le vrai jouet d'époque.",
            },
            {
              icon: '🌈',
              title: 'Couleur ou noir',
              text: "Secoue une fois pour basculer entre le pinceau noir classique et le mode dégradé.",
            },
            {
              icon: '💧',
              title: 'Gomme',
              text: 'Deux secouements = gomme locale. Secouements rapides = tout effacer.',
            },
            {
              icon: '🏆',
              title: 'Classement',
              text: 'Sauvegarde, partage, reçois des votes 💚🩵❤️❌ et grimpe au classement.',
            },
            {
              icon: '🔐',
              title: 'Compte simple',
              text: 'Un email fictif, pas de mot de passe. Chaque identifiant est unique.',
            },
            {
              icon: '📱',
              title: 'Mobile paysage',
              text: "Pensé pour téléphone en mode paysage. Tourne ton écran pour jouer.",
            },
          ].map((f, i) => (
            <div
              key={i}
              style={{
                background: '#fff',
                border: '2px solid #000',
                padding: '12px',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              <div style={{ fontSize: '20px', marginBottom: '6px' }}>
                {f.icon}
              </div>
              <div
                style={{
                  fontWeight: 'bold',
                  fontSize: '14px',
                  marginBottom: '4px',
                  color: '#C8102E',
                }}
              >
                {f.title}
              </div>
              <div style={{ fontSize: '12px', color: '#333', lineHeight: 1.5 }}>
                {f.text}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        style={{
          padding: '32px 16px',
          background: '#f5f5f5',
          borderBottom: '2px solid #000',
        }}
      >
        <h2
          style={{
            textAlign: 'center',
            fontSize: '20px',
            margin: '0 0 20px',
            fontFamily: 'Arial, sans-serif',
            textTransform: 'uppercase',
            textDecoration: 'underline',
          }}
        >
          Comment ça marche
        </h2>
        <ol
          style={{
            maxWidth: '560px',
            margin: '0 auto',
            paddingLeft: '24px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px',
            lineHeight: 1.8,
            color: '#000',
          }}
        >
          <li>
            <strong>Connecte-toi</strong> avec un email fictif (ex:{' '}
            <code
              style={{
                background: '#000',
                color: '#fff',
                padding: '1px 4px',
              }}
            >
              aaron@sketch
            </code>
            ) · pas de mot de passe.
          </li>
          <li>
            <strong>Tourne ton téléphone</strong> en paysage, appuie sur « À toi
            de jouer ».
          </li>
          <li>
            <strong>Joystick gauche</strong> : positionne le pinceau.
          </li>
          <li>
            <strong>Joystick droit</strong> : trace le trait.
          </li>
          <li>
            <strong>Secoue</strong> : 1× = couleur, 2× = gomme, rapide = tout
            effacer.
          </li>
          <li>
            <strong>Sauvegarde</strong> ton dessin pour le partager.
          </li>
        </ol>
      </section>

      {/* About */}
      <section
        style={{
          padding: '32px 16px',
          background: '#fff',
          borderBottom: '2px solid #000',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
          }}
        >
          <div
            style={{
              border: '2px solid #000',
              padding: '14px',
              background: '#fff',
            }}
          >
            <h3
              style={{
                margin: '0 0 8px',
                fontSize: '14px',
                color: '#C8102E',
                textTransform: 'uppercase',
              }}
            >
              Stack technique
            </h3>
            <ul
              style={{
                margin: 0,
                paddingLeft: '18px',
                fontSize: '12px',
                lineHeight: 1.7,
                color: '#333',
              }}
            >
              <li>Next.js 16 + TypeScript</li>
              <li>Canvas 2D pour le dessin</li>
              <li>Prisma + SQLite</li>
              <li>API Routes server-side</li>
              <li>DeviceMotion pour le shake</li>
              <li>Cookie httpOnly pour l&apos;auth</li>
            </ul>
          </div>
          <div
            style={{
              border: '2px solid #000',
              padding: '14px',
              background: '#fff',
            }}
          >
            <h3
              style={{
                margin: '0 0 8px',
                fontSize: '14px',
                color: '#C8102E',
                textTransform: 'uppercase',
              }}
            >
              Communauté
            </h3>
            <ul
              style={{
                margin: 0,
                paddingLeft: '18px',
                fontSize: '12px',
                lineHeight: 1.7,
                color: '#333',
              }}
            >
              <li>Dessins publics visibles par tous</li>
              <li>Identifiant unique et persistant</li>
              <li>4 types de votes : 💚 🩵 ❤️ ❌</li>
              <li>Score calculé selon les votes</li>
              <li>Dessins privés = visibles par toi seul</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        style={{
          padding: '48px 16px',
          background: '#C8102E',
          color: '#fff',
          textAlign: 'center',
          borderBottom: '4px double #000',
        }}
      >
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 'bold',
            margin: '0 0 10px',
            fontFamily: 'Arial, sans-serif',
            textTransform: 'uppercase',
            textShadow: '2px 2px 0 #000',
          }}
        >
          Prêt à dessiner ?
        </h2>
        <p
          style={{
            fontSize: '13px',
            marginBottom: '20px',
            opacity: 0.9,
            fontFamily: 'Arial, sans-serif',
          }}
        >
          Gratuit · Sans inscription compliquée · Mobile uniquement
        </p>
        <Link
          href="/play"
          style={{
            display: 'inline-block',
            background: '#fff',
            color: '#C8102E',
            padding: '14px 36px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '16px',
            border: '3px solid #000',
            fontFamily: 'Arial, sans-serif',
            textTransform: 'uppercase',
            boxShadow: '4px 4px 0 #000',
          }}
        >
          ▶ Lancer le jeu
        </Link>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: '#000',
          color: '#fff',
          padding: '20px 16px',
          textAlign: 'center',
          fontSize: '11px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ marginBottom: '6px' }}>
          Designed by <span style={{ color: '#C8102E' }}>Aeron</span>
        </div>
        <div style={{ opacity: 0.6 }}>
          © {new Date().getFullYear()} Sketch Challenge · Version test
        </div>
      </footer>
    </div>
  )
}
