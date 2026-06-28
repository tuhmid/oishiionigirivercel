-- OISHIIONIGIRI Database Schema
-- Run this in your Supabase SQL editor

create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- FLAVORS
-- ─────────────────────────────────────────
create table flavors (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  image_url   text,
  in_stock    boolean default true,
  stock_count int default 0,
  sort_order  int default 0,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- STORES (B2B wholesale customers)
-- ─────────────────────────────────────────
create table stores (
  id                       uuid primary key default uuid_generate_v4(),
  name                     text not null,
  address                  text,
  lat                      numeric(10,7),
  lng                      numeric(10,7),
  hours                    jsonb default '{}',
  -- e.g. {"mon":{"open":"09:00","close":"21:00"}, "tue":...}
  preferred_payment_method text check (preferred_payment_method in ('cash','check','zelle','square')),
  notes                    text,
  active                   boolean default true,
  delivery_days            text[] default '{}',
  created_at               timestamptz default now()
);

-- ─────────────────────────────────────────
-- STORE CONTACTS (multiple per store)
-- ─────────────────────────────────────────
create table store_contacts (
  id         uuid primary key default uuid_generate_v4(),
  store_id   uuid references stores(id) on delete cascade,
  name       text not null,
  role       text,
  phone      text,
  email      text,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- STORE FLAVOR ALLOCATIONS
-- Default qty per flavor per store (multiples of 3)
-- ─────────────────────────────────────────
create table store_flavor_allocations (
  id          uuid primary key default uuid_generate_v4(),
  store_id    uuid references stores(id) on delete cascade,
  flavor_id   uuid references flavors(id) on delete cascade,
  default_qty int not null default 3,
  unique(store_id, flavor_id)
);

-- ─────────────────────────────────────────
-- BATCHES (each B2B delivery cycle)
-- ─────────────────────────────────────────
create table batches (
  id            uuid primary key default uuid_generate_v4(),
  store_id      uuid references stores(id),
  delivery_date date not null,
  return_date   date,
  status        text default 'pending'
    check (status in ('pending','delivered','returned','invoiced','paid')),
  notes         text,
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────
-- BATCH ITEMS
-- ─────────────────────────────────────────
create table batch_items (
  id            uuid primary key default uuid_generate_v4(),
  batch_id      uuid references batches(id) on delete cascade,
  flavor_id     uuid references flavors(id),
  qty_delivered int not null,
  qty_sold      int,  -- filled in on return visit
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────
-- INVOICES
-- ─────────────────────────────────────────
create table invoices (
  id                  uuid primary key default uuid_generate_v4(),
  batch_id            uuid references batches(id),
  store_id            uuid references stores(id),
  amount_due          numeric(10,2) not null,
  amount_paid         numeric(10,2) default 0,
  payment_method      text check (payment_method in ('cash','check','zelle','square')),
  paid_at             timestamptz,
  sent_via            text check (sent_via in ('email','sms')),
  sent_to_contact_id  uuid references store_contacts(id),
  sent_at             timestamptz,
  created_at          timestamptz default now()
);

-- ─────────────────────────────────────────
-- CONSUMER ORDERS (B2C via Square)
-- ─────────────────────────────────────────
create table consumer_orders (
  id                       uuid primary key default uuid_generate_v4(),
  customer_name            text not null,
  customer_email           text,
  customer_phone           text,
  type                     text check (type in ('pickup','delivery')),
  delivery_address         text,
  status                   text default 'pending'
    check (status in ('pending','confirmed','ready','delivered','cancelled')),
  square_payment_id        text,
  square_order_id          text,
  total_amount             numeric(10,2),
  notes                    text,
  created_at               timestamptz default now()
);

-- ─────────────────────────────────────────
-- CONSUMER ORDER ITEMS
-- ─────────────────────────────────────────
create table consumer_order_items (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid references consumer_orders(id) on delete cascade,
  flavor_id     uuid references flavors(id),
  quantity      int not null,
  price_at_time numeric(10,2) not null
);

-- ─────────────────────────────────────────
-- STORE ORDER REQUESTS (B2B inquiry form)
-- ─────────────────────────────────────────
create table store_order_requests (
  id                   uuid primary key default uuid_generate_v4(),
  store_name           text not null,
  contact_name         text not null,
  phone                text,
  email                text,
  address              text,
  billable_name        text,
  billable_address     text,
  cert_authority_number text,
  resale_cert_url      text,
  message              text,
  status               text default 'new'
    check (status in ('new','reviewed','approved','rejected')),
  created_at           timestamptz default now()
);

-- ─────────────────────────────────────────
-- ROUTE PLANS
-- ─────────────────────────────────────────
create table route_plans (
  id           uuid primary key default uuid_generate_v4(),
  planned_date date not null,
  stops        jsonb not null default '[]',
  -- [{store_id, store_name, address, hours, scheduled_time, order_index}]
  notes        text,
  created_at   timestamptz default now()
);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- Public: read flavors only
-- Admin: full access (authenticated users)
-- ─────────────────────────────────────────
alter table flavors           enable row level security;
alter table stores            enable row level security;
alter table store_contacts    enable row level security;
alter table store_flavor_allocations enable row level security;
alter table batches           enable row level security;
alter table batch_items       enable row level security;
alter table invoices          enable row level security;
alter table consumer_orders   enable row level security;
alter table consumer_order_items enable row level security;
alter table store_order_requests enable row level security;
alter table route_plans       enable row level security;

-- Flavors: public read
create policy "public_read_flavors" on flavors for select using (true);

-- Flavors: admin write
create policy "admin_all_flavors" on flavors for all
  using (auth.role() = 'authenticated');

-- Consumer orders: insert from public (for checkout flow), read/update for admin
create policy "public_insert_consumer_orders" on consumer_orders for insert
  with check (true);
create policy "admin_all_consumer_orders" on consumer_orders for all
  using (auth.role() = 'authenticated');

create policy "public_insert_consumer_order_items" on consumer_order_items for insert
  with check (true);
create policy "admin_all_consumer_order_items" on consumer_order_items for all
  using (auth.role() = 'authenticated');

-- Store order requests: public insert
create policy "public_insert_store_requests" on store_order_requests for insert
  with check (true);
create policy "admin_all_store_requests" on store_order_requests for all
  using (auth.role() = 'authenticated');

-- All other tables: admin only
create policy "admin_all_stores" on stores for all using (auth.role() = 'authenticated');
create policy "admin_all_contacts" on store_contacts for all using (auth.role() = 'authenticated');
create policy "admin_all_allocations" on store_flavor_allocations for all using (auth.role() = 'authenticated');
create policy "admin_all_batches" on batches for all using (auth.role() = 'authenticated');
create policy "admin_all_batch_items" on batch_items for all using (auth.role() = 'authenticated');
create policy "admin_all_invoices" on invoices for all using (auth.role() = 'authenticated');
create policy "admin_all_routes" on route_plans for all using (auth.role() = 'authenticated');

-- ─────────────────────────────────────────
-- SEED DATA — sample flavors
-- ─────────────────────────────────────────
-- ─────────────────────────────────────────
-- MIGRATIONS (run these on existing databases)
-- ─────────────────────────────────────────
-- alter table stores add column if not exists delivery_days text[] default '{}';
-- alter table flavors add column if not exists stock_count int default 0;

-- ─────────────────────────────────────────
-- SEED DATA — sample flavors
-- ─────────────────────────────────────────
insert into flavors (name, description, sort_order) values
  ('Tuna Mayo',       'Classic Japanese tuna salad with Japanese mayo',    1),
  ('Spicy Tuna',      'Tuna with sriracha mayo and sesame',                2),
  ('Salmon',          'Fresh salmon with a hint of sesame oil',            3),
  ('Chicken Teriyaki','Grilled chicken thigh with sweet teriyaki glaze',   4),
  ('Umeboshi',        'Traditional pickled plum — tart and savory',        5),
  ('Veggie',          'Seasoned pickled vegetables and sesame',            6);
