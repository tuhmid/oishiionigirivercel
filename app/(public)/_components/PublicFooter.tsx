// app/(public)/_components/PublicFooter.tsx
import Link from 'next/link'

export default function PublicFooter() {
  return (
    <footer className="pub-footer">
      <div className="pub-footer-inner">

        {/* Column 1 — Brand */}
        <div>
          <img src="/logo.png" alt="Oishii Onigiri logo" className="pub-footer-logo" />
          <p className="pub-footer-brand">
            OISHII <span>ONIGIRI</span>
          </p>
          <p className="pub-footer-tagline" style={{ fontFamily: 'var(--font-serif)', marginTop: 'var(--sp-1)' }}>
            美味しいおにぎり
          </p>
          <p className="pub-footer-tagline">
            Handcrafted in Brooklyn, NYC
          </p>
        </div>

        {/* Column 2 — Navigate */}
        <div>
          <p className="pub-footer-heading">Navigate</p>
          <ul>
            <li><Link href="/" className="pub-footer-link">Home</Link></li>
            <li><Link href="/order" className="pub-footer-link">Order</Link></li>
            <li><Link href="/wholesale" className="pub-footer-link">Wholesale</Link></li>
          </ul>
        </div>

        {/* Column 3 — Contact */}
        <div>
          <p className="pub-footer-heading">Contact</p>
          <p className="pub-footer-link" style={{ cursor: 'default' }}>Made fresh everyday</p>
          <p className="pub-footer-link" style={{ cursor: 'default' }}>276 Chestnut Street, Brooklyn 11208</p>
          <p className="pub-footer-link" style={{ cursor: 'default' }}>Keep refrigerated</p>
        </div>

        {/* Column 4 — Social */}
        <div>
          <p className="pub-footer-heading">Follow Us</p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            <li>
              <a href="https://www.instagram.com/oishiionioni/" target="_blank" rel="noopener noreferrer" className="pub-footer-link" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4.5"/>
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                </svg>
                Instagram
              </a>
            </li>
            <li>
              <a href="https://www.tiktok.com/@oishiionioni" target="_blank" rel="noopener noreferrer" className="pub-footer-link" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
                </svg>
                TikTok
              </a>
            </li>
            <li>
              <a href="https://www.linkedin.com/company/oishiionigiri" target="_blank" rel="noopener noreferrer" className="pub-footer-link" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
                LinkedIn
              </a>
            </li>
          </ul>
        </div>

      </div>

      {/* Bottom bar */}
      <div className="pub-footer-bottom">
        <p className="pub-footer-copy">
          &copy; 2026 OISHII ONIGIRI &middot; All rights reserved
        </p>
      </div>
    </footer>
  )
}
