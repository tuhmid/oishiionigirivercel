import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: { default: 'OISHII ONIGIRI', template: '%s | OISHII ONIGIRI' },
  description: 'Handcrafted Japanese rice balls made fresh everyday in Brooklyn, NYC.',
  openGraph: {
    title: 'OISHII ONIGIRI',
    description: 'Handcrafted Japanese rice balls made fresh everyday in Brooklyn, NYC.',
    siteName: 'OISHII ONIGIRI',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <Toaster richColors />
      </body>
    </html>
  )
}
