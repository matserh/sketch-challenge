'use client'

import Link from 'next/link'

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%)',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '24px 16px 48px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '960px',
          margin: '0 auto 64px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div
          style={{
            color: '#d4af37',
            fontStyle: 'italic',
            fontWeight: 700,
            fontSize: '22px',
            fontFamily: 'Georgia, serif',
          }}
        >
          Sketch Challenge
        </div>
        <nav style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <Link
            href="/play"
            style={{
              color: '#fff',
              textDecoration: 'none',
              fontSize: '14px',
              padding: '6px 14px',
              border: '1px solid #444',
              borderRadius: '4px',
            }}
          >
            Jouer
          </Link>
          <Link
            href="/classement"
            style={{
              color: '#fff',
              textDecoration: 'none',
              fontSize: '14px',
              padding: '6px 14px',
              border: '1px solid #444',
              borderRadius: '4px',
            }}
          >
            Classement
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              background: '#1f1f1f',
              border: '1px solid #333',
              borderRadius: '20px',
              fontSize: '12px',
              color: '#888',
              marginBottom: '24px',
              letterSpacing: '1px',
            }}
          >
            MOBILE · LANDSCAPE · SHAKE
          </div>
          <h1
            style={{
              fontSize: 'clamp(32px, 8vw, 56px)',
              fontWeight: 800,
              margin: '0 0 16px',
              lineHeight: 1.1,
              letterSpacing: '-1px',
            }}
          >
            Dessine avec{' '}
            <span style={{ color: '#d4af37' }}>deux joysticks</span>
            <br />
            comme sur un vrai Etch-A-Sketch.
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: '#999',
              maxWidth: '600px',
              margin: '0 auto 32px',
              lineHeight: 1.6,
            }}
          >
            Un jeu mobile expérimental inspiré du jouet classique. Deux
            joysticks, un pour positionner le pinceau, l&apos;autre pour dessiner.
            Secoue ton téléphone pour effacer — exactement comme dans
            l&apos;original, mais en mieux.
          </p>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href="/play"
              style={{
                display: 'inline-block',
                background: '#d4af37',
                color: '#000',
                padding: '14px 28px',
                borderRadius: '4px',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '15px',
              }}
            >
              ▶ Commencer à dessiner
            </Link>
            <Link
              href="/classement"
              style={{
                display: 'inline-block',
                background: 'transparent',
                color: '#fff',
                padding: '14px 28px',
                border: '1px solid #444',
                borderRadius: '4px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '15px',
              }}
            >
              Voir le classement
            </Link>
          </div>
          <div
            style={{
              marginTop: '16px',
              fontSize: '11px',
              color: '#666',
            }}
          >
            ⚠ Tourne ton téléphone en mode paysage pour jouer
          </div>
        </div>

        {/* Features */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '64px',
          }}
        >
          <Feature
            icon="🎮"
            title="Double joystick"
            text="Un stick pour bouger le pinceau, l'autre pour tracer. Reproduction fidèle du jouet d'époque, adaptée au tactile mobile."
          />
          <Feature
            icon="🌈"
            title="Mode dégradé ou noir"
            text="Un secouement isole pour basculer entre le pinceau noir classique et un mode dégradé de couleurs animées."
          />
          <Feature
            icon="💧"
            title="Gomme & effacement"
            text="Deux secouements activent la gomme locale. Secouements rapides et continus = écran entièrement effacé, comme un vrai Etch-A-Sketch."
          />
          <Feature
            icon="🏆"
            title="Classement communautaire"
            text="Sauvegarde ton dessin, partage-le avec la communauté, reçois des votes (💚🩵❤️❌) et grimpe dans le classement."
          />
          <Feature
            icon="🔐"
            title="Authentification simple"
            text="Un email fictif, sans mot de passe. Chaque identifiant est unique côté serveur, tes dessins te restent attachés."
          />
          <Feature
            icon="📱"
            title="100% mobile"
            text="Pensé et optimisé pour téléphone en mode paysage. Sur desktop, le jeu s'affiche mais n'est pas l'expérience prévue."
          />
        </section>

        {/* How it works */}
        <section
          style={{
            background: '#111',
            border: '1px solid #222',
            borderRadius: '6px',
            padding: '32px 20px',
            marginBottom: '64px',
          }}
        >
          <h2
            style={{
              fontSize: '22px',
              margin: '0 0 24px',
              color: '#d4af37',
              fontWeight: 700,
            }}
          >
            Comment ça marche
          </h2>
          <ol
            style={{
              paddingLeft: '20px',
              margin: 0,
              color: '#ccc',
              lineHeight: 1.8,
              fontSize: '15px',
            }}
          >
            <li style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#fff' }}>Connecte-toi</strong> avec un
              email fictif (ex: <code style={{ color: '#d4af37' }}>aaron@sketch</code>) — pas de mot de passe, pas de spam.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#fff' }}>Tourne ton téléphone</strong>{' '}
              en mode paysage, puis appuie sur « À toi de jouer ».
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#fff' }}>Joystick gauche</strong> :
              positionne le pinceau sur l&apos;écran.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#fff' }}>Joystick droit</strong> : trace
              le trait pendant que tu bouges.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#fff' }}>Secoue</strong> : 1 fois =
              couleur, 2 fois = gomme, vite = tout effacer.
            </li>
            <li>
              <strong style={{ color: '#fff' }}>Sauvegarde</strong> ton dessin
              et partage-le au reste de la communauté.
            </li>
          </ol>
        </section>

        {/* About / Tech */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px',
            marginBottom: '64px',
          }}
        >
          <div
            style={{
              background: '#111',
              border: '1px solid #222',
              padding: '20px',
              borderRadius: '6px',
            }}
          >
            <h3
              style={{
                margin: '0 0 12px',
                fontSize: '16px',
                color: '#fff',
              }}
            >
              Stack technique
            </h3>
            <ul
              style={{
                margin: 0,
                paddingLeft: '18px',
                color: '#999',
                fontSize: '13px',
                lineHeight: 1.7,
              }}
            >
              <li>Next.js 16 + TypeScript</li>
              <li>Canvas 2D pour le dessin</li>
              <li>Prisma + SQLite pour la persistance</li>
              <li>API Routes server-side</li>
              <li>Détection DeviceMotion pour le shake</li>
              <li>Auth par cookie httpOnly</li>
            </ul>
          </div>
          <div
            style={{
              background: '#111',
              border: '1px solid #222',
              padding: '20px',
              borderRadius: '6px',
            }}
          >
            <h3
              style={{
                margin: '0 0 12px',
                fontSize: '16px',
                color: '#fff',
              }}
            >
              Communauté
            </h3>
            <ul
              style={{
                margin: 0,
                paddingLeft: '18px',
                color: '#999',
                fontSize: '13px',
                lineHeight: 1.7,
              }}
            >
              <li>Tout le monde voit les dessins publics</li>
              <li>Ton identifiant est unique et persistant</li>
              <li>4 types de votes : 💚 🩵 ❤️ ❌</li>
              <li>Score calculé selon les votes reçus</li>
              <li>Dessins privés visibles seulement par toi</li>
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section
          style={{
            textAlign: 'center',
            padding: '48px 0 32px',
            borderTop: '1px solid #222',
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 700,
              margin: '0 0 12px',
            }}
          >
            Prêt à devenir le prochain Picasso du pixel ?
          </h2>
          <p style={{ color: '#777', fontSize: '14px', marginBottom: '24px' }}>
            Gratuit · Sans inscription compliquée · Mobile uniquement
          </p>
          <Link
            href="/play"
            style={{
              display: 'inline-block',
              background: '#d4af37',
              color: '#000',
              padding: '14px 36px',
              borderRadius: '4px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '16px',
            }}
          >
            ▶ Lancer le jeu
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          padding: '32px 0 0',
          borderTop: '1px solid #1a1a1a',
          color: '#555',
          fontSize: '12px',
        }}
      >
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ marginBottom: '6px' }}>
            Designed by{' '}
            <span style={{ color: '#d4af37' }}>Aeron</span>
          </div>
          <div>© {new Date().getFullYear()} Sketch Challenge · Version test</div>
        </div>
      </footer>
    </div>
  )
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: string
  title: string
  text: string
}) {
  return (
    <div
      style={{
        background: '#111',
        border: '1px solid #222',
        borderRadius: '6px',
        padding: '20px',
      }}
    >
      <div style={{ fontSize: '24px', marginBottom: '10px' }}>{icon}</div>
      <h3
        style={{
          margin: '0 0 8px',
          fontSize: '15px',
          color: '#fff',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          color: '#999',
          fontSize: '13px',
          lineHeight: 1.55,
        }}
      >
        {text}
      </p>
    </div>
  )
}
