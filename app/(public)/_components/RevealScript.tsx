// app/(public)/_components/RevealScript.tsx
// Tiny client component that wires up the scroll-reveal IntersectionObserver.
// Rendered once at the bottom of the page; adds .visible to every .reveal element.
'use client'

import { useEffect } from 'react'

export default function RevealScript() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal')
    if (!els.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 },
    )

    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return null
}
