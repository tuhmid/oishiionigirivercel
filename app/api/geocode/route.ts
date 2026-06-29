import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q || q.length < 4) return NextResponse.json([])

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=us`,
      {
        headers: {
          'User-Agent': 'OishiiOnigiri/1.0 (oishiionigirinyc@gmail.com)',
          'Accept-Language': 'en',
        },
      }
    )
    const data = await res.json()
    return NextResponse.json(data.map((d: { display_name: string }) => d.display_name))
  } catch {
    return NextResponse.json([])
  }
}
