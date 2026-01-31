# Kande VendTech Operations Platform — System Specification

*Version 0.1 — January 31, 2026*

---

## Executive Summary

A comprehensive operations platform to manage all aspects of Kande VendTech's smart vending machine business, from inventory and logistics to financial tracking and product optimization.

---

## Table of Contents

1. [Product Placement Research](#1-product-placement-research)
2. [Core Modules](#2-core-modules)
3. [Data Model](#3-data-model)
4. [Dashboard Views](#4-dashboard-views)
5. [Integration Points](#5-integration-points)
6. [Phased Rollout](#6-phased-rollout)

---

## 1. Product Placement Research

### The Science of Slot Placement

Retail and vending research consistently shows that product placement dramatically impacts sales. Here's what the data tells us:

#### Eye-Level Zones (The "Buy Level")

| Zone | Position | Sales Index | Best For |
|------|----------|-------------|----------|
| **Premium Zone** | Rows 2-3 (eye level, 4-5 ft) | 100% (baseline) | Highest margin items, impulse buys, new products |
| **Secondary Zone** | Row 4 (chest level, 3-4 ft) | 75-85% | Good sellers, mid-tier items |
| **Reach Zone** | Row 1 (top, 5.5+ ft) | 50-65% | Lighter items, known brands customers will reach for |
| **Stoop Zone** | Rows 5-6 (below waist, <3 ft) | 40-60% | Heavy items, bulk/value packs, low-margin basics |

**Key Insight:** Eye-level products sell 30-50% more than identical products placed in bottom rows.

#### Horizontal Placement

| Position | Sales Impact | Best For |
|----------|--------------|----------|
| **Center columns** | +15-20% vs edges | Impulse items, promotions |
| **Left side** | First seen (reading pattern) | New products, high-margin |
| **Right side** | "End cap" effect | Complementary items |
| **Near payment** | +10% impulse lift | Small indulgences, add-ons |

#### Product-Specific Placement Rules

**Snacks:**
| Product Type | Optimal Position | Rationale |
|--------------|------------------|-----------|
| Chips (popular brands) | Eye level, center | High velocity, impulse |
| Chips (value/store brand) | Lower rows | Price-conscious buyers will look |
| Candy bars | Eye level OR near payment | Impulse purchase |
| Healthier snacks (nuts, bars) | Eye level in health-conscious locations | Needs visibility to compete |
| Cookies/pastries | Mid-level | Deliberate purchase |
| Gum/mints | Bottom or near payment | Small, known purchase |

**Drinks:**
| Product Type | Optimal Position | Rationale |
|--------------|------------------|-----------|
| Water | Lower rows OK | People specifically seek it |
| Energy drinks | Eye level | Impulse + high margin |
| Premium coffee/specialty | Eye level | Needs visibility for trial |
| Sodas (Coke/Pepsi) | Mid-level | Brand recognition carries them |
| Juice | Eye level in healthy locations | Compete with sodas |
| Sports drinks | Eye level in gyms/active locations | Contextual relevance |

#### Location-Specific Strategies

**Office Buildings:**
- Eye level: Energy drinks, premium coffee, protein bars
- Mid: Chips, sodas, cookies
- Low: Water, basic snacks, value items
- *Workers are time-pressed → impulse items up top*

**Gyms/Fitness Centers:**
- Eye level: Protein bars, sports drinks, water (premium)
- Mid: Healthier chips, nuts, electrolyte drinks
- Low: Basic water, lower-cal options
- *Health-conscious → put healthy options where they're seen first*

**Schools/Universities:**
- Eye level: Energy drinks (if allowed), popular snacks
- Mid: Variety of chips, cookies
- Low: Water, juice, value snacks
- *Budget-conscious + impulse → balance both*

**Hospitals/Healthcare:**
- Eye level: Healthier options, water, nuts
- Mid: Comfort snacks (visitors)
- Low: Value items
- *Mixed audience → healthy visible, comfort accessible*

**Hotels:**
- Eye level: Premium snacks, brand names
- Mid: Drinks, standard snacks
- Low: Water, basics
- *Travelers pay premium → put high-margin items up top*

#### The "Billboard Effect"

Products at eye level serve as advertising. Even if a customer doesn't buy them, they:
- Create perception of quality/selection
- May trigger future purchases
- Make the machine look "full" and appealing

**Use eye level for:** Products you want to be known for, new items to test, highest margin items.

#### Rotation & Testing

- **A/B test placement:** Same product, different slots, measure for 2-4 weeks
- **Seasonal rotation:** Rotate seasonal items to eye level (pumpkin spice in fall, etc.)
- **Slow movers:** Move to worse slots before removing entirely — confirms if it's the product or the position

---

## 2. Core Modules

### 2.1 Inventory & Expiration Management

**Features:**
- Track products: Distributor → Warehouse → Machine
- FIFO enforcement with expiration alerts
- Warehouse zones (cold storage vs ambient)
- Auto-flag items approaching expiration (7/14/30 day configurable)
- Machine-level inventory sync from backend API
- Waste tracking (expired items pulled)
- Par level management per product per location

**Alerts:**
- Product expiring in X days (warehouse)
- Product expiring in X days (in machine)
- Stock below par level
- Delivery expected

### 2.2 Planogram & Slot Optimization

**Features:**
- Visual layout editor for each machine model
- Drag-drop product assignment to slots
- Template planograms by location type (office, gym, school, etc.)
- Clone & modify across machines
- Slot performance heatmaps
- Auto-suggestions based on performance data
- Placement rules engine (enforces best practices above)

**Data Tracked:**
- Sales per slot position
- Sales per product per slot (same product, different slots)
- Conversion rate (views to purchase if machine has sensors)
- Time-of-day patterns per slot

### 2.3 Product Performance & Swap System

**Metrics:**
- Units sold / week
- Revenue / week  
- Margin / week
- Sell-through rate (% of stock sold before expiration)
- Velocity (units/day)
- Days of inventory remaining

**Underperformer Detection:**
- Configurable thresholds (e.g., <3 sales/week)
- Duration (underperforming for how long?)
- Position-adjusted (is it bad product or bad slot?)
- Auto-flag for review

**Swap Workflow:**
1. System flags underperformer
2. Recommends replacement based on:
   - What sells at similar locations
   - What sells in that slot position elsewhere
   - Margin optimization
3. Manager approves/modifies
4. Planogram updates automatically
5. Next restock pick list reflects change
6. Track performance of swap (did it improve?)

**Product Lifecycle:**
- `Testing` → Limited rollout, measuring performance
- `Active` → Proven performer, full deployment
- `Watch` → Declining, monitoring closely
- `Retiring` → Selling through remaining, not reordering
- `Retired` → No longer stocked

### 2.4 Restock Workflow (Picker/Packer/Loader)

**Warehouse Picker List:**
- Auto-generated from machine inventory needs
- Grouped by route/vehicle
- FIFO enforced (oldest stock first)
- Check off items as picked
- Running total (units, weight, volume)
- Signature when complete

**Vehicle Packer Checklist:**
- Confirm items loaded into vehicle
- Organized by stop order
- Verify quantities match pick list
- Photo capture option
- Signature when complete

**Machine Load Checklist:**
- Per-machine checklist at each stop
- Shows exact slot → product mapping
- Visual diagram of machine layout
- Check off as loaded
- Report issues (slot jammed, damage, etc.)
- Before/after photos
- Pull expired items (tracked)
- Signature + timestamp on completion

**Completion Email:**
- Sent to owner/manager
- Contains: checklist screenshot, signature, timestamp
- CC: staff member, relevant stakeholders
- Issues flagged highlighted

### 2.5 Route Optimization

**Inputs:**
- Machine locations
- Current inventory levels (from machine API)
- Restock thresholds
- Traffic/time estimates
- Vehicle capacity
- Staff availability
- Service time per machine (historical average)

**Outputs:**
- Optimized route order
- Estimated drive time
- Estimated service time per stop
- Total route duration
- Which machines to skip (not urgent)

**Features:**
- Daily route generation
- Manual override capability
- Emergency restock alerts (machine nearly empty)
- Historical route performance tracking

### 2.6 Staff Management

**Features:**
- Staff profiles (contact, role, permissions)
- Scheduling (shifts, routes assigned)
- Time tracking (clock in/out via mobile app)
- Pay calculation (hourly + overtime)
- Performance metrics:
  - Machines serviced per hour
  - Average service time
  - Errors/issues reported
  - Customer complaints

### 2.7 Client/Location CRM

**Features:**
- Location profiles (address, contacts, contract terms)
- Contract management (start date, term, revenue share %)
- Automated touchpoints:
  - Monthly "hello" email
  - Bi-monthly check-in
  - Quarterly review scheduling
- Issue tracking (complaints, requests)
- Site visit history
- Renewal reminders (60/30/15 days before expiry)

### 2.8 Financial Tracking

**Revenue:**
- Per machine
- Per location
- Per product
- Per time period
- Trends and comparisons

**Expenses:**
- Cost of goods sold
- Warehouse rent/utilities
- Vehicle costs (fuel, maintenance)
- Staff payroll
- Equipment maintenance
- Distributor invoices

**Calculations:**
- Revenue share payments (auto-calculated from sales)
- Sales commission (per salesperson, per deal structure)
- Gross margin by product/machine/location
- P&L statements (overall, by location)

### 2.9 Sales Pipeline

**Features:**
- Lead tracking (source, status, notes)
- Proposal generation
- Contract status
- Won/lost tracking with reasons
- Handoff to operations (new location setup)
- Commission tracking and payout

### 2.10 SEO & Marketing

**Features:**
- Keyword ranking tracker (API from agency or SE Ranking)
- Website traffic (Google Analytics integration)
- Lead source attribution
- Conversion tracking

---

## 3. Data Model

### Core Entities

```
LOCATIONS
- id
- name
- address
- type (office, gym, school, hospital, hotel, other)
- contact_name
- contact_email
- contact_phone
- contract_start_date
- contract_end_date
- revenue_share_percentage
- notes
- status (prospect, active, churned)

MACHINES
- id
- location_id (FK)
- model
- serial_number
- install_date
- slot_configuration (JSON - rows x columns)
- backend_api_id (for inventory sync)
- status (active, maintenance, inactive)

PRODUCTS
- id
- name
- sku
- category (snack, drink, candy, healthy, etc.)
- subcategory
- unit_cost
- unit_price
- margin
- shelf_life_days
- storage_type (ambient, refrigerated, frozen)
- status (testing, active, watch, retiring, retired)
- image_url

PLANOGRAMS
- id
- machine_id (FK)
- effective_date
- slot_assignments (JSON - slot_id → product_id)
- created_by
- notes

INVENTORY_WAREHOUSE
- id
- product_id (FK)
- quantity
- expiration_date
- received_date
- lot_number
- location_in_warehouse

INVENTORY_MACHINE
- machine_id (FK)
- slot_id
- product_id (FK)
- quantity
- expiration_date
- last_restocked

SALES
- id
- machine_id (FK)
- product_id (FK)
- slot_id
- timestamp
- quantity
- revenue
- payment_method

RESTOCK_RUNS
- id
- date
- staff_id (FK)
- route (JSON - ordered list of machine_ids)
- status (planned, in_progress, completed)
- started_at
- completed_at

RESTOCK_CHECKLISTS
- id
- restock_run_id (FK)
- machine_id (FK)
- type (picker, packer, loader)
- items (JSON - list of items with completion status)
- signature (base64)
- screenshot (base64)
- completed_at
- completed_by

STAFF
- id
- name
- email
- phone
- role (admin, manager, driver, warehouse, sales)
- hourly_rate
- status (active, inactive)

SCHEDULES
- id
- staff_id (FK)
- date
- shift_start
- shift_end
- assigned_route_id

TIME_ENTRIES
- id
- staff_id (FK)
- clock_in
- clock_out
- break_minutes
- notes

CLIENTS (Locations extended for CRM)
- location_id (FK)
- last_contact_date
- next_contact_date
- touchpoint_history (JSON)
- health_score

EXPENSES
- id
- date
- category (COGS, rent, utilities, vehicle, payroll, equipment, other)
- amount
- description
- receipt_url

REVENUE_SHARES
- id
- location_id (FK)
- period_start
- period_end
- gross_revenue
- share_percentage
- amount_owed
- paid_date
- paid_amount

SALES_LEADS
- id
- company_name
- contact_name
- contact_email
- contact_phone
- source
- status (new, contacted, proposal, negotiation, won, lost)
- assigned_to (staff_id)
- notes
- created_at
- closed_at
- close_reason

COMMISSIONS
- id
- staff_id (FK)
- location_id (FK)
- deal_value
- commission_rate
- commission_amount
- paid_date
```

---

## 4. Dashboard Views

### Owner Dashboard
- Total revenue (today, week, month, YTD)
- P&L summary
- Machines needing attention (low stock, issues)
- Underperforming products
- Upcoming contract renewals
- Cash flow forecast
- Key alerts

### Operations Manager Dashboard
- Today's routes and assignments
- Restock queue (sorted by urgency)
- Staff schedule
- Inventory alerts (expiring, low stock warehouse)
- Recent issues reported
- Client touchpoints due

### Route Driver Mobile View
- Today's route (map + list)
- Per-stop checklist
- Check off items as completed
- Report issues
- Capture photos
- Clock in/out

### Warehouse Staff View
- Picker lists for today
- Incoming deliveries expected
- Expiration alerts
- Inventory counts

### Product Performance View
- All products ranked by velocity/margin
- Underperformers flagged
- Swap recommendations
- A/B test results
- Drill down by location/machine

### Planogram Editor
- Visual machine layout
- Drag-drop products to slots
- Performance overlay (heatmap)
- Save/apply templates

### Financial View
- Revenue trends
- Expense breakdown
- Revenue share statements
- Commission reports
- P&L by location

---

## 5. Integration Points

| System | Integration Type | Purpose |
|--------|------------------|---------|
| Machine Backend | API | Real-time inventory, sales data |
| QuickBooks | API | Accounting, invoicing |
| Google Maps | API | Route optimization, drive times |
| Gusto/ADP | API | Payroll |
| Google Analytics | API | Website traffic |
| SE Ranking / Agency | API | SEO rankings |
| Email (SendGrid/Resend) | API | Client touchpoints, alerts |
| SMS (Twilio) | API | Staff notifications |

---

## 6. Phased Rollout

### Phase 1: Solo Operation (Months 1-3)
**Build:**
- Basic location/machine tracking
- Manual inventory logging
- Simple sales tracking (from machine backend)
- Expense tracking
- Basic route planning

**Buy/Use:**
- Spreadsheets for now
- Google Maps for routes
- Machine vendor's portal for sales data

### Phase 2: First Hires (Months 3-6)
**Build:**
- Picker/packer/loader checklists (like photo booth system)
- Mobile app for field staff
- Basic staff scheduling
- Automated client emails
- Revenue share calculations

**Buy:**
- Time tracking (Homebase or similar)

### Phase 3: Warehouse + Office Manager (Months 6-12)
**Build:**
- Full inventory system with expiration tracking
- Planogram editor
- Product performance analytics
- Route optimization v1
- Manager dashboards
- Financial reporting

**Buy:**
- Accounting integration (QuickBooks)
- Payroll (Gusto)

### Phase 4: Scale (Year 2+)
**Build:**
- Predictive restocking (ML)
- Advanced planogram optimization
- Multi-warehouse support
- Franchise/territory features
- Full business intelligence

---

## Next Steps

1. ✅ Document system spec (this document)
2. ⏳ Set up database schema
3. ⏳ Get machine backend API access
4. ⏳ Build Phase 1 basic tracking
5. ⏳ Design picker/packer checklist UI

---

*Document maintained by Jarvis for Kande VendTech*
