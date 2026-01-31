# Kande VendTech — Machine Management System

> **System Design Document v2.0**
> Last updated: 2025-07-13
> For: Kande VendTech (Las Vegas, NV)
> Integrates with: vend.kandedash.com (Ops Dashboard)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Data Models & Database Schema](#3-data-models--database-schema)
4. [Per-Machine Inventory System](#4-per-machine-inventory-system)
5. [Pricing Engine](#5-pricing-engine)
6. [Slot Positioning & Planogram Engine](#6-slot-positioning--planogram-engine)
7. [Bundling Engine](#7-bundling-engine)
8. [Sales Analytics Pipeline](#8-sales-analytics-pipeline)
9. [API Reference](#9-api-reference)
10. [Integration with Ops Dashboard](#10-integration-with-ops-dashboard)
11. [Implementation Plan](#11-implementation-plan)

---

## 1. Executive Summary

This system manages every aspect of Kande VendTech's smart vending machines — from what's in each slot to what price it shows, when to restock, and which products to swap based on performance data.

### What It Does

- **Inventory**: Tracks every slot in every machine. Knows current quantity, restock thresholds, expiration dates, and who restocked what when. Calculates par levels from actual sales velocity.
- **Pricing**: Implements psychological pricing (decoy, anchoring, bundling) with per-machine overrides. An office in Henderson gets different prices than a luxury high-rise on the Strip. Dynamic pricing adjusts for time-of-day and demand.
- **Positioning**: Maps physical slot layouts, generates heat maps of what positions sell best, runs A/B tests on product placement, and manages planogram templates by location type.
- **Bundling**: Auto-suggests bundles from co-purchase data, tracks conversion rates, and optimizes bundles for margin targets.
- **Analytics**: Per-machine revenue, per-product velocity, per-slot performance, time patterns, location benchmarks, shrink tracking, and basket analysis.

### Design Principles

1. **Real data, not theory.** Pricing rules come from operators doing $35K–$102K/month. Margins are based on actual COGS from Sam's Club, Costco, and Vistar.
2. **Las Vegas context.** 24/7 culture, extreme heat (beverages dominate), luxury high-rises, medical corridor in Henderson/Summerlin, tourist traffic near the Strip.
3. **Build incrementally.** Phase 1 ships in 4 weeks with core inventory + pricing. Full system in 16 weeks.
4. **Operator-friendly.** Stockers use a mobile app. Managers use the dashboard. The system generates the restock list — humans just execute it.

### Key Numbers (from Playbook)

| Metric | Target | Source |
|--------|--------|--------|
| Minimum margin per item | 50% | Kyle Davey |
| Target margin (ambient) | 60–65% | Anthony, Lane Folkers |
| Target margin (frozen) | 45–50% | Anthony |
| Net margin after all costs | 30–35% | Skool community consensus |
| Revenue per apartment unit | $8–10/month | Industry benchmark |
| Restock frequency | Every 3–4 days standard | Community consensus |
| Predictable revenue after | ~5 months | Anthony |

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
                    ┌────────────────────────────┐
                    │     vend.kandedash.com      │
                    │     (Ops Dashboard)         │
                    │  React + Tailwind + Charts  │
                    └─────────────┬──────────────┘
                                  │ HTTPS
                    ┌─────────────▼──────────────┐
                    │        API Gateway          │
                    │    (Node.js + Express)       │
                    │    Auth, Rate Limiting       │
                    └─────────────┬──────────────┘
                                  │
          ┌───────────┬───────────┼───────────┬──────────────┐
          ▼           ▼           ▼           ▼              ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
    │Inventory │ │ Pricing  │ │Planogram │ │ Bundle   │ │Analytics │
    │ Service  │ │ Engine   │ │ Engine   │ │ Engine   │ │ Pipeline │
    └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
         │            │            │            │            │
         └────────────┴────────────┴────────────┴────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │      PostgreSQL (Primary)    │
                    │  + Redis (Cache / Queues)    │
                    └─────────────┬──────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
     ┌──────────────┐   ┌──────────────┐    ┌──────────────┐
     │   Machine     │   │  Payment     │    │ Notification │
     │  Telemetry    │   │  Processor   │    │   Service    │
     │ (Stockwell/   │   │ (365/Moneta/ │    │ (SMS/Email/  │
     │  Haha/Moneta) │   │  Cantaloupe) │    │  Push)       │
     └──────────────┘   └──────────────┘    └──────────────┘
```

### 2.2 Technology Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Frontend** | React + Tailwind (existing dashboard) | Already built at vend.kandedash.com |
| **API** | Node.js + Express | Consistent with existing catalog tooling |
| **Database** | PostgreSQL on Railway | Relational data, complex aggregations, JSONB for flexible configs |
| **Cache** | Redis on Railway | Inventory counts, session cache, job queues |
| **Background Jobs** | BullMQ (Redis-backed) | Restock alerts, analytics aggregation, price recalculations |
| **Hosting** | Railway | Already used for other Kande projects |
| **Mobile** | PWA (Progressive Web App) | Stockers get a mobile-friendly restock app without app store hassle |
| **Notifications** | Twilio (SMS) + SendGrid (Email) | Restock alerts, stockout warnings |

### 2.3 Service Boundaries

**Inventory Service** — CRUD for machines, slots, stock levels. Handles restock workflows, expiration tracking, par level calculations.

**Pricing Engine** — Computes the final price for any product in any slot on any machine at any time. Applies location profiles, zone multipliers, time-of-day rules, psychological pricing, and per-machine overrides.

**Planogram Engine** — Manages slot assignment templates. Optimizes product placement based on margin, velocity, and zone rules. Runs A/B tests.

**Bundle Engine** — Generates bundle suggestions from co-purchase patterns. Manages active bundles. Tracks conversion and incremental revenue.

**Analytics Pipeline** — Aggregates raw transaction data into hourly/daily/weekly rollups. Computes per-machine, per-product, per-slot, per-location-type metrics. Powers dashboard visualizations.

---

## 3. Data Models & Database Schema

### 3.1 Entity Relationship Overview

```
locations ──< machines ──< machine_slots ──< slot_inventory_log
                │                │
                │                ├──< transactions
                │                │
                │                └── products (via product_id)
                │
                ├── pricing_profiles
                ├── planograms
                └── machine_pricing_overrides

products ──< product_batches (expiration tracking)
         ──< bundle_items ──< bundles
         ──< pricing_rules
         ──< decoy_configurations

transactions ──< transaction_items
             ──< bundle_redemptions
```

### 3.2 Core Tables

#### `locations`

```sql
CREATE TABLE locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,                          -- "The Martin, Downtown LV"
  address       TEXT NOT NULL,
  city          TEXT NOT NULL DEFAULT 'Las Vegas',
  state         TEXT NOT NULL DEFAULT 'NV',
  zip           TEXT,
  lat           DECIMAL(10, 7),
  lng           DECIMAL(10, 7),
  type          TEXT NOT NULL CHECK (type IN (
                  'luxury_apartment', 'standard_apartment', 'high_rise',
                  'office', 'medical', 'warehouse', 'hotel', 'gym',
                  'student_housing', 'other'
                )),
  unit_count    INT,                                   -- Apartment units or employee count
  foot_traffic  INT,                                   -- Estimated daily foot traffic
  has_airbnb    BOOLEAN DEFAULT FALSE,                 -- Airbnb units in building
  nearby_convenience BOOLEAN DEFAULT FALSE,            -- Convenience store within 2 blocks
  placement     TEXT CHECK (placement IN (
                  'mailroom', 'lobby', 'break_room', 'elevator_lobby',
                  'amenity_lounge', 'pool_area', 'fitness_center', 'other'
                )),
  access_hours  TEXT DEFAULT '24/7',                   -- "24/7" or "6AM-10PM"
  rev_share_type TEXT CHECK (rev_share_type IN (
                  'none', 'flat', 'percentage', 'tiered'
                )),
  rev_share_amount DECIMAL(8, 2),                      -- Dollar amount or percentage
  contact_name  TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes         TEXT,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'prospect', 'inactive')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_status ON locations(status);
```

#### `machines`

```sql
CREATE TABLE machines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_code    TEXT UNIQUE NOT NULL,                 -- "KVT-001"
  name            TEXT NOT NULL,                        -- "Martin Lobby Unit 1"
  location_id     UUID REFERENCES locations(id),
  
  -- Physical configuration
  equipment_type  TEXT NOT NULL CHECK (equipment_type IN (
                    'stockwell_365', 'haha_pro', 'picovision', 'moneta_kiosk',
                    'cantaloupe', 'traditional', 'micro_market', 'other'
                  )),
  total_rows      INT NOT NULL,                        -- e.g., 6
  cols_per_row    INT NOT NULL,                        -- e.g., 10 (can vary by row)
  row_config      JSONB,                               -- { "A": { "cols": 10, "height_cm": 25 }, ... }
  temperature     TEXT DEFAULT 'ambient' CHECK (temperature IN (
                    'ambient', 'refrigerated', 'frozen', 'mixed'
                  )),
  has_touchscreen BOOLEAN DEFAULT TRUE,
  
  -- Connectivity
  connectivity    TEXT CHECK (connectivity IN ('wifi', 'cellular', 'router')),
  router_model    TEXT,
  sim_provider    TEXT,
  
  -- Operations
  pricing_profile_id UUID REFERENCES pricing_profiles(id),
  planogram_id       UUID REFERENCES planograms(id),
  restock_frequency_days INT DEFAULT 3,
  status          TEXT DEFAULT 'active' CHECK (status IN (
                    'active', 'maintenance', 'offline', 'decommissioned'
                  )),
  last_restocked  TIMESTAMPTZ,
  last_sale       TIMESTAMPTZ,
  install_date    DATE,
  
  -- Telemetry
  telemetry_id    TEXT,                                -- External ID from Stockwell/Haha/Moneta
  payment_processor TEXT,                              -- '365', 'moneta', 'cantaloupe'
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_machines_location ON machines(location_id);
CREATE INDEX idx_machines_status ON machines(status);
```

#### `machine_slots`

```sql
CREATE TABLE machine_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  
  -- Position
  row_label       TEXT NOT NULL,                        -- "A", "B", "C"...
  col_number      INT NOT NULL,                         -- 1, 2, 3...
  slot_code       TEXT NOT NULL,                        -- "A1", "B3", "C10"
  zone            TEXT NOT NULL CHECK (zone IN (
                    'top_shelf',         -- Row A: hard to reach, standard items
                    'upper_reach',       -- Row B: easy reach, good visibility
                    'golden_zone',       -- Rows C-D: eye level, PRIME real estate
                    'lower_reach',       -- Row E: below eye, heavier items
                    'bottom_shelf',      -- Row F: bend required, bulk/heavy
                    'impulse_checkout'   -- Near payment area
                  )),
  
  -- Current product
  product_id      UUID REFERENCES products(id),
  current_qty     INT NOT NULL DEFAULT 0,
  max_capacity    INT NOT NULL DEFAULT 10,
  min_threshold   INT NOT NULL DEFAULT 2,              -- Restock alert trigger
  par_level       INT,                                 -- Ideal stock level (calculated)
  
  -- Pricing override (null = use pricing engine)
  price_override  DECIMAL(6, 2),
  
  -- State
  status          TEXT DEFAULT 'active' CHECK (status IN (
                    'active', 'empty', 'jammed', 'disabled', 'reserved'
                  )),
  last_sale_at    TIMESTAMPTZ,
  last_restock_at TIMESTAMPTZ,
  
  -- Calculated fields (updated by analytics pipeline)
  sales_velocity_7d  DECIMAL(6, 2) DEFAULT 0,          -- Units/day over last 7 days
  sales_velocity_30d DECIMAL(6, 2) DEFAULT 0,          -- Units/day over last 30 days
  revenue_30d        DECIMAL(10, 2) DEFAULT 0,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(machine_id, row_label, col_number)
);

CREATE INDEX idx_slots_machine ON machine_slots(machine_id);
CREATE INDEX idx_slots_product ON machine_slots(product_id);
CREATE INDEX idx_slots_zone ON machine_slots(zone);
CREATE INDEX idx_slots_qty ON machine_slots(current_qty) WHERE current_qty <= 2;
```

#### `products`

```sql
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku             TEXT UNIQUE,                          -- Internal SKU
  upc             TEXT,                                 -- Barcode
  name            TEXT NOT NULL,                        -- "Red Bull 8.4oz"
  brand           TEXT,
  
  -- Categorization
  category        TEXT NOT NULL,                        -- "energy_drink", "chips", "candy", etc.
  subcategory     TEXT,                                 -- "flamin_hot", "zero_sugar"
  is_healthy      BOOLEAN DEFAULT FALSE,
  is_convenience  BOOLEAN DEFAULT FALSE,               -- TP, paper towels, etc.
  
  -- Physical
  size_label      TEXT,                                -- "8.4oz", "16oz", "6-pack"
  size_oz         DECIMAL(6, 2),
  weight_oz       DECIMAL(6, 2),
  height_cm       DECIMAL(6, 2),                       -- For planogram fitting
  width_cm        DECIMAL(6, 2),
  depth_cm        DECIMAL(6, 2),
  
  -- Pricing
  cogs            DECIMAL(6, 2) NOT NULL,              -- Cost of goods sold
  msrp            DECIMAL(6, 2),                       -- Manufacturer suggested
  gas_station_price DECIMAL(6, 2),                     -- Gas station benchmark (our anchor)
  default_price   DECIMAL(6, 2) NOT NULL,              -- Our default selling price
  min_margin      DECIMAL(4, 3) DEFAULT 0.50,          -- Never sell below 50% margin
  
  -- Sourcing
  primary_source  TEXT,                                -- "sams_club", "costco", "vistar", "vendhub"
  is_variety_pack BOOLEAN DEFAULT FALSE,               -- Flag: avoid at scale
  
  -- Metadata
  image_url       TEXT,
  catalog_url     TEXT,                                -- Link to products.kandevendtech.com
  
  -- Performance (updated by analytics)
  avg_velocity    DECIMAL(6, 2) DEFAULT 0,             -- Avg units/day across all machines
  total_units_30d INT DEFAULT 0,
  popularity_rank INT,
  
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'testing')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_brand ON products(brand);
```

#### `product_batches` (Expiration Tracking)

```sql
CREATE TABLE product_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id),
  machine_id      UUID NOT NULL REFERENCES machines(id),
  slot_id         UUID REFERENCES machine_slots(id),
  
  batch_code      TEXT,                                -- Lot number if available
  quantity         INT NOT NULL,
  cogs_per_unit   DECIMAL(6, 2) NOT NULL,             -- Actual cost for this batch
  source          TEXT,                                -- Where purchased
  
  received_date   DATE NOT NULL,
  expiration_date DATE,                                -- NULL for non-perishable
  
  -- Tracking
  qty_remaining   INT NOT NULL,
  qty_sold        INT DEFAULT 0,
  qty_expired     INT DEFAULT 0,                       -- Shrink tracking
  qty_damaged     INT DEFAULT 0,
  
  status          TEXT DEFAULT 'active' CHECK (status IN (
                    'active', 'depleted', 'expired', 'recalled'
                  )),
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batches_expiration ON product_batches(expiration_date) 
  WHERE status = 'active' AND expiration_date IS NOT NULL;
CREATE INDEX idx_batches_machine ON product_batches(machine_id);
```

#### `transactions`

```sql
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id      UUID NOT NULL REFERENCES machines(id),
  location_id     UUID NOT NULL REFERENCES locations(id),
  
  -- Timing
  sold_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hour_of_day     SMALLINT GENERATED ALWAYS AS (EXTRACT(HOUR FROM sold_at)) STORED,
  day_of_week     SMALLINT GENERATED ALWAYS AS (EXTRACT(DOW FROM sold_at)) STORED,
  
  -- Payment
  payment_method  TEXT CHECK (payment_method IN ('card', 'mobile', 'cash', 'apple_pay', 'google_pay')),
  processor_txn_id TEXT,                               -- From 365/Moneta/Cantaloupe
  
  -- Totals
  subtotal        DECIMAL(8, 2) NOT NULL,
  discount_amount DECIMAL(8, 2) DEFAULT 0,
  total_amount    DECIMAL(8, 2) NOT NULL,
  total_cogs      DECIMAL(8, 2) NOT NULL,
  margin_amount   DECIMAL(8, 2) GENERATED ALWAYS AS (total_amount - total_cogs) STORED,
  margin_pct      DECIMAL(4, 3),
  
  -- Bundle
  bundle_id       UUID REFERENCES bundles(id),
  is_bundle       BOOLEAN DEFAULT FALSE,
  
  -- Analytics flags
  is_peak_hour    BOOLEAN DEFAULT FALSE,
  pricing_profile TEXT,                                -- Which profile was active
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Partitioned by month for query performance
-- In production, consider: PARTITION BY RANGE (sold_at)

CREATE INDEX idx_txn_machine ON transactions(machine_id, sold_at DESC);
CREATE INDEX idx_txn_location ON transactions(location_id, sold_at DESC);
CREATE INDEX idx_txn_time ON transactions(sold_at DESC);
CREATE INDEX idx_txn_hour ON transactions(hour_of_day);
CREATE INDEX idx_txn_bundle ON transactions(bundle_id) WHERE is_bundle = TRUE;
```

#### `transaction_items`

```sql
CREATE TABLE transaction_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  slot_id         UUID NOT NULL REFERENCES machine_slots(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  batch_id        UUID REFERENCES product_batches(id),
  
  quantity        INT NOT NULL DEFAULT 1,
  unit_price      DECIMAL(6, 2) NOT NULL,
  unit_cogs       DECIMAL(6, 2) NOT NULL,
  line_total      DECIMAL(8, 2) NOT NULL,
  margin_pct      DECIMAL(4, 3),
  
  -- Context
  was_decoy       BOOLEAN DEFAULT FALSE,               -- Item was a decoy product
  was_anchor      BOOLEAN DEFAULT FALSE,               -- Item was an anchor product
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_txn_items_product ON transaction_items(product_id, created_at DESC);
CREATE INDEX idx_txn_items_slot ON transaction_items(slot_id, created_at DESC);
```

#### `restock_events`

```sql
CREATE TABLE restock_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id      UUID NOT NULL REFERENCES machines(id),
  
  -- Who & When
  restocked_by    TEXT NOT NULL,                        -- Staff member name or ID
  restocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_min    INT,                                 -- How long did it take
  
  -- What
  items           JSONB NOT NULL,                      -- Array of { slot_id, product_id, qty_added, qty_before, qty_after }
  total_items     INT NOT NULL,
  total_cost      DECIMAL(8, 2),                       -- Cost of goods restocked
  
  -- Verification
  photo_url       TEXT,                                -- Photo of stocked machine
  notes           TEXT,
  
  -- Waste captured during restock
  expired_items   JSONB,                               -- Items pulled as expired
  damaged_items   JSONB,                               -- Items pulled as damaged
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_restock_machine ON restock_events(machine_id, restocked_at DESC);
CREATE INDEX idx_restock_by ON restock_events(restocked_by);
```

### 3.3 Pricing Tables

#### `pricing_profiles`

```sql
CREATE TABLE pricing_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,                        -- "Luxury Apartment Premium"
  location_type   TEXT NOT NULL,                        -- Maps to location.type
  description     TEXT,
  
  -- Base rules
  base_markup     DECIMAL(4, 2) NOT NULL DEFAULT 3.00, -- 3× COGS default (Jason Carlin rule)
  price_anchor    TEXT DEFAULT 'gas_station',           -- Benchmark: gas_station, not walmart
  
  -- Category markups (override base_markup per category)
  category_markups JSONB DEFAULT '{}',
  -- Example: { "energy_drink": 2.0, "chips": 3.5, "protein": 2.3, "candy": 3.5, "water": 3.2 }
  
  -- Zone multipliers
  zone_multipliers JSONB DEFAULT '{
    "golden_zone": 1.0,
    "upper_reach": 1.0,
    "top_shelf": 1.0,
    "lower_reach": 1.0,
    "bottom_shelf": 1.0,
    "impulse_checkout": 1.0
  }',
  
  -- Time-of-day pricing
  peak_hours      INT[] DEFAULT '{7,8,12,13,17,18}',
  peak_multiplier DECIMAL(3, 2) DEFAULT 1.00,          -- Default: no peak pricing
  
  -- Psychological pricing
  charm_strategy  TEXT DEFAULT '99' CHECK (charm_strategy IN ('99', '95', '49', 'smart')),
  
  -- Display
  show_compare_price BOOLEAN DEFAULT FALSE,            -- Show "Compare at $X.XX" (anchoring)
  compare_source     TEXT DEFAULT 'gas_station',       -- What to compare against
  
  is_default      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `machine_pricing_overrides`

Per-machine overrides that sit on top of the pricing profile.

```sql
CREATE TABLE machine_pricing_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id      UUID NOT NULL REFERENCES machines(id),
  
  -- Override type
  override_type   TEXT NOT NULL CHECK (override_type IN (
                    'product',           -- Override price for a specific product
                    'category',          -- Override all products in a category
                    'global_multiplier'  -- Multiply all prices
                  )),
  
  product_id      UUID REFERENCES products(id),
  category        TEXT,
  
  -- The override
  price_override  DECIMAL(6, 2),                       -- Exact price (for product override)
  multiplier      DECIMAL(4, 2),                       -- Multiplier (for category/global)
  
  reason          TEXT,                                -- "Office tenants complained about energy drink prices"
  active          BOOLEAN DEFAULT TRUE,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_overrides_machine ON machine_pricing_overrides(machine_id) WHERE active = TRUE;
```

#### `decoy_configurations`

```sql
CREATE TABLE decoy_configurations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id      UUID,                                -- NULL = applies everywhere
  category        TEXT NOT NULL,                       -- "water", "chips", "energy_drink"
  
  -- The three-tier structure
  economy_product_id  UUID REFERENCES products(id),    -- Cheapest option
  economy_price       DECIMAL(6, 2),
  
  decoy_product_id    UUID REFERENCES products(id),    -- The DECOY (bad value on purpose)
  decoy_price         DECIMAL(6, 2),
  
  target_product_id   UUID REFERENCES products(id),    -- What we WANT them to buy
  target_price        DECIMAL(6, 2),
  
  -- Performance tracking
  economy_sales_30d   INT DEFAULT 0,
  decoy_sales_30d     INT DEFAULT 0,
  target_sales_30d    INT DEFAULT 0,
  target_conversion   DECIMAL(4, 3),                   -- % that chose target
  
  active              BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.4 Planogram Tables

#### `planograms`

```sql
CREATE TABLE planograms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,                        -- "Luxury Apt Standard v3"
  location_type   TEXT NOT NULL,
  equipment_type  TEXT NOT NULL,
  
  -- Layout
  rows            INT NOT NULL,
  cols_per_row    INT NOT NULL,
  layout          JSONB NOT NULL,                      -- Full slot → product mapping
  -- Example layout:
  -- {
  --   "A1": { "product_id": "...", "zone": "top_shelf", "facing": 1 },
  --   "C5": { "product_id": "...", "zone": "golden_zone", "facing": 2 },
  --   ...
  -- }
  
  -- Rules
  placement_rules JSONB,                               -- Zone assignments, adjacency rules
  
  -- Metadata
  version         INT DEFAULT 1,
  is_template     BOOLEAN DEFAULT TRUE,                -- Template vs. machine-specific
  performance_score DECIMAL(5, 2),                     -- Calculated from machines using this planogram
  
  created_by      TEXT,
  notes           TEXT,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `ab_tests`

```sql
CREATE TABLE ab_tests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,                        -- "Swap Cheetos and Doritos position"
  test_type       TEXT NOT NULL CHECK (test_type IN (
                    'product_position',    -- Swap slot positions
                    'price',               -- A/B price test
                    'planogram',           -- Full layout comparison
                    'bundle'               -- Bundle vs. no bundle
                  )),
  
  -- Configuration
  config          JSONB NOT NULL,
  -- For position test: { "control": { "slot": "C3", "product": "cheetos" }, "variant": { "slot": "C3", "product": "doritos" } }
  -- For price test: { "product_id": "...", "control_price": 2.49, "variant_price": 2.99 }
  
  control_machines  UUID[],                            -- Machine IDs for control
  variant_machines  UUID[],                            -- Machine IDs for variant
  
  -- Timeline
  start_date      DATE NOT NULL,
  end_date        DATE,
  min_sample_size INT DEFAULT 100,                     -- Min transactions before declaring winner
  
  -- Results (updated by analytics pipeline)
  control_sales   INT DEFAULT 0,
  variant_sales   INT DEFAULT 0,
  control_revenue DECIMAL(10, 2) DEFAULT 0,
  variant_revenue DECIMAL(10, 2) DEFAULT 0,
  p_value         DECIMAL(6, 4),
  winner          TEXT CHECK (winner IN ('control', 'variant', 'inconclusive', NULL)),
  
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'cancelled')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.5 Bundle Tables

#### `bundles`

```sql
CREATE TABLE bundles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,                        -- "Afternoon Pick-Me-Up"
  display_name    TEXT NOT NULL,                        -- "⚡ Energy Combo — Save $1.50!"
  type            TEXT NOT NULL CHECK (type IN (
                    'meal_deal', 'snack_pack', 'hydration_combo',
                    'energy_boost', 'breakfast', 'value_pack', 'seasonal'
                  )),
  
  -- Pricing
  individual_total DECIMAL(8, 2) NOT NULL,             -- Sum of individual prices
  bundle_price     DECIMAL(8, 2) NOT NULL,             -- Discounted price
  savings          DECIMAL(8, 2) GENERATED ALWAYS AS (individual_total - bundle_price) STORED,
  savings_pct      DECIMAL(4, 3),
  
  -- Scope
  machine_ids     UUID[],                              -- NULL = all machines
  location_types  TEXT[],                              -- NULL = all locations
  
  -- Schedule
  active_from     DATE,
  active_until    DATE,                                -- NULL = no end date
  time_start      TIME,                                -- NULL = all day
  time_end        TIME,
  
  -- Performance (updated by pipeline)
  total_sold      INT DEFAULT 0,
  conversion_rate DECIMAL(4, 3) DEFAULT 0,             -- % of eligible transactions that chose bundle
  incremental_revenue DECIMAL(10, 2) DEFAULT 0,
  
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'paused', 'expired')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bundle_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id       UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  quantity        INT DEFAULT 1,
  is_required     BOOLEAN DEFAULT TRUE,                -- FALSE = customer can swap this item
  alt_products    UUID[],                              -- Alternative products for this slot
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.6 Analytics Rollup Tables

```sql
-- Hourly rollup per machine (for time-of-day analysis)
CREATE TABLE analytics_hourly (
  machine_id      UUID NOT NULL REFERENCES machines(id),
  hour_start      TIMESTAMPTZ NOT NULL,                -- Truncated to hour
  
  total_transactions INT DEFAULT 0,
  total_units     INT DEFAULT 0,
  total_revenue   DECIMAL(10, 2) DEFAULT 0,
  total_cogs      DECIMAL(10, 2) DEFAULT 0,
  total_margin    DECIMAL(10, 2) DEFAULT 0,
  bundle_count    INT DEFAULT 0,
  
  PRIMARY KEY (machine_id, hour_start)
);

-- Daily rollup per machine
CREATE TABLE analytics_daily (
  machine_id      UUID NOT NULL REFERENCES machines(id),
  date            DATE NOT NULL,
  
  total_transactions INT DEFAULT 0,
  total_units     INT DEFAULT 0,
  total_revenue   DECIMAL(10, 2) DEFAULT 0,
  total_cogs      DECIMAL(10, 2) DEFAULT 0,
  total_margin    DECIMAL(10, 2) DEFAULT 0,
  avg_transaction DECIMAL(8, 2) DEFAULT 0,
  bundle_count    INT DEFAULT 0,
  
  -- Slot performance snapshot
  top_slot        TEXT,                                -- Slot code
  worst_slot      TEXT,
  stockout_count  INT DEFAULT 0,                       -- Slots that hit 0 qty
  
  PRIMARY KEY (machine_id, date)
);

-- Daily rollup per product (across all machines)
CREATE TABLE analytics_product_daily (
  product_id      UUID NOT NULL REFERENCES products(id),
  date            DATE NOT NULL,
  
  total_units     INT DEFAULT 0,
  total_revenue   DECIMAL(10, 2) DEFAULT 0,
  total_margin    DECIMAL(10, 2) DEFAULT 0,
  avg_price       DECIMAL(6, 2) DEFAULT 0,
  machines_sold   INT DEFAULT 0,                       -- How many machines sold this product
  
  PRIMARY KEY (product_id, date)
);

-- Weekly rollup per slot (for heat map + position analysis)
CREATE TABLE analytics_slot_weekly (
  slot_id         UUID NOT NULL REFERENCES machine_slots(id),
  week_start      DATE NOT NULL,                       -- Monday of the week
  
  total_units     INT DEFAULT 0,
  total_revenue   DECIMAL(10, 2) DEFAULT 0,
  total_margin    DECIMAL(10, 2) DEFAULT 0,
  
  -- Compared to machine average
  sales_index     DECIMAL(4, 2) DEFAULT 1.0,           -- 1.0 = average, 1.5 = 50% above
  revenue_index   DECIMAL(4, 2) DEFAULT 1.0,
  
  PRIMARY KEY (slot_id, week_start)
);
```

---

## 4. Per-Machine Inventory System

### 4.1 Real-Time Inventory Flow

```
Sale happens on machine
        │
        ▼
Payment processor sends webhook (365/Moneta/Cantaloupe)
        │
        ▼
API receives transaction → writes to `transactions` + `transaction_items`
        │
        ▼
Inventory Service: machine_slots.current_qty -= 1
        │
        ├── If current_qty <= min_threshold → trigger RESTOCK ALERT
        ├── If current_qty == 0 → trigger STOCKOUT ALERT
        └── Update batch tracking: product_batches.qty_remaining -= 1
```

### 4.2 Restock Alert Logic

```typescript
// Alert thresholds (configurable per machine)
const ALERT_LEVELS = {
  CRITICAL: 0.1,   // 10% of capacity remaining
  WARNING:  0.25,  // 25% of capacity remaining
  SCHEDULE: 0.5,   // 50% = schedule next restock
};

interface RestockAlert {
  level: 'critical' | 'warning' | 'scheduled';
  machine: {
    id: string;
    code: string;         // "KVT-001"
    name: string;         // "Martin Lobby Unit 1"
    location: string;     // "The Martin, Downtown LV"
  };
  slots: Array<{
    slot_code: string;    // "C3"
    product_name: string; // "Red Bull 8.4oz"
    current_qty: number;  // 1
    max_capacity: number; // 10
    par_level: number;    // 8
    qty_needed: number;   // 7
    est_stockout: string; // "Tomorrow 2 PM"
    velocity: number;     // 2.3 units/day
  }>;
  total_items_needed: number;
  est_restock_time_min: number;
  suggested_date: string;
}
```

**Alert delivery:**
- **Critical** (≤10%): Immediate SMS + push notification to assigned stocker + manager
- **Warning** (≤25%): Push notification to manager, added to next restock list
- **Scheduled** (≤50%): Quietly added to restock queue for next visit

### 4.3 Par Level Calculation

Par levels are not static — they adapt to actual sales velocity.

```typescript
function calculateParLevel(slot: MachineSlot, restockFreqDays: number): number {
  const velocity = slot.sales_velocity_7d; // Units per day (7-day rolling average)
  const stdDev = calculateVelocityStdDev(slot.id, 7); // Variability
  
  // Safety stock = 1.5× standard deviation (covers 93% of demand scenarios)
  const safetyStock = Math.ceil(stdDev * 1.5);
  
  // Base need = daily sales × days until next restock
  const baseNeed = Math.ceil(velocity * restockFreqDays);
  
  // Par = base + safety, but never exceed slot capacity
  const par = Math.min(baseNeed + safetyStock, slot.max_capacity);
  
  // Never below minimum threshold
  return Math.max(par, slot.min_threshold + 2);
}

// Example:
// Slot C3 (Red Bull 8.4oz) sells 2.3/day with 0.8 std dev
// Restock every 3 days
// Base need: ceil(2.3 × 3) = 7
// Safety: ceil(0.8 × 1.5) = 2
// Par level: 9 (out of 10 capacity)
```

### 4.4 Restock Workflow

```
STEP 1: GENERATE PICK LIST
─────────────────────────────
System generates a pick list for the warehouse:
  - Grouped by product (pick all Red Bull at once)
  - Quantities calculated from par levels minus current stock
  - Sorted by bin location in warehouse

STEP 2: GENERATE ROUTE
─────────────────────────────
If multiple machines need restocking:
  - Optimized route order
  - Estimated drive times between locations
  - Load plan for the vehicle (first machine = load last)

STEP 3: STOCKER EXECUTES
─────────────────────────────
Stocker opens mobile PWA:
  - Sees machine-by-machine restock list
  - For each machine:
    - Scans arriving at machine (GPS + timestamp)
    - See slot-by-slot quantities to add
    - Pulls expired items, logs waste
    - Confirms restock per slot
    - Takes photo of stocked machine

STEP 4: SYSTEM UPDATES
─────────────────────────────
On confirmation:
  - machine_slots.current_qty = par_level
  - machines.last_restocked = NOW()
  - restock_events record created with full detail
  - Expired items logged to product_batches
  - Alerts cleared
```

### 4.5 Expiration Tracking

```typescript
// Daily job: Check for items expiring within 7 days
async function checkExpirations() {
  const expiring = await db.query(`
    SELECT pb.*, p.name as product_name, m.machine_code, ms.slot_code
    FROM product_batches pb
    JOIN products p ON pb.product_id = p.id
    JOIN machines m ON pb.machine_id = m.id
    LEFT JOIN machine_slots ms ON pb.slot_id = ms.id
    WHERE pb.status = 'active'
      AND pb.expiration_date IS NOT NULL
      AND pb.expiration_date <= CURRENT_DATE + INTERVAL '7 days'
    ORDER BY pb.expiration_date ASC
  `);
  
  // Group by urgency
  const urgent = expiring.filter(b => b.expiration_date <= addDays(now(), 2));
  const upcoming = expiring.filter(b => b.expiration_date > addDays(now(), 2));
  
  // Urgent: Include in next restock visit for removal
  // Upcoming: Flag for priority selling (could trigger temporary discount)
}
```

### 4.6 Shrink Rate Tracking

```typescript
// Monthly shrink report per machine
interface ShrinkReport {
  machine_id: string;
  period: string;              // "2025-07"
  
  total_units_stocked: number;
  total_units_sold: number;
  total_units_expired: number;
  total_units_damaged: number;
  total_units_missing: number; // Stocked - sold - expired - damaged - remaining
  
  shrink_rate: number;         // (expired + damaged + missing) / stocked
  shrink_cost: number;         // Dollar value of shrink
  
  worst_products: Array<{
    product_name: string;
    shrink_units: number;
    shrink_value: number;
    reason: 'expired' | 'damaged' | 'missing';
  }>;
}

// Target: <3% shrink rate
// Fresh food: <5% (per Kyle Davey's warning — "tread carefully")
```

---

## 5. Pricing Engine

### 5.1 How Price Gets Calculated

When a customer looks at a product in the machine, here's how the displayed price is determined:

```
START: Product COGS
  │
  ├── 1. Check machine_pricing_overrides for exact price → USE IT (done)
  │
  ├── 2. Check machine_slots.price_override → USE IT (done)
  │
  └── 3. Run Pricing Engine:
        │
        ├── a. Get base price = COGS × category_markup (from pricing_profile)
        │      Fallback: COGS × base_markup (default 3×)
        │
        ├── b. Apply zone multiplier (golden_zone, impulse, etc.)
        │
        ├── c. Apply peak hour multiplier (if enabled and current hour is peak)
        │
        ├── d. Apply demand multiplier (high velocity = can charge more)
        │
        ├── e. Apply charm pricing ($X.49, $X.99, $X.95)
        │
        ├── f. Floor check: ensure price >= COGS / (1 - min_margin)
        │      (Never sell below 50% margin)
        │
        ├── g. Ceiling check: don't exceed gas_station_price × 1.15
        │      (Stay within 15% of gas station — our anchor benchmark)
        │
        └── h. FINAL PRICE
```

### 5.2 Pricing Profiles (Pre-Built for Las Vegas)

Based on master playbook data:

```typescript
const PRICING_PROFILES = {
  luxury_apartment: {
    name: "Luxury Apartment Premium",
    description: "Residents have disposable income, won't walk 2-3 blocks at 11:30 PM",
    base_markup: 3.2,  // Slightly above 3× — luxury tolerance
    price_anchor: "gas_station",
    category_markups: {
      energy_drink: 2.0,    // Red Bull 8.4oz: $2.00 COGS → $3.99 (50% margin)
      water: 3.2,           // Core Water: $0.93 → $2.99 (69% margin)
      protein: 2.3,         // Fair Life: $3.50 → $7.99 (56% margin)
      chips: 4.15,          // Cheetos: $0.60 → $2.49 (76% margin)
      candy: 3.5,           // Snickers: $0.50 → $1.75 (71% margin)
      candy_king: 2.71,     // King-size: $1.25 → $3.39 (63% margin)
      soda_can: 4.17,       // Cans: $0.36 → $1.50 (76% margin)
      staples: 4.0,         // Ramen: $0.30 → $1.50 (80% margin)
      convenience: 2.1,     // TP: $8.00 → $16.99 (53% margin)
    },
    peak_hours: [22, 23, 0, 1, 2],  // Late night premium in apartments
    peak_multiplier: 1.05,
    charm_strategy: "99",
    show_compare_price: false,  // Don't show comparisons in luxury
  },

  office: {
    name: "Office Standard",
    description: "White-collar, more price-sensitive. Offer cheaper can options alongside bottles.",
    base_markup: 2.8,  // Slightly lower — office sensitivity
    price_anchor: "gas_station",
    category_markups: {
      energy_drink: 1.88,   // Red Bull 8.4oz: $2.00 → $3.75 (47% margin)
      water: 2.9,           // Core Water: $0.93 → $2.69 (65% margin)
      protein: 2.1,         // Fair Life: $3.50 → $7.49 (53% margin)
      chips: 3.7,           // Cheetos: $0.60 → $2.29 (74% margin)
      candy: 3.3,           // Snickers: $0.50 → $1.49 (66% margin — under $1.50 psychological barrier)
      soda_can: 3.6,        // Cans: $0.36 → $1.29 (72% margin)
      staples: 3.5,
      convenience: 1.8,
    },
    peak_hours: [7, 8, 12, 13],  // Morning + lunch rush
    peak_multiplier: 1.0,  // No peak pricing in offices (builds resentment)
    charm_strategy: "49",  // .49 endings feel friendlier in offices
    show_compare_price: true,  // "Compare at $4.29 at 7-Eleven" — shows value
  },

  medical: {
    name: "Medical Facility",
    description: "Doctors/nurses on 12-hour shifts grab protein as meal replacements. High-income, not price-conscious.",
    base_markup: 3.0,
    price_anchor: "gas_station",
    category_markups: {
      energy_drink: 2.0,
      water: 3.0,
      protein: 2.3,         // Premium protein: $3.50 → $7.99 — "flying off shelves"
      chips: 4.0,
      candy: 3.5,
      soda_can: 4.0,
      staples: 3.5,
      healthy: 2.5,          // Healthy items do well here (salads: $3.00 → $7.65)
    },
    peak_hours: [6, 7, 12, 18, 19],  // Shift changes + lunch
    peak_multiplier: 1.0,  // No peak — sensitive environment
    charm_strategy: "99",
    show_compare_price: false,
  },

  hotel: {
    name: "Hotel / High-Rise with Airbnb",
    description: "Captive tourists + Airbnb guests. Highest tolerance for premium pricing.",
    base_markup: 3.5,  // Highest markup — captive + tourist
    price_anchor: "gas_station",
    category_markups: {
      energy_drink: 2.25,
      water: 3.8,           // Water in Vegas heat = gold
      protein: 2.5,
      chips: 4.5,
      candy: 4.0,
      soda_can: 5.0,        // Cans: $0.36 → $1.79 in hotel
      staples: 4.5,
      convenience: 2.5,     // Toiletries, chargers at premium
    },
    peak_hours: [21, 22, 23, 0, 1, 2, 3],  // Late night Vegas
    peak_multiplier: 1.08,
    charm_strategy: "99",
    show_compare_price: false,
  },

  gym: {
    name: "Gym / Fitness Center",
    description: "Protein and hydration focused. Watch theft in student housing gyms.",
    base_markup: 3.0,
    category_markups: {
      energy_drink: 2.0,
      water: 3.0,
      protein: 2.5,          // Premium pricing on protein at gyms
      chips: 3.5,
      candy: 3.0,
      soda_can: 3.5,
      healthy: 2.8,
    },
    peak_hours: [6, 7, 17, 18, 19],
    peak_multiplier: 1.0,
    charm_strategy: "99",
    show_compare_price: false,
  },

  warehouse: {
    name: "Warehouse / Manufacturing",
    description: "Captive audience, short 15-min breaks, can't leave. 150+ employees.",
    base_markup: 3.0,
    category_markups: {
      energy_drink: 2.0,
      water: 3.2,
      protein: 2.0,
      chips: 4.0,
      candy: 3.5,
      soda_can: 4.0,
      staples: 4.5,          // Ramen sells exceptionally well here
    },
    peak_hours: [6, 7, 12, 18],  // Shift breaks
    peak_multiplier: 1.0,
    charm_strategy: "99",
    show_compare_price: false,
  },
};
```

### 5.3 Psychological Pricing: Decoy Effect

The decoy makes the target product look like obviously the best deal.

**How it works:**
1. For each product category, create a 3-tier structure
2. The middle option (decoy) is intentionally bad value
3. Customers naturally gravitate to the target (best perceived value)

**Real examples from our catalog:**

```
WATER:
┌──────────────────────────────────────────────────────────┐
│  Economy:  Water 16.9oz bottle      $1.49  (cheapest)    │
│  DECOY:    Core Water 20oz          $2.79  (bad $/oz)    │
│  TARGET ★: Smartwater 33.8oz        $2.99  (best $/oz)   │
│                                                          │
│  Customer thinks: "Only 20¢ more for almost double the   │
│  water? Smartwater is obviously the deal."               │
└──────────────────────────────────────────────────────────┘

ENERGY DRINKS:
┌──────────────────────────────────────────────────────────┐
│  Economy:  Red Bull 8.4oz           $3.75                │
│  DECOY:    Monster 12oz             $3.99  (only 3.6oz   │
│            more for $0.24 more — weak value)             │
│  TARGET ★: Red Bull 12oz            $4.49  (4× more oz   │
│            for $0.50 more than decoy — clear winner)     │
└──────────────────────────────────────────────────────────┘

CANDY:
┌──────────────────────────────────────────────────────────┐
│  Economy:  Snickers Regular 1.86oz  $1.75                │
│  DECOY:    M&Ms 1.69oz             $1.99  (less candy,   │
│            more money)                                   │
│  TARGET ★: Snickers King Size 3.7oz $3.39  (2× candy     │
│            for <2× price)                                │
└──────────────────────────────────────────────────────────┘

CHIPS:
┌──────────────────────────────────────────────────────────┐
│  Economy:  Lays 1oz grab bag        $1.49                │
│  DECOY:    Doritos 2.75oz           $2.49  ($0.91/oz)    │
│  TARGET ★: Cheetos Flamin Hot 3.25oz $2.49 ($0.77/oz)    │
│                                                          │
│  Same price, more product. Cheetos wins.                 │
└──────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
class DecoyEngine {
  /**
   * Given a category, generate the optimal 3-tier pricing structure.
   * Returns placement recommendations (which slots to put them in).
   */
  generateDecoyTriad(
    category: string,
    machineId: string
  ): DecoyTriad {
    // 1. Get all products in category available on this machine
    const products = getProductsByCategory(category, machineId);
    
    // 2. Sort by size (ascending)
    const sorted = products.sort((a, b) => a.size_oz - b.size_oz);
    
    // 3. Pick economy (smallest/cheapest)
    const economy = sorted[0];
    
    // 4. Pick target (best margin × volume combination)
    const target = sorted.reduce((best, p) => {
      const score = p.margin_pct * p.avg_velocity;
      return score > best.score ? { product: p, score } : best;
    }, { product: sorted[sorted.length - 1], score: 0 }).product;
    
    // 5. Create/select decoy (between economy and target in size, but priced close to target)
    const decoy = findOrCreateDecoy(economy, target, products);
    
    // 6. Price the decoy to make target look great
    const decoyPrice = target.default_price * 0.93; // 7% cheaper than target
    // But decoy size should be only ~15% bigger than economy
    // Result: terrible $/oz ratio on decoy
    
    return {
      economy: { product: economy, suggestedPrice: economy.default_price },
      decoy: { product: decoy, suggestedPrice: decoyPrice },
      target: { product: target, suggestedPrice: target.default_price },
      placementRule: "Place all three adjacent. Target at eye level. Decoy directly above or below target."
    };
  }
}
```

### 5.4 Psychological Pricing: Anchoring

High-priced items reset price expectations. When you see a $7.99 Fair Life Protein first, the $3.99 Red Bull seems reasonable.

**Implementation rules:**
1. Place highest-priced items in the golden zone (rows C-D), first columns (left side) — that's where eyes go first
2. On touchscreen machines: show "Premium Picks" section first in the browse UI
3. Optionally show "Compare at" prices (office locations where price sensitivity is higher)

```typescript
interface AnchorConfig {
  // Which products serve as anchors
  anchor_products: Array<{
    product_id: string;
    price: number;                    // Must be highest in its neighborhood
    preferred_zone: 'golden_zone';
    preferred_position: 'left';       // First columns (left-to-right reading)
  }>;
  
  // What to surround them with
  target_products: Array<{
    product_id: string;
    price: number;
    max_distance_from_anchor: number; // Slots away (1-2 ideal)
  }>;
  
  // Compare-at display (for touchscreen)
  compare_prices: {
    enabled: boolean;
    source: 'gas_station' | '7eleven' | 'msrp';
    format: 'Compare at ${price}' | 'Retail: ${price}';
  };
}

// Real anchor examples for our catalog:
// - Fair Life Core Power 42g Protein: $7.99 (anchor for all beverages)
// - King-size candy: $3.39 (anchor for snack section)
// - Charmin 6-pack: $16.99 (anchor for convenience section)
// - Premium trail mix: $5.99 (anchor for healthy section)
```

### 5.5 Dynamic Pricing

Time-of-day and demand-based adjustments. Subtle — max ±10%.

```typescript
class DynamicPricingEngine {
  
  calculateDynamicMultiplier(
    slot: MachineSlot,
    machine: Machine,
    now: Date
  ): number {
    let multiplier = 1.0;
    const profile = machine.pricing_profile;
    
    // 1. Peak hour check
    const hour = now.getHours();
    if (profile.peak_hours.includes(hour)) {
      multiplier *= profile.peak_multiplier;
    }
    
    // 2. Demand-based (velocity vs. average)
    const velocityRatio = slot.sales_velocity_7d / slot.product.avg_velocity;
    if (velocityRatio > 1.5) {
      // High demand: nudge price up 3-5%
      multiplier *= 1.03 + Math.min(velocityRatio - 1.5, 0.5) * 0.04;
    } else if (velocityRatio < 0.5 && slot.sales_velocity_7d > 0) {
      // Low demand but still selling: nudge down 2-3%
      multiplier *= 0.97;
    }
    
    // 3. Low stock premium (scarce = can charge more)
    const stockRatio = slot.current_qty / slot.max_capacity;
    if (stockRatio <= 0.2 && slot.sales_velocity_7d > 1) {
      // Last few items of a popular product
      multiplier *= 1.05;
    }
    
    // 4. Las Vegas heat factor (beverages in summer)
    const month = now.getMonth();
    const isHotSeason = month >= 4 && month <= 9; // May-October
    if (isHotSeason && ['water', 'soda', 'energy_drink'].includes(slot.product.category)) {
      multiplier *= 1.03; // 3% premium on cold drinks in summer
    }
    
    // Cap: never more than ±10% from base
    return Math.max(0.90, Math.min(1.10, multiplier));
  }
}
```

### 5.6 Price Calculation Pipeline (Complete)

```typescript
class PricingEngine {
  
  calculatePrice(
    product: Product,
    slot: MachineSlot,
    machine: Machine,
    now: Date = new Date()
  ): PriceResult {
    
    // STEP 0: Check for hard overrides
    const slotOverride = slot.price_override;
    if (slotOverride !== null) {
      return { price: slotOverride, source: 'slot_override' };
    }
    
    const machineOverride = this.getMachineOverride(machine.id, product.id);
    if (machineOverride) {
      return { price: machineOverride.price_override, source: 'machine_override' };
    }
    
    // STEP 1: Base price from COGS × category markup
    const profile = machine.pricing_profile;
    const categoryMarkup = profile.category_markups[product.category] || profile.base_markup;
    let price = product.cogs * categoryMarkup;
    
    // STEP 2: Zone multiplier
    const zoneMultiplier = profile.zone_multipliers[slot.zone] || 1.0;
    price *= zoneMultiplier;
    
    // STEP 3: Dynamic pricing (time + demand)
    const dynamicMultiplier = this.dynamicEngine.calculateDynamicMultiplier(slot, machine, now);
    price *= dynamicMultiplier;
    
    // STEP 4: Charm pricing
    price = this.applyCharmPricing(price, profile.charm_strategy);
    
    // STEP 5: Floor check — minimum margin
    const minPrice = product.cogs / (1 - product.min_margin);
    if (price < minPrice) {
      price = this.applyCharmPricing(minPrice, profile.charm_strategy);
    }
    
    // STEP 6: Ceiling check — don't wildly exceed gas station
    if (product.gas_station_price) {
      const ceiling = product.gas_station_price * 1.15;
      if (price > ceiling) {
        price = this.applyCharmPricing(ceiling, profile.charm_strategy);
      }
    }
    
    return {
      price: Math.round(price * 100) / 100,
      source: 'engine',
      breakdown: {
        cogs: product.cogs,
        categoryMarkup,
        zoneMultiplier,
        dynamicMultiplier,
        charmStrategy: profile.charm_strategy,
        margin: (price - product.cogs) / price,
        profit: price - product.cogs,
      }
    };
  }
  
  applyCharmPricing(price: number, strategy: string): number {
    const whole = Math.floor(price);
    switch (strategy) {
      case '99': return whole + 0.99;
      case '95': return whole + 0.95;
      case '49':
        // $X.49 or $X.99, whichever is closer
        return (price - whole) < 0.75 ? whole + 0.49 : whole + 0.99;
      case 'smart':
        // Under $3: use .99. $3-$5: use .49. Over $5: use .95
        if (price < 3) return whole + 0.99;
        if (price < 5) return whole + 0.49;
        return whole + 0.95;
      default: return whole + 0.99;
    }
  }
}
```

---

## 6. Slot Positioning & Planogram Engine

### 6.1 Zone Map

```
Physical machine layout (6 rows × 10 columns = 60 slots):

┌──────────────────────────────────────────────────────────────────────┐
│  A1   A2   A3   A4   A5  │  A6   A7   A8   A9   A10               │
│  TOP SHELF — Standard items, less-popular, lighter weight           │
│  Store: healthy items (if required), slower movers                  │
├──────────────────────────────────────────────────────────────────────┤
│  B1   B2   B3   B4   B5  │  B6   B7   B8   B9   B10               │
│  UPPER REACH — Good visibility, easy grab                           │
│  Store: new products (test here), secondary best sellers            │
├──────────────────────────────────────────────────────────────────────┤
│  C1   C2   C3   C4   C5  │  C6   C7   C8   C9   C10               │
│  ★ GOLDEN ZONE — Prime eye-level real estate ★                     │
│  Store: HIGHEST MARGIN items, anchor products (left side),          │
│  best sellers, premium protein/energy                               │
├──────────────────────────────────────────────────────────────────────┤
│  D1   D2   D3   D4   D5  │  D6   D7   D8   D9   D10               │
│  ★ GOLDEN ZONE — Prime eye-level real estate ★                     │
│  Store: Target products from decoy triads, popular snacks           │
├──────────────────────────────────────────────────────────────────────┤
│  E1   E2   E3   E4   E5  │  E6   E7   E8   E9   E10               │
│  LOWER REACH — Below eye, requires slight bend                      │
│  Store: Standard beverages, soda cans, regular candy                │
├──────────────────────────────────────────────────────────────────────┤
│  F1   F2   F3   F4   F5  │  F6   F7   F8   F9   F10               │
│  BOTTOM SHELF — Bend required                                       │
│  Store: Heavy items (water bottles, 6-packs), bulk/value items      │
└──────────────────────────────────────────────────────────────────────┘
                         │ Payment │
                         │  Area   │  ← Impulse zone: small candy, gum,
                         └─────────┘    energy shots near here
```

### 6.2 Placement Rules

```typescript
const PLACEMENT_RULES = {
  golden_zone: {
    priority: [
      'anchor_products',        // Fair Life $7.99, premium trail mix
      'highest_margin_items',   // Items with >65% margin
      'best_sellers',           // Top velocity products
      'target_from_decoy',      // The product we want to push
    ],
    avoid: ['low_margin', 'slow_movers', 'heavy_items'],
    notes: 'Left side (cols 1-3) = first seen. Put anchors there.',
  },
  
  upper_reach: {
    priority: [
      'new_products',           // Test new items here — good visibility, not prime
      'secondary_sellers',      // 2nd tier velocity
      'decoy_products',         // Decoys near their targets (one row above golden)
    ],
    avoid: ['heavy_items'],
  },
  
  top_shelf: {
    priority: [
      'healthy_options',        // Required by some locations but low velocity
      'slow_movers',            // Still stocked but not prime placement
      'light_items',
    ],
    avoid: ['heavy_items', 'best_sellers'],
  },
  
  lower_reach: {
    priority: [
      'standard_beverages',     // Coke, Sprite, Dr. Pepper
      'regular_candy',          // Standard-size candy bars
      'economy_options',        // Economy tier from decoy triads
    ],
    avoid: ['premium_items', 'new_products'],
  },
  
  bottom_shelf: {
    priority: [
      'water_bottles',          // Heavy, people expect them low
      'multipacks',             // 6-packs of anything
      'bulk_items',
      'convenience_large',      // Charmin 6-pack ($16.99)
    ],
    avoid: ['impulse_items', 'small_items'],
  },
  
  impulse_checkout: {
    priority: [
      'small_candy',
      'gum',
      'energy_shots',
      'mints',
    ],
    maxPrice: 2.50,            // Impulse threshold
    avoid: ['expensive_items', 'large_items'],
  },
  
  // Adjacency rules (put these near each other)
  adjacency: {
    energy_drink: ['protein_bar', 'protein_shake'],
    chips: ['soda', 'dips'],
    sandwich: ['chips', 'drink'],
    coffee: ['pastry'],
    water: ['sports_drink'],
  },
};
```

### 6.3 Planogram Templates by Location Type

```typescript
const PLANOGRAM_TEMPLATES = {
  
  luxury_apartment: {
    name: "Luxury Apt Standard",
    description: "Convenience-focused, premium, late-night friendly",
    layout_philosophy: [
      "Heavy on beverages (water is #1 in hot climates)",
      "Premium protein/energy in golden zone",
      "Convenience items (TP, laundry pods, Advil) visible in lower rows",
      "Room-temp water option alongside cold",
      "Impulse snacks near payment",
    ],
    slot_allocation: {
      beverages: 0.35,      // 35% of slots — water, soda, energy
      snacks: 0.25,         // 25% — chips, crackers, nuts
      candy: 0.10,          // 10% — candy bars, gum
      protein: 0.10,        // 10% — Fair Life, protein bars
      staples: 0.10,        // 10% — ramen, Pop-Tarts
      convenience: 0.10,    // 10% — TP, paper towels, Advil, laundry pods
    },
  },

  office: {
    name: "Office Standard",
    description: "Lunch/snack focused, energy drinks important, some healthy options",
    layout_philosophy: [
      "Energy drinks prominently placed (highest velocity category)",
      "Lunch items: sandwiches where applicable",
      "Cheaper can options alongside premium bottles (reduces complaints)",
      "Healthy options visible (offices care about wellness image)",
    ],
    slot_allocation: {
      beverages: 0.30,
      snacks: 0.25,
      candy: 0.10,
      protein: 0.15,         // Higher protein for meal replacement
      staples: 0.10,
      healthy: 0.10,
    },
  },

  medical: {
    name: "Medical Facility",
    description: "12-hour shifts, protein as meal replacement, comfort food for stress",
    layout_philosophy: [
      "Fair Life Core Power at prime eye level — 6 sales/day possible",
      "Comfort food accessible (stressful environment → impulse buying)",
      "Healthy options visible (medical staff conscious)",
      "Water and hydration heavily stocked",
    ],
    slot_allocation: {
      beverages: 0.30,
      snacks: 0.20,
      candy: 0.10,
      protein: 0.20,         // Highest protein allocation — meal replacement
      staples: 0.10,
      healthy: 0.10,
    },
  },

  hotel: {
    name: "Hotel / Airbnb",
    description: "Tourist/guest focused, premium everything, convenience items important",
    layout_philosophy: [
      "Premium pricing across the board — captive audience",
      "Toiletries and convenience items (chargers, aspirin, condoms)",
      "Water heavily stocked — Vegas heat",
      "Late-night snack selection strong",
    ],
    slot_allocation: {
      beverages: 0.35,
      snacks: 0.20,
      candy: 0.10,
      protein: 0.05,
      staples: 0.05,
      convenience: 0.25,     // Highest convenience allocation
    },
  },

  warehouse: {
    name: "Warehouse / Manufacturing",
    description: "Quick break food, energy, hydration. Captive audience with short breaks.",
    layout_philosophy: [
      "Energy drinks and water dominate — physical labor",
      "Quick foods (ramen if microwave available, chips, candy)",
      "Larger sizes preferred — workers buy for value",
      "Simple, clear pricing — no complexity",
    ],
    slot_allocation: {
      beverages: 0.40,       // Highest beverage allocation
      snacks: 0.25,
      candy: 0.15,
      protein: 0.10,
      staples: 0.10,
    },
  },
};
```

### 6.4 Heat Map Generation

```typescript
interface SlotHeatMap {
  machine_id: string;
  period: string;               // "last_30d"
  
  slots: Array<{
    slot_code: string;          // "C3"
    zone: string;
    product_name: string;
    
    units_sold: number;
    revenue: number;
    margin: number;
    
    // Relative to machine average
    sales_index: number;        // 1.0 = average, 2.0 = 2× average
    revenue_index: number;
    
    // Heat classification
    heat: 'hot' | 'warm' | 'neutral' | 'cool' | 'cold';
    // hot: sales_index > 1.5
    // warm: 1.2 - 1.5
    // neutral: 0.8 - 1.2
    // cool: 0.5 - 0.8
    // cold: < 0.5
    
    // Recommendations
    action: 'keep' | 'swap_product' | 'reposition' | 'test' | 'remove';
    suggestion?: string;
  }>;
  
  // Machine-level insights
  golden_zone_revenue_share: number;  // What % of revenue comes from golden zone
  best_slot: string;
  worst_slot: string;
  avg_daily_revenue: number;
}
```

### 6.5 A/B Testing for Positions

```typescript
class PositionABTester {
  
  /**
   * Swap two products between slots and measure impact.
   * Requires ≥2 similar machines to run control vs. variant.
   */
  async createPositionTest(params: {
    name: string;
    product_a_id: string;        // e.g., Cheetos
    product_b_id: string;        // e.g., Doritos
    slot_a: string;              // e.g., "C3" (golden zone)
    slot_b: string;              // e.g., "E7" (lower reach)
    control_machines: string[];  // Keep original layout
    variant_machines: string[];  // Swap the products
    duration_days: number;       // Min 14 days for significance
  }): Promise<ABTest> {
    // 1. Record baseline metrics for both products on all machines (7 days prior)
    // 2. Execute swap on variant machines
    // 3. Run for duration
    // 4. Compare: did swapping positions change sales velocity?
    // 5. Statistical significance check (p < 0.05)
  }
  
  /**
   * Example test:
   * "Does putting Cheetos Flamin' Hot in C3 (golden) instead of E7 (lower)
   *  increase its daily sales enough to justify the premium placement?"
   * 
   * If Cheetos in C3 sells 3.2/day vs 1.8/day in E7,
   * and the displaced product only drops from 2.5/day to 2.1/day,
   * that's a net gain of +0.8 units/day → ~$2/day → $60/month per machine.
   */
}
```

---

## 7. Bundling Engine

### 7.1 Pre-Configured Bundle Templates

Based on actual product catalog and pricing data:

```typescript
const BUNDLE_TEMPLATES = [
  {
    type: 'meal_deal',
    name: 'Lunch Combo',
    display: '🍱 Lunch Combo — Save $1.50!',
    products: ['sandwich_any', 'chips_any', 'soda_bottle_any'],
    individual_est: 12.47,    // $7.99 + $2.49 + $1.99
    bundle_price: 10.99,
    savings: 1.48,
    margin_target: 0.45,      // 45% minimum on bundle
    best_for: ['office', 'medical', 'warehouse'],
  },
  {
    type: 'energy_boost',
    name: 'Energy Boost',
    display: '⚡ Energy Boost — Save $1.00!',
    products: ['energy_drink_any', 'protein_bar_any'],
    individual_est: 7.48,     // $3.99 + $3.49
    bundle_price: 6.49,
    savings: 0.99,
    margin_target: 0.50,
    best_for: ['office', 'gym', 'medical', 'warehouse'],
  },
  {
    type: 'hydration_combo',
    name: 'Stay Hydrated',
    display: '💧 Vegas Heat Combo — Save $1.00!',
    products: ['water_premium', 'sports_drink'],
    individual_est: 5.98,     // $2.99 + $2.99
    bundle_price: 4.99,
    savings: 0.99,
    margin_target: 0.55,
    best_for: ['gym', 'warehouse', 'hotel'],
    seasonal: 'summer',       // May-October in Vegas
  },
  {
    type: 'snack_pack',
    name: 'Snack Attack',
    display: '🍿 Snack Attack — Save $0.75!',
    products: ['chips_any', 'candy_any'],
    individual_est: 4.24,     // $2.49 + $1.75
    bundle_price: 3.49,
    savings: 0.75,
    margin_target: 0.55,
    best_for: ['apartment', 'office', 'student_housing'],
  },
  {
    type: 'breakfast',
    name: 'Morning Fuel',
    display: '☀️ Morning Fuel — Save $1.00!',
    products: ['protein_shake', 'granola_bar_any'],
    individual_est: 10.48,    // $7.99 Fair Life + $2.49
    bundle_price: 9.49,
    savings: 0.99,
    margin_target: 0.45,
    best_for: ['office', 'medical'],
    time_window: { start: '06:00', end: '10:00' },
  },
  {
    type: 'value_pack',
    name: 'Night Owl Pack',
    display: '🌙 Night Owl Pack — Save $2.00!',
    products: ['energy_drink_any', 'chips_any', 'candy_any'],
    individual_est: 8.23,     // $3.99 + $2.49 + $1.75
    bundle_price: 6.49,
    savings: 1.74,
    margin_target: 0.50,
    best_for: ['apartment', 'hotel'],
    time_window: { start: '21:00', end: '04:00' },
  },
];
```

### 7.2 Auto-Bundle Suggestion Engine

Uses co-purchase analysis (market basket analysis) to discover natural bundles.

```typescript
class BundleSuggestionEngine {
  
  /**
   * Analyze transaction history to find products frequently bought together.
   * Uses association rule mining (simplified Apriori).
   */
  async discoverCoPurchasePatterns(
    machineId: string,
    dayRange: number = 30
  ): Promise<CoPurchasePattern[]> {
    
    // 1. Get all multi-item transactions (basket size > 1)
    const multiItemTxns = await db.query(`
      SELECT t.id, array_agg(ti.product_id) as products
      FROM transactions t
      JOIN transaction_items ti ON t.id = ti.transaction_id
      WHERE t.machine_id = $1
        AND t.sold_at >= NOW() - INTERVAL '${dayRange} days'
      GROUP BY t.id
      HAVING COUNT(ti.id) > 1
    `, [machineId]);
    
    // 2. Count pair frequencies
    const pairCounts = new Map<string, number>();
    for (const txn of multiItemTxns) {
      const products = txn.products;
      for (let i = 0; i < products.length; i++) {
        for (let j = i + 1; j < products.length; j++) {
          const key = [products[i], products[j]].sort().join('|');
          pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
        }
      }
    }
    
    // 3. Calculate support and confidence for each pair
    const totalTxns = multiItemTxns.length;
    const patterns = Array.from(pairCounts.entries())
      .map(([key, count]) => {
        const [prodA, prodB] = key.split('|');
        return {
          product_a: prodA,
          product_b: prodB,
          co_purchase_count: count,
          support: count / totalTxns,       // How often this pair appears
          confidence_a: count / getProductTxnCount(prodA), // Given A, prob of B
          confidence_b: count / getProductTxnCount(prodB), // Given B, prob of A
        };
      })
      .filter(p => p.support > 0.03 && Math.max(p.confidence_a, p.confidence_b) > 0.15)
      .sort((a, b) => b.support - a.support);
    
    return patterns;
  }
  
  /**
   * Given discovered patterns, generate bundle recommendations.
   * Optimize for margin: pair high-margin with lower-margin items
   * to create bundles that hit the target blended margin.
   */
  async generateBundleRecommendations(
    patterns: CoPurchasePattern[],
    targetMargin: number = 0.50
  ): Promise<BundleRecommendation[]> {
    const recommendations = [];
    
    for (const pattern of patterns.slice(0, 10)) {
      const prodA = await getProduct(pattern.product_a);
      const prodB = await getProduct(pattern.product_b);
      
      const individualTotal = prodA.default_price + prodB.default_price;
      const totalCogs = prodA.cogs + prodB.cogs;
      
      // Calculate max discount that still hits target margin
      const maxBundlePrice = totalCogs / (1 - targetMargin);
      const maxDiscount = individualTotal - maxBundlePrice;
      
      // Suggest a discount that's attractive but preserves margin
      const suggestedDiscount = Math.min(
        individualTotal * 0.12,  // 12% off max
        maxDiscount * 0.8        // 80% of margin-allowed max
      );
      
      const bundlePrice = individualTotal - suggestedDiscount;
      const actualMargin = (bundlePrice - totalCogs) / bundlePrice;
      
      if (actualMargin >= targetMargin) {
        recommendations.push({
          products: [prodA, prodB],
          individual_total: individualTotal,
          suggested_bundle_price: Math.floor(bundlePrice * 100) / 100,
          savings: suggestedDiscount,
          blended_margin: actualMargin,
          co_purchase_frequency: pattern.support,
          estimated_weekly_sales: pattern.co_purchase_count / 4,
        });
      }
    }
    
    return recommendations;
  }
}
```

### 7.3 Bundle Performance Tracking

```typescript
// Tracked per bundle per machine per week
interface BundlePerformance {
  bundle_id: string;
  machine_id: string;
  week: string;
  
  times_displayed: number;       // How often bundle was shown on screen
  times_selected: number;        // How often customer chose bundle
  conversion_rate: number;       // selected / displayed
  
  total_revenue: number;
  total_margin: number;
  incremental_revenue: number;   // Revenue that wouldn't have happened without bundle
  
  // Comparison: did the bundle cannibalize individual sales?
  individual_sales_change: number; // Change in individual item sales since bundle launched
  net_revenue_impact: number;      // Bundle revenue - cannibalization
}
```

---

## 8. Sales Analytics Pipeline

### 8.1 Data Flow

```
MACHINE SALE
    │
    ▼
Webhook from payment processor (365/Moneta/Cantaloupe)
    │
    ▼
Transaction Ingestion API
    │
    ├── Write to `transactions` + `transaction_items`
    ├── Update `machine_slots.current_qty` (-1)
    ├── Update `product_batches.qty_remaining` (-1)
    ├── Check restock thresholds → alerts if needed
    │
    ▼
Background Job Queue (BullMQ)
    │
    ├── Hourly: Aggregate into `analytics_hourly`
    ├── Daily (midnight): Aggregate into `analytics_daily` + `analytics_product_daily`
    ├── Weekly (Monday): Aggregate into `analytics_slot_weekly`, update heat maps
    ├── Daily: Recalculate `sales_velocity_7d` and `sales_velocity_30d` on slots
    ├── Daily: Recalculate `par_level` on slots based on new velocity
    ├── Daily: Check expiration dates, flag items expiring within 7 days
    ├── Weekly: Update bundle co-purchase patterns
    ├── Weekly: Update decoy effectiveness metrics
    └── Monthly: Generate shrink report, location benchmark report
```

### 8.2 Core Analytics Queries

#### Per-Machine Dashboard

```sql
-- Machine overview for the last 30 days
SELECT 
  m.machine_code,
  m.name,
  l.name as location_name,
  l.type as location_type,
  COUNT(t.id) as total_transactions,
  SUM(t.total_amount) as total_revenue,
  SUM(t.margin_amount) as total_margin,
  AVG(t.total_amount) as avg_transaction,
  SUM(t.total_amount) / 30.0 as daily_revenue,
  COUNT(CASE WHEN t.is_bundle THEN 1 END) as bundle_transactions,
  COUNT(CASE WHEN t.is_bundle THEN 1 END)::float / NULLIF(COUNT(t.id), 0) as bundle_rate
FROM machines m
JOIN locations l ON m.location_id = l.id
LEFT JOIN transactions t ON m.id = t.machine_id 
  AND t.sold_at >= NOW() - INTERVAL '30 days'
WHERE m.id = $1
GROUP BY m.id, l.id;
```

#### Per-Product Velocity Report

```sql
-- Product performance across all machines (last 30 days)
SELECT 
  p.name as product,
  p.category,
  p.cogs,
  COUNT(ti.id) as units_sold,
  SUM(ti.unit_price) as total_revenue,
  AVG(ti.unit_price) as avg_price,
  AVG(ti.margin_pct) as avg_margin,
  COUNT(DISTINCT ti.slot_id) as slots_stocked,
  COUNT(ti.id)::float / 30.0 as daily_velocity,
  SUM(ti.line_total - (ti.unit_cogs * ti.quantity)) as total_profit
FROM products p
JOIN transaction_items ti ON p.id = ti.product_id
WHERE ti.created_at >= NOW() - INTERVAL '30 days'
GROUP BY p.id
ORDER BY total_profit DESC;
```

#### Hourly Sales Pattern

```sql
-- What hours sell best (across all machines, last 30 days)
SELECT 
  hour_of_day,
  COUNT(*) as transactions,
  SUM(total_amount) as revenue,
  AVG(total_amount) as avg_transaction
FROM transactions
WHERE sold_at >= NOW() - INTERVAL '30 days'
GROUP BY hour_of_day
ORDER BY hour_of_day;
```

#### Location Type Benchmarks

```sql
-- How does this machine compare to others of the same location type?
WITH machine_stats AS (
  SELECT 
    m.id as machine_id,
    l.type as location_type,
    SUM(t.total_amount) as revenue_30d,
    COUNT(t.id) as txn_count_30d,
    AVG(t.total_amount) as avg_txn
  FROM machines m
  JOIN locations l ON m.location_id = l.id
  LEFT JOIN transactions t ON m.id = t.machine_id 
    AND t.sold_at >= NOW() - INTERVAL '30 days'
  GROUP BY m.id, l.type
),
benchmarks AS (
  SELECT 
    location_type,
    AVG(revenue_30d) as avg_revenue,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY revenue_30d) as median_revenue,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY revenue_30d) as p75_revenue,
    AVG(avg_txn) as avg_transaction
  FROM machine_stats
  GROUP BY location_type
)
SELECT 
  ms.*,
  b.avg_revenue as type_avg_revenue,
  b.median_revenue as type_median_revenue,
  ms.revenue_30d / NULLIF(b.avg_revenue, 0) as performance_vs_avg,
  CASE 
    WHEN ms.revenue_30d >= b.p75_revenue THEN 'top_performer'
    WHEN ms.revenue_30d >= b.avg_revenue THEN 'above_average'
    WHEN ms.revenue_30d >= b.median_revenue THEN 'average'
    ELSE 'below_average'
  END as tier
FROM machine_stats ms
JOIN benchmarks b ON ms.location_type = b.location_type
WHERE ms.machine_id = $1;
```

#### Basket Analysis (Co-Purchase)

```sql
-- Products frequently bought together (same transaction)
WITH baskets AS (
  SELECT 
    t.id as txn_id,
    ti1.product_id as product_a,
    ti2.product_id as product_b,
    p1.name as name_a,
    p2.name as name_b
  FROM transactions t
  JOIN transaction_items ti1 ON t.id = ti1.transaction_id
  JOIN transaction_items ti2 ON t.id = ti2.transaction_id
  JOIN products p1 ON ti1.product_id = p1.id
  JOIN products p2 ON ti2.product_id = p2.id
  WHERE ti1.product_id < ti2.product_id  -- Avoid duplicates
    AND t.sold_at >= NOW() - INTERVAL '30 days'
)
SELECT 
  name_a,
  name_b,
  COUNT(*) as co_purchase_count,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(DISTINCT txn_id) FROM baskets), 4) as support
FROM baskets
GROUP BY product_a, product_b, name_a, name_b
HAVING COUNT(*) >= 5
ORDER BY co_purchase_count DESC
LIMIT 20;
```

### 8.3 Analytics Dashboard Sections

The analytics pipeline powers these views in vend.kandedash.com:

```
┌─────────────────────────────────────────────────────────────┐
│  FLEET OVERVIEW                                              │
│                                                             │
│  Total Machines: 12    Active: 11    Maintenance: 1         │
│  Today's Revenue: $847  MTD Revenue: $12,340                │
│  Avg Transaction: $4.23  Bundle Rate: 18%                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Revenue Trend (30 days)                   📈       │    │
│  │  [Line chart showing daily revenue]                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────────────────┐    │
│  │ TOP MACHINES     │  │ NEEDS ATTENTION              │    │
│  │ 1. Martin Lobby  │  │ ⚠️ KVT-007: 3 slots empty  │    │
│  │    $156/day      │  │ ⚠️ KVT-003: Below avg 23%  │    │
│  │ 2. Summerlin Med │  │ 🔧 KVT-009: Offline 2hrs   │    │
│  │    $142/day      │  │                              │    │
│  │ 3. Panorama Twr  │  │                              │    │
│  │    $128/day      │  │                              │    │
│  └──────────────────┘  └──────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  HOURLY PATTERN                                     │    │
│  │  [Bar chart: sales by hour of day]                  │    │
│  │  Peak: 12pm (lunch), 6pm (dinner), 11pm (late)     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  MACHINE DETAIL VIEW (click into any machine)               │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Revenue  │  │ Margin   │  │ Velocity │  │ Restock  │   │
│  │ $4,230   │  │ 62.3%    │  │ 8.2/day  │  │ In 2 days│   │
│  │ ↑ 12%    │  │ ↑ 1.2%   │  │ ↑ 5%     │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  SLOT HEAT MAP                                      │    │
│  │  [Visual grid showing hot/cold slots]               │    │
│  │                                                     │    │
│  │  A: 🟡 🟡 🟢 🟢 🟢 🟡 🟡 🟢 🟡 ⚪                │    │
│  │  B: 🟡 🟠 🟠 🟡 🟢 🟢 🟡 🟡 🟢 🟡                │    │
│  │  C: 🔴 🔴 🟠 🔴 🟠 🟠 🔴 🟠 🟡 🟡  ← Golden     │    │
│  │  D: 🟠 🔴 🔴 🟠 🟠 🟡 🟠 🔴 🟠 🟡  ← Golden     │    │
│  │  E: 🟡 🟡 🟡 🟢 🟢 🟡 🟡 🟢 🟡 🟢                │    │
│  │  F: 🟢 ⚪ 🟢 🟡 ⚪ 🟢 🟢 ⚪ 🟢 ⚪                │    │
│  │                                                     │    │
│  │  🔴 Hot (>1.5×)  🟠 Warm  🟡 Neutral               │    │
│  │  🟢 Cool (<0.8×)  ⚪ Cold/Empty                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  TOP PRODUCTS (this machine)                        │    │
│  │  1. Red Bull 8.4oz — 2.3/day — $3.99 — 50% margin  │    │
│  │  2. Core Water — 3.1/day — $2.99 — 69% margin      │    │
│  │  3. Fair Life Protein — 1.8/day — $7.99 — 56%      │    │
│  │  4. Cheetos Flamin' — 1.5/day — $2.49 — 76%       │    │
│  │  5. Coke Zero 20oz — 1.2/day — $2.49 — 65%        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────────────────┐    │
│  │ PRICING ANALYSIS │  │ BUNDLE PERFORMANCE           │    │
│  │ Avg margin: 62%  │  │ Lunch Combo: 12% take rate   │    │
│  │ Decoy lift: +23% │  │ Energy Boost: 8% take rate   │    │
│  │ Anchor effect: ✓ │  │ +$340/month incremental      │    │
│  └──────────────────┘  └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 8.4 Waste & Expiration Analytics

```typescript
interface WasteReport {
  period: string;
  
  // Fleet-wide
  total_units_stocked: number;
  total_units_sold: number;
  total_units_expired: number;
  total_units_damaged: number;
  total_shrink_cost: number;
  overall_shrink_rate: number;     // Target: <3%
  
  // By category
  category_shrink: Array<{
    category: string;
    shrink_rate: number;
    shrink_cost: number;
    worst_products: string[];
  }>;
  
  // By machine (find problem machines)
  machine_shrink: Array<{
    machine_code: string;
    location: string;
    shrink_rate: number;
    shrink_cost: number;
    notes: string;                 // "Fresh food spoilage — reduce par level"
  }>;
  
  // Recommendations
  recommendations: Array<{
    action: string;
    impact_est: string;
  }>;
  // e.g., "Remove sandwiches from KVT-004 — 15% shrink rate, only 0.8 sales/day"
  // e.g., "Reduce par level on salads at KVT-007 from 5 to 3 — 2.1 expire per restock cycle"
}
```

### 8.5 Competitor Price Comparison

```typescript
// Track competitor prices for benchmarking (gas station parity rule)
interface CompetitorPriceTracker {
  // Manual entry (stocker can snap prices during route)
  addCompetitorPrice(params: {
    product_name: string;
    competitor: string;           // "7-Eleven Henderson", "Circle K Tropicana"
    price: number;
    observed_date: Date;
    photo_url?: string;
  }): void;
  
  // Report: our prices vs. competitors
  generateComparisonReport(): ComparisonReport;
  // Shows: "Red Bull 8.4oz — Us: $3.99, 7-Eleven: $4.29, Circle K: $3.99"
  // Flag items where we're >10% above gas station (may need adjustment)
  // Flag items where we're >10% below (leaving money on the table)
}
```

---

## 9. API Reference

### 9.1 Authentication

All API calls require a Bearer token. The ops dashboard at vend.kandedash.com handles auth via the existing session system.

```
Authorization: Bearer <jwt_token>
```

### 9.2 Machines

```
GET    /api/v1/machines
       Query: ?status=active&location_type=luxury_apartment&page=1&limit=20
       Returns: paginated list of machines with location info

GET    /api/v1/machines/:id
       Returns: full machine detail including slots, current inventory, last sale

POST   /api/v1/machines
       Body: { machine_code, name, location_id, equipment_type, total_rows, cols_per_row, ... }
       Returns: created machine

PUT    /api/v1/machines/:id
       Body: partial update fields
       Returns: updated machine

GET    /api/v1/machines/:id/slots
       Returns: all slots with current product, quantity, zone, velocity

GET    /api/v1/machines/:id/inventory
       Returns: full inventory status with restock recommendations
       {
         machine: { ... },
         slots: [
           {
             slot_code: "C3",
             product: "Red Bull 8.4oz",
             current_qty: 2,
             max_capacity: 10,
             par_level: 9,
             qty_needed: 7,
             days_until_stockout: 0.9,
             status: "critical"
           },
           ...
         ],
         summary: {
           total_items_needed: 45,
           critical_slots: 3,
           warning_slots: 8,
           estimated_restock_time_min: 25,
           next_suggested_restock: "2025-07-14T08:00:00Z"
         }
       }

POST   /api/v1/machines/:id/restock
       Body: {
         restocked_by: "Marcus",
         items: [
           { slot_code: "C3", product_id: "...", qty_added: 7 },
           { slot_code: "D5", product_id: "...", qty_added: 8 },
           ...
         ],
         expired_items: [
           { slot_code: "A2", product_id: "...", qty: 1, reason: "expired" }
         ],
         photo_url: "https://...",
         notes: "Replaced expired sandwich in A2"
       }
       Returns: restock event record, updated slot quantities

GET    /api/v1/machines/:id/restock-history
       Query: ?from=2025-07-01&to=2025-07-13&limit=10
       Returns: list of restock events
```

### 9.3 Slots

```
GET    /api/v1/slots/:id
       Returns: slot detail with product, inventory, velocity, heat map data

PUT    /api/v1/slots/:id
       Body: { product_id, price_override, min_threshold, status }
       Returns: updated slot

PUT    /api/v1/slots/:id/assign-product
       Body: { product_id, initial_qty, price_override? }
       Returns: updated slot with new product assignment

GET    /api/v1/slots/:id/history
       Returns: sales history for this slot (what sold, when, at what price)
```

### 9.4 Products

```
GET    /api/v1/products
       Query: ?category=energy_drink&source=sams_club&min_margin=0.50&search=red%20bull
       Returns: paginated product list with pricing and velocity data

GET    /api/v1/products/:id
       Returns: product detail with performance across all machines

GET    /api/v1/products/:id/performance
       Query: ?period=30d
       Returns: {
         total_units_sold: 234,
         total_revenue: 932.66,
         avg_price: 3.98,
         avg_margin: 0.50,
         velocity_per_day: 7.8,
         best_machine: { id: "...", code: "KVT-003", velocity: 3.2 },
         worst_machine: { id: "...", code: "KVT-009", velocity: 0.4 },
         performance_by_zone: {
           golden_zone: { velocity: 2.8, count: 56 },
           upper_reach: { velocity: 1.9, count: 38 },
           ...
         },
         performance_by_location_type: {
           luxury_apartment: { velocity: 2.5 },
           office: { velocity: 1.8 },
           ...
         }
       }
```

### 9.5 Pricing

```
GET    /api/v1/pricing/profiles
       Returns: list of all pricing profiles

GET    /api/v1/pricing/profiles/:id
       Returns: full profile with all markups and rules

POST   /api/v1/pricing/profiles
       Body: { name, location_type, base_markup, category_markups, ... }
       Returns: created profile

POST   /api/v1/pricing/calculate
       Body: { product_id, machine_id, slot_id?, timestamp? }
       Returns: {
         price: 3.99,
         source: "engine",
         breakdown: {
           cogs: 2.00,
           category_markup: 2.0,
           zone_multiplier: 1.0,
           dynamic_multiplier: 1.0,
           charm_applied: "99",
           final_margin: 0.499,
           profit_per_unit: 1.99
         }
       }

POST   /api/v1/pricing/bulk-calculate
       Body: { machine_id, timestamp? }
       Returns: prices for every active slot on the machine

GET    /api/v1/pricing/overrides/:machineId
       Returns: all active pricing overrides for a machine

POST   /api/v1/pricing/overrides
       Body: { machine_id, override_type, product_id?, category?, price_override?, multiplier?, reason }
       Returns: created override

GET    /api/v1/pricing/decoys
       Query: ?machine_id=...&category=water
       Returns: decoy configurations with effectiveness metrics

POST   /api/v1/pricing/decoys
       Body: { machine_id?, category, economy_product_id, decoy_product_id, target_product_id, ... }
       Returns: created decoy configuration
```

### 9.6 Bundles

```
GET    /api/v1/bundles
       Query: ?machine_id=...&type=meal_deal&status=active
       Returns: list of bundles with performance metrics

POST   /api/v1/bundles
       Body: { name, display_name, type, items: [...], bundle_price, machine_ids?, ... }
       Returns: created bundle

GET    /api/v1/bundles/:id/performance
       Query: ?period=30d
       Returns: conversion rate, revenue, margin, comparison to individual sales

POST   /api/v1/bundles/suggest
       Body: { machine_id }
       Returns: auto-generated bundle suggestions based on co-purchase data

POST   /api/v1/bundles/suggest-for-cart
       Body: { machine_id, current_items: [product_ids] }
       Returns: real-time bundle suggestions for the current cart (for touchscreen)
```

### 9.7 Analytics

```
GET    /api/v1/analytics/overview
       Query: ?period=30d
       Returns: fleet-wide dashboard metrics

GET    /api/v1/analytics/machine/:id
       Query: ?period=30d
       Returns: comprehensive machine performance report

GET    /api/v1/analytics/machine/:id/heatmap
       Query: ?period=30d
       Returns: slot heat map data (for visual rendering in dashboard)

GET    /api/v1/analytics/machine/:id/hourly-pattern
       Query: ?period=30d
       Returns: sales by hour of day

GET    /api/v1/analytics/products/ranking
       Query: ?period=30d&sort=velocity|revenue|margin&location_type=office
       Returns: product ranking table

GET    /api/v1/analytics/location-benchmarks
       Returns: performance by location type (avg revenue, avg margin, etc.)

GET    /api/v1/analytics/waste
       Query: ?period=30d
       Returns: shrink report

GET    /api/v1/analytics/pricing-effectiveness
       Returns: decoy lift, anchor effectiveness, bundle conversion rates

GET    /api/v1/analytics/basket-analysis
       Query: ?machine_id=...&period=30d
       Returns: co-purchase patterns
```

### 9.8 Planograms

```
GET    /api/v1/planograms
       Query: ?location_type=luxury_apartment&equipment_type=stockwell_365
       Returns: available planogram templates

GET    /api/v1/planograms/:id
       Returns: full planogram with slot assignments

POST   /api/v1/planograms
       Body: { name, location_type, equipment_type, rows, cols_per_row, layout: {...} }
       Returns: created planogram

PUT    /api/v1/planograms/:id
       Body: partial update (usually layout changes)

POST   /api/v1/planograms/:id/apply/:machineId
       Apply a planogram template to a machine (updates slot assignments)

POST   /api/v1/planograms/optimize
       Body: { machine_id }
       Returns: suggested planogram based on current sales data and zone rules
```

### 9.9 A/B Tests

```
GET    /api/v1/tests
       Query: ?status=running&type=product_position
       Returns: list of active tests

POST   /api/v1/tests
       Body: { name, test_type, config: {...}, control_machines, variant_machines, duration_days }
       Returns: created test

GET    /api/v1/tests/:id
       Returns: test detail with current results and significance

PUT    /api/v1/tests/:id/complete
       Marks test as complete, records winner
```

### 9.10 Alerts

```
GET    /api/v1/alerts
       Query: ?severity=critical&acknowledged=false&machine_id=...
       Returns: list of alerts

PUT    /api/v1/alerts/:id/acknowledge
       Body: { acknowledged_by: "Kurtis" }

PUT    /api/v1/alerts/:id/resolve
       Body: { resolved_by: "Marcus", resolution_notes: "Restocked" }

GET    /api/v1/alerts/config
       Returns: current alert configuration

PUT    /api/v1/alerts/config
       Body: { low_stock_threshold, daily_revenue_target, notification_channels, ... }
```

---

## 10. Integration with Ops Dashboard

### 10.1 Current State

The ops dashboard at **vend.kandedash.com** is a React + Tailwind app deployed on Railway via the `kinghon/kande-vendtech-dashboard` repo. The product catalog lives at `products.kandevendtech.com`.

### 10.2 Integration Plan

**Phase 1: API Backend**

Deploy the Machine Management API as a new Railway service. The dashboard connects to it via API calls.

```
vend.kandedash.com (existing React app)
    │
    ├── /dashboard          → Fleet overview (new)
    ├── /machines/:id       → Machine detail + heat map (new)
    ├── /machines/:id/restock → Restock workflow (new)
    ├── /pricing            → Pricing profiles + overrides (new)
    ├── /bundles            → Bundle management (new)
    ├── /analytics          → Analytics dashboard (new)
    ├── /planograms         → Planogram builder (new)
    │
    └── API calls → machine-api.kandedash.com (new service)
                    │
                    └── PostgreSQL + Redis on Railway
```

**Phase 2: Product Catalog Sync**

The existing product catalog (`products.js` / `products-supplement.json` at products.kandevendtech.com) syncs into the `products` table. Script runs nightly to pick up new products.

```typescript
// Sync script: catalog → database
async function syncProductCatalog() {
  const catalogProducts = await fetch('https://products.kandevendtech.com/products.js');
  // Parse, map to products table schema
  // Upsert by UPC/SKU
  // Flag new products for review
}
```

**Phase 3: Payment Processor Integration**

Webhooks from Stockwell (365), Haha, and Moneta feed transaction data:

```typescript
// Webhook endpoint: receives sale events from payment processors
app.post('/api/v1/webhooks/sale', async (req, res) => {
  const { processor, machine_telemetry_id, items, amount, timestamp } = req.body;
  
  // 1. Map telemetry ID to our machine
  const machine = await db.machines.findBy({ telemetry_id: machine_telemetry_id });
  
  // 2. Map sold items to our slots/products
  // 3. Create transaction + transaction_items
  // 4. Update inventory counts
  // 5. Check thresholds, fire alerts if needed
  
  res.status(200).json({ received: true });
});
```

**Phase 4: Stocker Mobile App**

PWA (Progressive Web App) that stockers use in the field:

```
┌─────────────────────────────┐
│ 🔔 RESTOCK: KVT-003         │
│ Martin Lobby Unit 1          │
│ 3 critical, 5 warning        │
│                              │
│ [Scan Arrival]               │
│                              │
│ ┌──────────────────────────┐ │
│ │ C3: Red Bull 8.4oz       │ │
│ │ Current: 1 → Add: 8      │ │
│ │ [✓ Done]                  │ │
│ ├──────────────────────────┤ │
│ │ C7: Fair Life Protein     │ │
│ │ Current: 0 → Add: 6      │ │
│ │ [✓ Done]                  │ │
│ ├──────────────────────────┤ │
│ │ A2: Sandwich (Ham)        │ │
│ │ Current: 2 → Add: 3      │ │
│ │ ⚠️ Check expiration!     │ │
│ │ [✓ Done] [🗑 Pull 1 exp] │ │
│ └──────────────────────────┘ │
│                              │
│ [📸 Take Photo]              │
│ [✅ Complete Restock]         │
└─────────────────────────────┘
```

---

## 11. Implementation Plan

### Phase 1: Foundation (Weeks 1–4) — SHIP THIS FIRST

**Goal:** Core inventory tracking + basic pricing + restock workflow

**Week 1: Database + API Skeleton**
- [ ] PostgreSQL on Railway
- [ ] Core tables: `locations`, `machines`, `machine_slots`, `products`
- [ ] Express API with CRUD for machines, slots, products
- [ ] Seed database with existing location + machine data
- [ ] Sync product catalog from products.kandevendtech.com

**Week 2: Inventory Tracking**
- [ ] `transactions`, `transaction_items` tables
- [ ] Transaction ingestion endpoint (manual + webhook from processors)
- [ ] Auto-decrement inventory on sale
- [ ] `product_batches` for expiration tracking
- [ ] Restock alert logic (critical/warning/scheduled)

**Week 3: Restock Workflow**
- [ ] `restock_events` table
- [ ] Restock endpoint with slot-by-slot confirmation
- [ ] Par level calculation from sales velocity
- [ ] Pick list generation (grouped by product)
- [ ] SMS/email notifications via Twilio/SendGrid

**Week 4: Basic Dashboard Integration**
- [ ] New pages in vend.kandedash.com: /machines, /machines/:id
- [ ] Machine list with status indicators
- [ ] Machine detail: slot grid, inventory levels, restock status
- [ ] Restock alert banner in dashboard header

**Deliverable:** Functional inventory system. Stockers get restock lists. Managers see machine status.

---

### Phase 2: Pricing Engine (Weeks 5–8)

**Goal:** Full pricing engine with psychological strategies + per-machine overrides

**Week 5: Pricing Profiles + Engine**
- [ ] `pricing_profiles` table with 6 pre-built Las Vegas profiles
- [ ] Pricing engine: COGS → category markup → zone → charm → floor/ceiling
- [ ] API: POST /pricing/calculate + GET /pricing/bulk-calculate
- [ ] Link pricing profiles to machines

**Week 6: Overrides + Dynamic Pricing**
- [ ] `machine_pricing_overrides` table
- [ ] Per-machine and per-product price overrides
- [ ] Dynamic pricing: peak hours, demand multiplier, stock scarcity
- [ ] Las Vegas heat factor for beverages

**Week 7: Decoy + Anchoring**
- [ ] `decoy_configurations` table
- [ ] Decoy triad generator: economy → decoy → target
- [ ] Pre-built decoys for water, energy, candy, chips categories
- [ ] Anchor product placement recommendations
- [ ] Compare-at price display for office locations

**Week 8: Pricing Dashboard**
- [ ] Pricing management pages in vend.kandedash.com
- [ ] Profile editor with live price preview
- [ ] Override management per machine
- [ ] Decoy configuration UI
- [ ] Price calculation breakdown view

**Deliverable:** Every product in every machine has a data-driven price. Managers can tune pricing by location.

---

### Phase 3: Planograms + Bundles (Weeks 9–12)

**Goal:** Optimized product placement + bundle system

**Week 9: Planogram Engine**
- [ ] `planograms` table with 5 location-type templates
- [ ] Planogram builder UI (drag-and-drop slot assignment)
- [ ] Apply planogram to machine (batch slot updates)
- [ ] Zone-based placement rules engine

**Week 10: Heat Maps + A/B Testing**
- [ ] Slot-level sales aggregation (weekly rollups)
- [ ] Heat map visualization in machine detail
- [ ] `ab_tests` table and test creation workflow
- [ ] A/B test results dashboard with significance calculation

**Week 11: Bundle Engine**
- [ ] `bundles` + `bundle_items` tables
- [ ] 6 pre-built bundle templates
- [ ] Bundle management UI
- [ ] Bundle pricing calculator (margin-aware)
- [ ] Bundle display on machine touchscreen (if supported)

**Week 12: Auto-Bundle Suggestions**
- [ ] Co-purchase analysis (basket analysis queries)
- [ ] Auto-suggest bundles from transaction patterns
- [ ] Bundle performance tracking
- [ ] Margin-optimized bundle recommendations

**Deliverable:** Planogram templates for every location type. Active bundles driving incremental revenue. A/B tests running.

---

### Phase 4: Analytics + Optimization (Weeks 13–16)

**Goal:** Full analytics pipeline + optimization recommendations

**Week 13: Analytics Pipeline**
- [ ] Background jobs: hourly/daily/weekly aggregation (BullMQ)
- [ ] `analytics_hourly`, `analytics_daily`, `analytics_product_daily`, `analytics_slot_weekly` tables
- [ ] Automated velocity + par level recalculation

**Week 14: Analytics Dashboard**
- [ ] Fleet overview dashboard with KPIs
- [ ] Per-machine performance report
- [ ] Per-product performance ranking
- [ ] Hourly/daily sales patterns
- [ ] Location type benchmarks

**Week 15: Advanced Analytics**
- [ ] Waste/shrink tracking + monthly report
- [ ] Decoy effectiveness metrics
- [ ] Bundle conversion analytics
- [ ] Competitor price comparison tracking
- [ ] Customer basket analysis

**Week 16: Stocker Mobile App + Polish**
- [ ] PWA for stockers (restock workflow on mobile)
- [ ] Photo verification on restock
- [ ] GPS check-in at machines
- [ ] Documentation, runbook, training materials
- [ ] Performance testing, load optimization

**Deliverable:** Complete system. Data-driven decisions on pricing, placement, bundling, and restocking.

---

### Beyond Phase 4 (Future)

- **AI-powered planogram optimization** — ML model suggests optimal layouts based on historical performance
- **Demand forecasting** — Predict sales by product/slot/time using time series models
- **Customer segmentation** — Identify repeat customers (if payment data allows), personalize offers
- **Automated restock scheduling** — System auto-schedules routes based on predicted stockout dates
- **Multi-city expansion** — Location/pricing profiles for other markets beyond Las Vegas
- **Fresh food optimization** — Specialized tracking for perishable items with tighter expiration windows
- **Revenue share calculator** — Auto-calculate and report rev share owed to property managers

---

## Appendix A: Quick Reference — Real Product Pricing

From the research playbook and pricing reference data:

| Product | COGS | Our Price | Margin | Velocity | Notes |
|---------|------|-----------|--------|----------|-------|
| Red Bull 8.4oz | $2.00 | $3.75–3.99 | 47–50% | Highest velocity category | |
| Red Bull 12oz | $2.50 | $4.99 | 50% | | |
| Core Water 20oz | $0.93 | $2.99 | 69% | #1 velocity seller | $1.70 net after fees |
| Fair Life 42g Protein | $3.50 | $7.99 | 56% | Flying off shelves | Meal replacement |
| Cheetos Flamin' Hot | $0.60 | $2.49 | 76% | Top snack seller | 38 units/month (Houston) |
| Snickers Regular | $0.50 | $1.75 | 71% | Perennial top seller | |
| King-size Candy | $1.25 | $3.39 | 63% | | Higher absolute profit |
| Soda Cans | $0.36 | $1.50–2.00 | 76–82% | | Buy on sale, stock 3 months |
| Ramen | $0.30 | $1.50 | 80% | Sells exceptionally well | |
| Pop-Tarts | $0.50 | $1.75 | 71% | Consistently popular | |
| Charmin 6-pack | $8.00 | $16.99 | 53% | 2-3/week | Residential only |
| Salads | $3.00 | $7.65 | 61% | | $4.65 profit per unit |

## Appendix B: Las Vegas Market Notes

- **Climate**: Extreme heat May–October. Beverages (especially water) are top sellers year-round. Summer = 10–15% higher beverage volume.
- **24/7 Culture**: Unlike most markets, late-night (10PM–2AM) is a real sales window, especially apartments and hotels. Price can carry a small late-night premium.
- **Target Locations**: Strip-adjacent high-rises (tourist + Airbnb traffic), Henderson/Summerlin medical corridor, new luxury developments.
- **Beverage Dominance**: Water + energy drinks likely 35–45% of revenue. Core Water ($2.99, 69% margin, highest velocity) is the anchor product.
- **Convenience Items**: Charmin TP, paper towels, Advil, laundry pods — especially strong in luxury apartments where residents won't go out for basics.

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Anchor** | High-priced product that makes surrounding products seem reasonable |
| **Charm Pricing** | Prices ending in .99, .95, or .49 — perceived as significantly cheaper |
| **COGS** | Cost of goods sold — what we pay for the product |
| **Decoy** | A deliberately bad-value option that makes the target option look great |
| **Golden Zone** | Eye-level slots (rows C-D) — highest conversion placement |
| **Lift** | Increase in sales of one product caused by presence/placement of another |
| **Margin** | (Price - COGS) / Price — our profit percentage |
| **Par Level** | Ideal inventory quantity after restocking — based on sales velocity |
| **Planogram** | Template defining which product goes in which slot |
| **Shrink** | Inventory loss from expiration, damage, or theft |
| **Velocity** | Sales rate — units per day |
| **Zone** | Group of slots at similar height/placement (golden, top, bottom, etc.) |

---

*Document Version: 2.0*
*Last Updated: 2025-07-13*
*Built for: Kande VendTech, Las Vegas NV*
*Dashboard: vend.kandedash.com*
*Product Catalog: products.kandevendtech.com*
