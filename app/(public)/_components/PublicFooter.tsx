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
