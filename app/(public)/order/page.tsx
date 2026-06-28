// app/(public)/order/page.tsx
import { createClient } from '@/lib/supabase/server'
import type { Flavor } from '@/types'
import OrderPageClient from '@/components/public/OrderPageClient'

export const metadata = { title: 'Order' }

const FLAVOR_META = [
  {
    sort_order: 1,
    description:
      'Glazed Atlantic salmon with house teriyaki, sesame seeds, and seasoned Japanese rice.',
    ingredients:
      'Rice, Salmon, Laver, Teriyaki Sauce (Soy Sauce [Water, Soybeans, Wheat, Salt], Sugar, Water, Modified Corn Starch, Onion Juice, Vinegar, Natural Flavor, Garlic Powder, Malic Acid, Spice, Sodium Benzoate, Disodium Inosinate, Disodium Guanylate), Sesame Seed, Brown Sugar, Salt, Rice Vinegar',
    allergens: ['Fish (Salmon)', 'Sesame', 'Soy', 'Wheat'],
    accent: '#E8C49A',
    accentLight: '#F5E6C8',
  },
  {
    sort_order: 2,
    description:
      'Fresh tuna with Siracha heat and Kewpie mayo on hand-seasoned Japanese rice.',
    ingredients:
      'Rice, Tuna, Seaweed, Brown Sugar, Salt, Rice Vinegar, Siracha (Chili, Sugar, Salt, Garlic, Distilled Vinegar, Potassium Sorbate, Sodium Bisulfite, Xanthan Gum), Kewpie (Vegetable Oil, Egg Yolk, Vinegar, Salt, Monosodium Glutamate [MSG], Spice, Natural Flavor)',
    allergens: ['Fish (Tuna)', 'Egg'],
    accent: '#E8A49A',
    accentLight: '#F5D5C8',
  },
  {
    sort_order: 3,
    description:
      'Creamy Japanese egg salad with Kewpie mayo, black pepper, and seasoned rice.',
    ingredients:
      'Rice, Egg, Laver, Kewpie (Vegetable Oil, Egg Yolk, Vinegar, Salt, Monosodium Glutamate [MSG], Spice, Natural Flavor), Brown Sugar, Salt, Rice Vinegar, Onion Powder, Garlic Powder, Black Pepper',
    allergens: ['Egg'],
    accent: '#E8D88A',
    accentLight: '#F5F0C8',
  },
  {
    sort_order: 4,
    description:
      'Classic tuna blended with Kewpie mayo on hand-seasoned Japanese rice.',
    ingredients:
      'Rice, Tuna, Seaweed, Kewpie Mayo (Vegetable Oil, Egg Yolk, Vinegar, Salt, MSG, Spice, Natural Flavor), Brown Sugar, Salt, Rice Vinegar',
    allergens: ['Fish (Tuna)', 'Egg'],
    accent: '#C8DCE8',
    accentLight: '#E8EFF5',
  },
  {
    sort_order: 5,
    description:
      'Traditional Japanese pickled plum — tart, savory, and authentically umami.',
    ingredients: 'Rice, Umeboshi (Pickled Plum), Seaweed, Salt, Rice Vinegar',
    allergens: [],
    accent: '#E89AAC',
    accentLight: '#F5C8D5',
  },
  {
    sort_order: 6,
    description:
      'Fermented soybeans with soy sauce on hand-seasoned Japanese rice — bold and earthy.',
    ingredients:
      'Rice, Natto (Fermented Soybeans), Seaweed, Soy Sauce (Water, Soybeans, Wheat, Salt), Brown Sugar, Salt, Rice Vinegar',
    allergens: ['Soy', 'Wheat'],
    accent: '#B0CC96',
    accentLight: '#D5E8C8',
  },
]

export type EnrichedFlavor = Flavor & {
  description: string
  ingredients: string
  allergens: string[]
  accent: string
  accentLight: string
}

export default async function OrderPage() {
  const supabase = await createClient()
  const { data: flavors } = await supabase
    .from('flavors')
    .select('*')
    .order('sort_order')

  const FLAVOR_NAMES: Record<number, string> = {
    1: 'Teriyaki Salmon', 2: 'Spicy Tuna', 3: 'Egg Sando',
    4: 'Tuna Mayo', 5: 'Umeboshi', 6: 'Natto',
  }

  const dbFlavors: Flavor[] = flavors?.length
    ? flavors
    : FLAVOR_META.map((m) => ({
        id: `preview-${m.sort_order}`,
        name: FLAVOR_NAMES[m.sort_order] ?? `Flavor ${m.sort_order}`,
        description: m.description,
        in_stock: true,
        sort_order: m.sort_order,
        image_url: null,
        created_at: '',
      }))

  const enrichedFlavors: EnrichedFlavor[] = dbFlavors.map((f: Flavor) => {
    const meta = FLAVOR_META.find((m) => m.sort_order === f.sort_order)
    return {
      ...f,
      description: meta?.description ?? f.description ?? '',
      ingredients: meta?.ingredients ?? '',
      allergens: meta?.allergens ?? [],
      accent: meta?.accent ?? '#E8E0D0',
      accentLight: meta?.accentLight ?? '#F5F0E6',
    }
  })

  return (
    <>
      <style>{`
        .order-page-hero {
          padding-top: 96px;
          padding-bottom: 48px;
          background: var(--paper);
          border-bottom: 1.5px solid var(--border);
          text-align: center;
        }
        @media (min-width: 768px) {
          .order-page-hero {
            padding-top: 110px;
            padding-bottom: 64px;
          }
        }
      `}</style>
      <div className="order-page-hero">
        <div className="container">
          <p className="t-label" style={{ marginBottom: '12px' }}>
            Fresh from NYC
          </p>
          <h1>Order</h1>
          <p
            className="t-body t-muted"
            style={{ marginTop: '12px', maxWidth: '480px', marginInline: 'auto' }}
          >
            Browse our flavors, pick your quantities, and check out securely via Square.
          </p>
        </div>
      </div>
      <OrderPageClient flavors={enrichedFlavors} />
    </>
  )
}
