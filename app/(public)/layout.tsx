// app/(public)/layout.tsx
import '@/app/design-system.css'
import PublicNav from './_components/PublicNav'
import PublicFooter from './_components/PublicFooter'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="public-root">
      <PublicNav />
      {children}
      <PublicFooter />
    </div>
  )
}
