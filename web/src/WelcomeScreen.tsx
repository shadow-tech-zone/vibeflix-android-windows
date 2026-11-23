import { useState } from 'react'
import { ArrowRight, BookmarkCheck, ChevronDown, Clock3, Play, Search, ShieldCheck } from 'lucide-react'
import type { CatalogTitle } from './types'
import './WelcomeScreen.css'

type WelcomeScreenProps = {
  featured: CatalogTitle | null
  heroBackdrop: string
  onBrowse: () => void
}

const FAQS = [
  {
    question: 'Do I need to create an account?',
    answer: 'No. Open the welcome page and browse without signing in. Your My List, watch history, and resume positions are saved only in this browser on this device.',
  },
  {
    question: 'Where does the catalog come from?',
    answer: 'Catalog and title details come from the provider service already connected to VibeFlix. The web client does not use Firebase or a separate TMDB key.',
  },
  {
    question: 'Can every title play in my browser?',
    answer: 'Not always. Provider availability, browser support, media headers, and cross-origin rules can prevent playback. VibeFlix does not host or proxy media files.',
  },
  {
    question: 'Does my library sync to other devices?',
    answer: 'Not currently. Saved titles, history, and progress stay in local browser storage and are not sent to the catalog service.',
  },
]

export default function WelcomeScreen({ featured, heroBackdrop, onBrowse }: WelcomeScreenProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [failedArtwork, setFailedArtwork] = useState('')
  const showArtwork = Boolean(heroBackdrop && heroBackdrop !== failedArtwork)
  const featuredMeta = featured
    ? [featured.year > 0 ? String(featured.year) : '', featured.kind, featured.source].filter(Boolean).join(' · ')
    : ''

  return (
    <div className="welcome-page" id="welcome">
      <header className="welcome-header">
        <a className="welcome-brand" href="#welcome" aria-label="VibeFlix welcome page">
          <span className="welcome-brand__mark" aria-hidden="true">V</span>
          <span>VibeFlix</span>
        </a>
        <div className="welcome-header__right">
          <span className="welcome-header__note">YOUR PERSONAL WATCHLIST</span>
          <button className="welcome-header__browse" type="button" onClick={onBrowse}>
            Browse catalog <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main>
        <section className="welcome-hero" aria-labelledby="welcome-title">
          {showArtwork && (
            <img
              className="welcome-hero__art"
              src={heroBackdrop}
              alt=""
              onError={() => setFailedArtwork(heroBackdrop)}
            />
          )}
          <div className="welcome-hero__scrim" />
          <div className="welcome-hero__copy">
            <span className="welcome-kicker"><i /> A LITTLE MORE YOU. A LOT MORE TO WATCH.</span>
            <h1 id="welcome-title">Find your next<br /><em>favorite story.</em></h1>
            <p>Discover movies and series from your connected catalogs. Save what you love, explore new worlds, and pick up where you left off.</p>
            <div className="welcome-hero__actions">
              <button className="welcome-primary" type="button" onClick={onBrowse}>
                <Play size={17} fill="currentColor" aria-hidden="true" /> Explore the catalog <ArrowRight size={16} aria-hidden="true" />
              </button>
              <a className="welcome-secondary" href="#welcome-features">See how it works <ChevronDown size={16} aria-hidden="true" /></a>
            </div>
            <div className="welcome-hero__assurance">
              <span><ShieldCheck size={14} aria-hidden="true" /> NO ACCOUNT REQUIRED</span>
              <b aria-hidden="true">·</b>
              <span>YOUR LIST STAYS IN THIS BROWSER</span>
            </div>
          </div>
          <div className="welcome-hero__stamp" aria-hidden="true">
            <span className="welcome-hero__stamp-label">VIBEFLIX</span>
            <span className="welcome-hero__stamp-line" />
            <span>{featured ? featured.source.toUpperCase() : 'YOUR NEXT WATCH'}</span>
          </div>
          {featured && (
            <aside className="welcome-featured" aria-label="Featured catalog title">
              <span className="welcome-featured__label"><i /> FEATURED PICK</span>
              <strong>{featured.name}</strong>
              <span>{featuredMeta}</span>
            </aside>
          )}
          <div className="welcome-hero__fade" />
        </section>

        <section className="welcome-features" id="welcome-features" aria-labelledby="welcome-features-title">
          <div className="welcome-section-heading">
            <span className="welcome-kicker">THE VIBEFLIX EXPERIENCE</span>
            <h2 id="welcome-features-title">A better way to find <em>your next watch.</em></h2>
            <p>Everything you need to discover, save, and return to a title—all in one simple place.</p>
          </div>
          <div className="welcome-feature-grid">
            <article className="welcome-feature-card">
              <span className="welcome-feature-card__icon"><Search size={21} aria-hidden="true" /></span>
              <span className="welcome-feature-card__number">01 / DISCOVER</span>
              <h3>Explore connected catalogs</h3>
              <p>Search titles, browse movies and series, and switch between the sources available to VibeFlix.</p>
            </article>
            <article className="welcome-feature-card">
              <span className="welcome-feature-card__icon"><BookmarkCheck size={21} aria-hidden="true" /></span>
              <span className="welcome-feature-card__number">02 / KEEP</span>
              <h3>Make your own list</h3>
              <p>Save favorites and keep a local viewing history. Your library stays in this browser, not on a remote account.</p>
            </article>
            <article className="welcome-feature-card">
              <span className="welcome-feature-card__icon"><Clock3 size={21} aria-hidden="true" /></span>
              <span className="welcome-feature-card__number">03 / PICK UP</span>
              <h3>Carry on where you paused</h3>
              <p>For browser-ready streams, VibeFlix remembers your progress and makes it easy to find the next episode.</p>
            </article>
          </div>
        </section>

        <section className="welcome-library" aria-labelledby="welcome-library-title">
          <div className="welcome-library__copy">
            <span className="welcome-kicker">MADE FOR YOUR KIND OF NIGHT</span>
            <h2 id="welcome-library-title">Your watchlist.<br /><em>Your rules.</em></h2>
            <p>No subscription or profile setup is needed. Browse first, save titles as you go, and keep playback progress on your own device.</p>
            <button className="welcome-primary" type="button" onClick={onBrowse}>
              Start exploring <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="welcome-library__visual" aria-hidden="true">
            <div className="library-orbit library-orbit--one" />
            <div className="library-orbit library-orbit--two" />
            <div className="library-card library-card--back"><span>UP NEXT</span><i /><i /><i /></div>
            <div className="library-card library-card--front">
              <span className="library-card__label"><BookmarkCheck size={13} /> MY LIST</span>
              <strong>Saved for<br />a good night.</strong>
              <span className="library-card__footer">LOCAL TO THIS DEVICE <b>•</b> PRIVATE</span>
            </div>
          </div>
        </section>

        <section className="welcome-faq" id="welcome-faq" aria-labelledby="welcome-faq-title">
          <div className="welcome-section-heading">
            <span className="welcome-kicker">GOOD TO KNOW</span>
            <h2 id="welcome-faq-title">A few quick <em>answers.</em></h2>
          </div>
          <div className="welcome-faq__list">
            {FAQS.map((item, index) => {
              const expanded = openFaq === index
              return (
                <article className={`welcome-faq__item${expanded ? ' is-open' : ''}`} key={item.question}>
                  <h3>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`welcome-answer-${index}`}
                      onClick={() => setOpenFaq(expanded ? null : index)}
                    >
                      <span>{item.question}</span>
                      <span className="welcome-faq__toggle" aria-hidden="true">{expanded ? '−' : '+'}</span>
                    </button>
                  </h3>
                  <p id={`welcome-answer-${index}`} hidden={!expanded}>{item.answer}</p>
                </article>
              )
            })}
          </div>
          <button className="welcome-faq__cta" type="button" onClick={onBrowse}>
            Ready when you are <ArrowRight size={16} aria-hidden="true" />
          </button>
        </section>
      </main>

      <footer className="welcome-footer">
        <a className="welcome-brand" href="#welcome" aria-label="Back to VibeFlix welcome page">
          <span className="welcome-brand__mark" aria-hidden="true">V</span><span>VibeFlix</span>
        </a>
        <span>Personal-use client. Use only content you are authorized to access.</span>
        <span>Catalog and playback availability depend on connected providers.</span>
      </footer>
    </div>
  )
}
