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
      </div>
    </>
  )
}
