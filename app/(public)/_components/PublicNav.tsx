// app/(public)/_components/PublicNav.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function PublicNav() {
  const [scrolled, setScrolled] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <>
      <nav className={`pub-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="pub-nav-inner">

          {/* Brand */}
          <Link href="/" className="pub-nav-brand">
            <img src="/logo.png" alt="Oishii Onigiri logo" className="pub-nav-logo" />
            <span className="pub-nav-name">
              OISHII <span>ONIGIRI</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="pub-nav-links">
            <Link
              href="/"
              className={`pub-nav-link${isActive('/') ? ' active' : ''}`}
            >
              Home
            </Link>
            <Link
              href="/order"
              className={`pub-nav-link${isActive('/order') ? ' active' : ''}`}
            >
              Order
            </Link>
            <Link
              href="/wholesale"
              className={`pub-nav-link${isActive('/wholesale') ? ' active' : ''}`}
            >
              Wholesale
            </Link>
          </div>

          {/* Social icons — desktop only */}
          <div className="pub-nav-links" style={{ gap: 'var(--sp-4)' }}>
            <a href="https://www.instagram.com/oishiionioni/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="pub-nav-link" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4.5"/>
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
              </svg>
            </a>
            <a href="https://www.tiktok.com/@oishiionioni" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="pub-nav-link" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
              </svg>
            </a>
            <a href="https://www.linkedin.com/company/oishiionigiri" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="pub-nav-link" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
            </a>
          </div>

          {/* Desktop-only CTA */}
          <Link href="/order" className="btn btn-green btn-sm pub-nav-cta-desktop">
            Order Now
          </Link>

          {/* Mobile hamburger */}
          <button
            className={`pub-nav-hamburger${drawerOpen ? ' open' : ''}`}
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={drawerOpen}
          >
            <span />
            <span />
            <span />
          </button>

        </div>
      </nav>

      {/* Mobile drawer */}
      <div
        id="pub-nav-drawer"
        className={`pub-nav-drawer${drawerOpen ? ' open' : ''}`}
        aria-hidden={!drawerOpen}
      >
        <Link href="/" className="pub-nav-drawer-link">
          Home
        </Link>
        <Link href="/order" className="pub-nav-drawer-link">
          Order
        </Link>
        <Link href="/wholesale" className="pub-nav-drawer-link">
          Wholesale
        </Link>
        <div style={{ marginTop: 'var(--sp-8)' }}>
          <Link href="/order" className="btn btn-green btn-full">
            Order Now
          </Link>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-6)', marginTop: 'var(--sp-8)' }}>
          <a href="https://www.instagram.com/oishiionioni/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="pub-nav-link" style={{ display: 'flex', alignItems: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4.5"/>
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
          </a>
          <a href="https://www.tiktok.com/@oishiionioni" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="pub-nav-link" style={{ display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
            </svg>
          </a>
          <a href="https://www.linkedin.com/company/oishiionigiri" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="pub-nav-link" style={{ display: 'flex', alignItems: 'center' }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
              <circle cx="4" cy="4" r="2"/>
            </svg>
          </a>
        </div>
      </div>
    </>
  )
}
