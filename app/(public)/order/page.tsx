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
      'Korean-style marinated beef with sweet soy glaze on hand-seasoned Japanese rice.',
    ingredients:
      'Rice, Beef, Seaweed, Bulgogi Marinade (Soy Sauce [Water, Soybeans, Wheat, Salt], Sugar, Sesame Oil, Garlic, Ginger, Pear Juice, Black Pepper), Brown Sugar, Salt, Rice Vinegar, Sesame Seed',
    allergens: ['Soy', 'Wheat', 'Sesame'],
    accent: '#C8A882',
    accentLight: '#EDE0CC',
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
    1: 'Teriyaki Salmon', 2: 'Spicy Tuna', 3: 'Egg Sando', 4: 'Bulgogi Beef',
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
