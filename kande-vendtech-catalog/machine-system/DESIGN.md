# Kande VendTech Machine Management System

*System Design Document*
*Created: 2026-01-30*

---

## Executive Summary

This document outlines a comprehensive machine management system for Kande VendTech that enables per-machine inventory tracking, dynamic pricing strategies, slot positioning optimization, and sales analytics. The system leverages behavioral economics principles (decoy effect, anchoring, bundling) to maximize revenue while providing excellent customer experience.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Data Models](#2-data-models)
3. [Inventory Management](#3-inventory-management)
4. [Pricing Strategies](#4-pricing-strategies)
5. [Slot Positioning System](#5-slot-positioning-system)
6. [Bundling Engine](#6-bundling-engine)
7. [Sales Analytics](#7-sales-analytics)
8. [Implementation Roadmap](#8-implementation-roadmap)

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ADMIN DASHBOARD                          │
│  (Machine Management, Pricing, Analytics, Restocking Alerts)    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │Inventory │ │ Pricing  │ │Analytics │ │ Bundling Engine  │   │
│  │ Service  │ │ Service  │ │ Service  │ │                  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Machines │ │ Products │ │  Sales   │ │ Pricing Rules    │   │
│  │   DB     │ │    DB    │ │    DB    │ │       DB         │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VENDING MACHINES                              │
│     [Machine 1]    [Machine 2]    [Machine 3]    [...]          │
│     Location A     Location B     Location C                     │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack (Recommended)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React/Next.js | Modern, component-based, good for dashboards |
| Backend | Node.js + Express | Consistent with existing systems |
| Database | PostgreSQL | Relational data, complex queries, JSONB support |
| Cache | Redis | Fast inventory lookups, session management |
| Hosting | Vercel/Railway | Easy deployment, scalable |

### 1.3 Integration Points

- **Machine Telemetry**: Real-time data from vending machines (sales, inventory levels)
- **Payment Processor**: Transaction data for analytics
- **Notification System**: SMS/email alerts for low stock, maintenance
- **Product Catalog**: Sync with existing products.kandevendtech.com data

---

## 2. Data Models

### 2.1 Machine Schema

```typescript
interface Machine {
  id: string;                    // Unique identifier (e.g., "KVT-001")
  name: string;                  // Human-friendly name
  location: {
    name: string;                // "Marriott Lobby"
    address: string;
    type: LocationType;          // HOTEL | OFFICE | GYM | APARTMENT | HOSPITAL
    coordinates?: {lat, lng};
  };
  configuration: {
    totalSlots: number;          // Total physical slots (e.g., 60)
    rows: number;                // Number of rows (e.g., 6)
    columnsPerRow: number;       // Columns per row (e.g., 10)
    slotCapacity: number;        // Items per slot (e.g., 10)
    temperature?: "ambient" | "refrigerated" | "frozen";
  };
  status: "active" | "maintenance" | "offline";
  lastRestocked: Date;
  lastMaintenance: Date;
  installDate: Date;
  pricingProfile: string;        // Reference to pricing profile
  createdAt: Date;
  updatedAt: Date;
}

enum LocationType {
  HOTEL = "hotel",
  OFFICE = "office",
  GYM = "gym",
  APARTMENT = "apartment",
  HOSPITAL = "hospital",
  SCHOOL = "school",
  WAREHOUSE = "warehouse",
  OTHER = "other"
}
```

### 2.2 Slot Schema

```typescript
interface Slot {
  id: string;                    // "KVT-001-A1"
  machineId: string;
  position: {
    row: string;                 // "A", "B", "C"...
    column: number;              // 1, 2, 3...
    zone: SlotZone;              // Premium placement zones
  };
  productId: string | null;      // Current product in slot
  currentQuantity: number;
  maxCapacity: number;
  priceOverride?: number;        // Slot-specific price override
  lastSale: Date | null;
  lastRestocked: Date;
  salesVelocity: number;         // Items sold per day (calculated)
  status: "active" | "empty" | "jammed" | "disabled";
}

enum SlotZone {
  PREMIUM_EYE_LEVEL = "premium_eye",      // Rows C-D (eye level)
  PREMIUM_REACH = "premium_reach",         // Row B (easy reach)
  STANDARD_HIGH = "standard_high",         // Row A (top)
  STANDARD_LOW = "standard_low",           // Rows E-F (bottom)
  IMPULSE_CHECKOUT = "impulse_checkout"    // Near payment area
}
```

### 2.3 Product Instance Schema

```typescript
interface ProductInstance {
  id: string;
  machineId: string;
  slotId: string;
  productId: string;             // Reference to master product catalog
  
  // Pricing (can override catalog price)
  basePrice: number;             // Cost from supplier
  sellingPrice: number;          // Current price in this slot
  margin: number;                // Calculated margin %
  
  // Inventory
  quantity: number;
  minQuantity: number;           // Restock trigger threshold
  parLevel: number;              // Ideal quantity after restock
  
  // Analytics
  salesLast7Days: number;
  salesLast30Days: number;
  lastSoldAt: Date | null;
  
  // Pricing Strategy Flags
  isDecoy: boolean;              // Used as decoy for another product
  decoyTargetId?: string;        // Product this decoy promotes
  isAnchor: boolean;             // High-price anchor product
  bundleIds: string[];           // Part of these bundles
}
```

### 2.4 Sale Transaction Schema

```typescript
interface SaleTransaction {
  id: string;
  machineId: string;
  slotId: string;
  productId: string;
  
  // Transaction Details
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: "card" | "mobile" | "cash";
  
  // Timestamps
  timestamp: Date;
  dayOfWeek: number;             // 0-6
  hourOfDay: number;             // 0-23
  
  // Context
  wasBundle: boolean;
  bundleId?: string;
  promotionApplied?: string;
  
  // Analytics
  marginAmount: number;
  marginPercent: number;
}
```

### 2.5 Pricing Profile Schema

```typescript
interface PricingProfile {
  id: string;
  name: string;                  // "Hotel Premium", "Office Standard"
  locationType: LocationType;
  
  // Base Multipliers
  baseMarkup: number;            // e.g., 1.5 = 50% markup
  categoryMarkups: {
    [category: string]: number;  // Category-specific multipliers
  };
  
  // Time-Based Pricing
  peakHours: {
    hours: number[];             // e.g., [7, 8, 12, 13, 17, 18]
    multiplier: number;          // e.g., 1.1 = 10% increase
  };
  
  // Slot Zone Pricing
  zoneMultipliers: {
    [zone in SlotZone]: number;
  };
  
  // Psychological Pricing
  endingStrategy: "99" | "95" | "00" | "smart";
  roundingRule: "up" | "down" | "nearest";
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 3. Inventory Management

### 3.1 Real-Time Tracking

```typescript
interface InventoryTracker {
  // Update on each sale
  recordSale(machineId: string, slotId: string, quantity: number): void;
  
  // Manual adjustments (restocking, audits)
  adjustInventory(slotId: string, newQuantity: number, reason: string): void;
  
  // Automatic restock list generation
  generateRestockList(machineId: string): RestockItem[];
  
  // Predictive restocking
  predictRestockDate(slotId: string): Date;
}

interface RestockItem {
  slotId: string;
  productId: string;
  productName: string;
  currentQuantity: number;
  parLevel: number;
  quantityNeeded: number;
  urgency: "critical" | "low" | "optimal";
  estimatedStockoutDate: Date;
}
```

### 3.2 Restock Alerts

```typescript
interface RestockAlert {
  type: "critical" | "warning" | "scheduled";
  machineId: string;
  machineName: string;
  location: string;
  
  items: RestockItem[];
  totalItemsNeeded: number;
  estimatedRestockTime: number;  // minutes
  
  suggestedRestockDate: Date;
  notifiedAt: Date;
  acknowledgedAt?: Date;
  completedAt?: Date;
}

// Alert Thresholds
const ALERT_THRESHOLDS = {
  critical: 0.1,    // 10% remaining = critical
  warning: 0.25,    // 25% remaining = warning
  scheduled: 0.5    // 50% remaining = schedule restock
};
```

### 3.3 Restocking Workflow

```
1. MONITOR
   └─> System continuously monitors inventory levels
   
2. TRIGGER
   └─> When slot hits threshold, alert generated
   
3. NOTIFY
   └─> Push notification / SMS / Email to restock team
   
4. GENERATE LIST
   └─> Optimized picking list for warehouse
       - Grouped by product for efficient picking
       - Sorted by machine route for efficient delivery
   
5. CONFIRM RESTOCK
   └─> Driver confirms via mobile app
   └─> System updates inventory to par levels
   
6. VERIFY
   └─> Optional: photo verification of stocked machine
```

### 3.4 Par Level Optimization

```typescript
function calculateOptimalParLevel(slot: Slot, salesHistory: Sale[]): number {
  const avgDailySales = calculateAverageDailySales(salesHistory);
  const salesVariability = calculateStandardDeviation(salesHistory);
  const restockFrequencyDays = 3; // How often we visit
  const safetyStock = salesVariability * 1.5; // Buffer for variability
  
  return Math.ceil(
    (avgDailySales * restockFrequencyDays) + safetyStock
  );
}
```

---

## 4. Pricing Strategies

### 4.1 Behavioral Economics Principles

#### 4.1.1 Decoy Effect (Asymmetric Dominance)

The decoy effect occurs when a third option makes one of the original two options more attractive.

```typescript
interface DecoyStrategy {
  targetProduct: Product;        // The product we want to sell more
  decoyProduct: Product;         // The decoy (dominated option)
  competitorProduct: Product;    // The alternative choice
}

// Example:
// Chips $2.00 (12oz) - Competitor
// Chips $2.50 (16oz) - TARGET (we want to sell this)
// Chips $2.40 (13oz) - DECOY (makes 16oz look like better value)

function createDecoyPricing(target: Product, competitor: Product): DecoyConfig {
  return {
    decoyPrice: target.price * 0.96,  // Slightly cheaper than target
    decoySize: competitor.size * 1.08, // Slightly bigger than competitor
    // Result: Decoy is worse value than both, making target look best
  };
}
```

**Implementation Rules:**
- Place decoy adjacent to target product
- Decoy should be priced close to target but with less value
- Works best for size/quantity decisions
- Track conversion rates to optimize

#### 4.1.2 Price Anchoring

High-price items set expectations, making other items seem reasonably priced.

```typescript
interface AnchorStrategy {
  anchorProduct: Product;        // Premium/expensive item
  targetProducts: Product[];     // Items that benefit from anchor
  anchorPosition: SlotPosition;  // Where to place anchor
}

// Example: Premium trail mix at $6.99 makes $3.50 chips seem reasonable

function selectAnchorProducts(products: Product[]): Product[] {
  return products
    .filter(p => p.margin > 0.6)           // High margin items
    .filter(p => p.category === 'premium') // Premium category
    .sort((a, b) => b.price - a.price)     // Highest price first
    .slice(0, 3);                           // Top 3 anchors
}

// Placement: Anchors at eye level, surrounded by target products
```

**Implementation Rules:**
- Place anchors at eye level in premium zones
- Surround anchors with mid-tier products (your real targets)
- Anchor price should be 2-3x the target price
- Limit anchors to 5-10% of inventory

#### 4.1.3 Charm Pricing

Prices ending in .99 or .95 appear significantly cheaper.

```typescript
function applyCharmPricing(basePrice: number, strategy: string): number {
  switch (strategy) {
    case "99":
      return Math.floor(basePrice) + 0.99;
    case "95":
      return Math.floor(basePrice) + 0.95;
    case "smart":
      // Use .99 for items under $5, .95 for items over $5
      return basePrice < 5 
        ? Math.floor(basePrice) + 0.99
        : Math.floor(basePrice) + 0.95;
    case "prestige":
      // Round numbers for premium items (signals quality)
      return Math.round(basePrice);
  }
}
```

#### 4.1.4 Bundle Pricing

Combine products at a perceived discount to increase basket size.

```typescript
interface Bundle {
  id: string;
  name: string;                  // "Lunch Combo"
  products: BundleItem[];
  
  // Pricing
  individualTotal: number;       // Sum of individual prices
  bundlePrice: number;           // Discounted bundle price
  savings: number;               // individualTotal - bundlePrice
  savingsPercent: number;
  
  // Display
  displaySlot?: string;          // Optional dedicated bundle slot
  virtualBundle: boolean;        // true = no physical bundle slot
  
  // Performance
  conversionRate: number;
  avgDailySales: number;
}

interface BundleItem {
  productId: string;
  quantity: number;
  slotId: string;                // Where to pick from
}

// Example Bundles:
const SAMPLE_BUNDLES = [
  {
    name: "Afternoon Pick-Me-Up",
    products: ["energy_drink", "protein_bar"],
    discount: 0.15  // 15% off combined price
  },
  {
    name: "Healthy Snack Pack",
    products: ["trail_mix", "sparkling_water", "apple"],
    discount: 0.20
  },
  {
    name: "Late Night Study",
    products: ["coffee", "chips", "candy"],
    discount: 0.10
  }
];
```

### 4.2 Location-Based Pricing

```typescript
const LOCATION_PRICING_PROFILES = {
  hotel: {
    baseMarkup: 1.8,             // 80% markup (captive audience)
    peakMultiplier: 1.15,        // +15% during peak hours
    premiumZoneMultiplier: 1.1,  // +10% for eye-level
    categories: {
      beverages: 1.9,
      snacks: 1.7,
      healthy: 2.0,              // Premium healthy in hotels
      alcohol: 2.2               // If applicable
    }
  },
  office: {
    baseMarkup: 1.4,             // 40% markup (price-sensitive)
    peakMultiplier: 1.05,        // Minimal peak adjustment
    premiumZoneMultiplier: 1.05,
    categories: {
      beverages: 1.5,
      snacks: 1.3,
      healthy: 1.6,
      energy: 1.7                // Energy drinks popular
    }
  },
  gym: {
    baseMarkup: 1.6,
    peakMultiplier: 1.1,
    categories: {
      protein: 1.8,              // Premium for protein
      energy: 1.7,
      water: 1.4,                // Keep water accessible
      healthy: 1.7
    }
  },
  hospital: {
    baseMarkup: 1.5,
    peakMultiplier: 1.0,         // No peak pricing (sensitive)
    categories: {
      healthy: 1.4,
      comfort_food: 1.6,
      beverages: 1.5
    }
  }
};
```

### 4.3 Dynamic Pricing Engine

```typescript
class PricingEngine {
  calculatePrice(
    product: Product,
    machine: Machine,
    slot: Slot,
    timestamp: Date
  ): number {
    let price = product.basePrice;
    
    // 1. Apply location markup
    const profile = LOCATION_PRICING_PROFILES[machine.location.type];
    price *= profile.baseMarkup;
    
    // 2. Apply category markup
    const categoryMarkup = profile.categories[product.category] || 1.0;
    price *= categoryMarkup;
    
    // 3. Apply zone multiplier (premium placement)
    const zoneMultiplier = this.getZoneMultiplier(slot.position.zone, profile);
    price *= zoneMultiplier;
    
    // 4. Apply peak hour pricing
    if (this.isPeakHour(timestamp, machine.location.type)) {
      price *= profile.peakMultiplier;
    }
    
    // 5. Apply demand-based adjustment
    const demandMultiplier = this.calculateDemandMultiplier(slot);
    price *= demandMultiplier;
    
    // 6. Apply charm pricing
    price = applyCharmPricing(price, profile.charmStrategy || "smart");
    
    // 7. Ensure minimum margin
    const minPrice = product.basePrice * 1.25; // 25% minimum margin
    price = Math.max(price, minPrice);
    
    return price;
  }
  
  calculateDemandMultiplier(slot: Slot): number {
    // High velocity = can charge more
    // Low velocity = might need to discount
    const avgVelocity = 5; // items per day baseline
    const velocityRatio = slot.salesVelocity / avgVelocity;
    
    if (velocityRatio > 1.5) return 1.1;      // High demand: +10%
    if (velocityRatio < 0.5) return 0.95;     // Low demand: -5%
    return 1.0;
  }
}
```

### 4.4 Price Testing (A/B)

```typescript
interface PriceTest {
  id: string;
  productId: string;
  testName: string;
  
  // Test Configuration
  controlPrice: number;
  variantPrice: number;
  
  // Assignment
  controlMachines: string[];     // Machine IDs for control
  variantMachines: string[];     // Machine IDs for variant
  
  // Timeline
  startDate: Date;
  endDate: Date;
  status: "draft" | "running" | "completed" | "cancelled";
  
  // Results
  controlSales: number;
  variantSales: number;
  controlRevenue: number;
  variantRevenue: number;
  statisticalSignificance: number;
  winner: "control" | "variant" | "inconclusive";
}
```

---

## 5. Slot Positioning System

### 5.1 Zone Definitions

```
┌─────────────────────────────────────────────────────────────┐
│  A1   A2   A3   A4   A5   A6   A7   A8   A9   A10          │  Row A: STANDARD_HIGH
│                                                             │  (Top shelf - harder to reach)
├─────────────────────────────────────────────────────────────┤
│  B1   B2   B3   B4   B5   B6   B7   B8   B9   B10          │  Row B: PREMIUM_REACH
│                                                             │  (Easy reach - good visibility)
├─────────────────────────────────────────────────────────────┤
│  C1   C2   C3   C4   C5   C6   C7   C8   C9   C10          │  Row C: PREMIUM_EYE_LEVEL ⭐
│                                                             │  (Prime real estate)
├─────────────────────────────────────────────────────────────┤
│  D1   D2   D3   D4   D5   D6   D7   D8   D9   D10          │  Row D: PREMIUM_EYE_LEVEL ⭐
│                                                             │  (Prime real estate)
├─────────────────────────────────────────────────────────────┤
│  E1   E2   E3   E4   E5   E6   E7   E8   E9   E10          │  Row E: STANDARD_LOW
│                                                             │  (Below eye level)
├─────────────────────────────────────────────────────────────┤
│  F1   F2   F3   F4   F5   F6   F7   F8   F9   F10          │  Row F: STANDARD_LOW
│                                                             │  (Bottom shelf - bend required)
└─────────────────────────────────────────────────────────────┘
                    │Payment│
                    │ Area  │ ← IMPULSE_CHECKOUT zone nearby
```

### 5.2 Positioning Strategy

```typescript
interface PositioningStrategy {
  // High-margin items → Premium zones
  placeHighMarginItems(products: Product[], slots: Slot[]): SlotAssignment[];
  
  // Anchors at eye level, surrounded by targets
  placeAnchorsAndTargets(anchors: Product[], targets: Product[]): SlotAssignment[];
  
  // Decoys adjacent to their targets
  placeDecoys(decoyPairs: DecoyPair[]): SlotAssignment[];
  
  // Impulse buys near payment
  placeImpulseItems(products: Product[], checkoutSlots: Slot[]): SlotAssignment[];
  
  // Healthy options visible but not prime (regulatory)
  placeHealthyOptions(products: Product[]): SlotAssignment[];
}

const POSITIONING_RULES = {
  // What goes in premium eye-level zones
  premiumZone: {
    prioritize: ["high_margin", "anchor_products", "new_products"],
    avoid: ["low_margin", "slow_moving", "basics"]
  },
  
  // What goes near checkout/payment
  impulseZone: {
    prioritize: ["candy", "gum", "small_snacks", "energy_shots"],
    maxPrice: 3.00,  // Impulse threshold
    avoid: ["large_items", "healthy_staples"]
  },
  
  // Bottom shelves
  lowZone: {
    prioritize: ["heavy_items", "bulk_items", "basics", "low_margin"],
    avoid: ["impulse_items", "premium_items"]
  },
  
  // Adjacency rules
  adjacency: {
    "chips": ["dips", "sodas"],           // Complementary
    "energy_drink": ["protein_bar"],       // Bundle opportunity
    "sandwich": ["chips", "drink"],        // Meal combo
    "coffee": ["pastry", "energy_bar"]     // Breakfast combo
  }
};
```

### 5.3 Heat Map Analysis

```typescript
interface SlotPerformance {
  slotId: string;
  position: {row: string, column: number};
  zone: SlotZone;
  
  // Performance Metrics
  totalSales: number;
  totalRevenue: number;
  avgDailySales: number;
  avgMargin: number;
  
  // Compared to slot average
  salesIndex: number;            // 1.0 = average, 1.5 = 50% above average
  revenueIndex: number;
  
  // Visualization
  heatLevel: "hot" | "warm" | "neutral" | "cool" | "cold";
}

function generateSlotHeatMap(machine: Machine, period: DateRange): SlotPerformance[] {
  const slots = getSlots(machine.id);
  const avgSales = calculateAverageSlotSales(slots, period);
  
  return slots.map(slot => {
    const sales = getSlotSales(slot.id, period);
    const salesIndex = sales.total / avgSales;
    
    return {
      slotId: slot.id,
      position: slot.position,
      zone: slot.position.zone,
      totalSales: sales.total,
      totalRevenue: sales.revenue,
      avgDailySales: sales.daily,
      avgMargin: sales.avgMargin,
      salesIndex,
      revenueIndex: sales.revenue / calculateAverageSlotRevenue(slots, period),
      heatLevel: getHeatLevel(salesIndex)
    };
  });
}

function getHeatLevel(index: number): string {
  if (index >= 1.5) return "hot";
  if (index >= 1.2) return "warm";
  if (index >= 0.8) return "neutral";
  if (index >= 0.5) return "cool";
  return "cold";
}
```

---

## 6. Bundling Engine

### 6.1 Bundle Types

```typescript
enum BundleType {
  MEAL_COMBO = "meal_combo",       // Sandwich + chips + drink
  SNACK_PACK = "snack_pack",       // Multiple snacks
  HEALTHY_SET = "healthy_set",     // Health-focused combo
  ENERGY_BOOST = "energy_boost",   // Energy drink + bar
  BREAKFAST = "breakfast",          // Coffee + pastry
  VALUE_PACK = "value_pack"        // Bulk savings
}

interface BundleTemplate {
  type: BundleType;
  name: string;
  description: string;
  
  // Product requirements
  requiredCategories: string[];   // Must include these
  optionalCategories: string[];   // Can include these
  minItems: number;
  maxItems: number;
  
  // Pricing
  discountPercent: number;        // e.g., 15 = 15% off
  maxDiscount: number;            // Cap on discount amount
  
  // Display
  displayName: string;            // "Lunch Combo - Save 15%!"
  icon: string;
}

const BUNDLE_TEMPLATES: BundleTemplate[] = [
  {
    type: BundleType.MEAL_COMBO,
    name: "Lunch Combo",
    description: "Perfect lunch bundle",
    requiredCategories: ["sandwich", "beverage"],
    optionalCategories: ["chips", "snacks"],
    minItems: 2,
    maxItems: 3,
    discountPercent: 15,
    maxDiscount: 2.50,
    displayName: "🍱 Lunch Combo",
    icon: "🍱"
  },
  {
    type: BundleType.ENERGY_BOOST,
    name: "Energy Boost",
    description: "Power through your day",
    requiredCategories: ["energy_drink"],
    optionalCategories: ["protein_bar", "energy_bar", "nuts"],
    minItems: 2,
    maxItems: 2,
    discountPercent: 10,
    maxDiscount: 1.50,
    displayName: "⚡ Energy Boost",
    icon: "⚡"
  },
  {
    type: BundleType.HEALTHY_SET,
    name: "Healthy Choice",
    description: "Guilt-free snacking",
    requiredCategories: ["healthy_snack", "water"],
    optionalCategories: ["fruit", "nuts", "protein"],
    minItems: 2,
    maxItems: 3,
    discountPercent: 12,
    maxDiscount: 2.00,
    displayName: "🥗 Healthy Choice",
    icon: "🥗"
  }
];
```

### 6.2 Bundle Suggestion Algorithm

```typescript
class BundleSuggestionEngine {
  // Suggest bundles based on current cart
  suggestBundles(currentItems: CartItem[], machine: Machine): BundleSuggestion[] {
    const suggestions: BundleSuggestion[] = [];
    
    for (const template of BUNDLE_TEMPLATES) {
      const matchingItems = this.findMatchingItems(currentItems, template);
      
      if (matchingItems.length >= template.minItems - 1) {
        // User is close to completing a bundle
        const missingCategories = this.findMissingCategories(
          matchingItems, 
          template.requiredCategories
        );
        
        if (missingCategories.length > 0) {
          const suggestedProducts = this.findBestProducts(
            missingCategories, 
            machine
          );
          
          suggestions.push({
            template,
            currentItems: matchingItems,
            suggestedAdditions: suggestedProducts,
            totalSavings: this.calculateSavings(matchingItems, suggestedProducts, template),
            confidence: this.calculateConfidence(matchingItems, template)
          });
        }
      }
    }
    
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }
  
  // Auto-generate bundles based on sales data
  generateOptimalBundles(machine: Machine, salesHistory: Sale[]): Bundle[] {
    // Find frequently purchased together items
    const associations = this.findAssociations(salesHistory);
    
    // Create bundles from top associations
    return associations
      .filter(a => a.support > 0.05 && a.confidence > 0.3)
      .map(a => this.createBundleFromAssociation(a, machine));
  }
  
  // Market basket analysis
  findAssociations(sales: Sale[]): Association[] {
    // Group sales by transaction (same machine, same minute)
    const transactions = this.groupTransactions(sales);
    
    // Find item pairs that frequently appear together
    const pairs = this.findFrequentPairs(transactions);
    
    // Calculate support and confidence
    return pairs.map(pair => ({
      items: pair,
      support: pair.count / transactions.length,
      confidence: pair.count / this.getItemCount(pair.item1, transactions),
      lift: this.calculateLift(pair, transactions)
    }));
  }
}
```

### 6.3 Bundle Display (Virtual Bundles)

For virtual bundles (no dedicated physical slot):

```typescript
interface VirtualBundleDisplay {
  // Show on machine screen
  screenDisplay: {
    position: "top" | "bottom" | "sidebar";
    template: string;            // "Buy {item1} + {item2}, Save {savings}!"
    animation: boolean;
  };
  
  // Touchscreen interaction
  onSelect(): void {
    // Highlight both slots on machine
    // Show combined price
    // Dispense both items when purchased
  };
}

// Example screen display:
// ┌─────────────────────────────────┐
// │ 🍱 LUNCH COMBO - SAVE $1.50!   │
// │ Sandwich (C3) + Chips (C4)     │
// │ + Any Drink = $7.99            │
// │        [Add to Cart]           │
// └─────────────────────────────────┘
```

---

## 7. Sales Analytics

### 7.1 Dashboard Metrics

```typescript
interface DashboardMetrics {
  // Overview
  totalRevenue: number;
  totalSales: number;
  avgTransactionValue: number;
  totalMargin: number;
  marginPercent: number;
  
  // Trends
  revenueChange: number;         // vs previous period
  salesChange: number;
  marginChange: number;
  
  // Machine Performance
  topMachines: MachinePerformance[];
  underperformingMachines: MachinePerformance[];
  
  // Product Performance
  topProducts: ProductPerformance[];
  slowMovingProducts: ProductPerformance[];
  outOfStock: OutOfStockItem[];
  
  // Time Analysis
  peakHours: HourlyData[];
  peakDays: DailyData[];
  
  // Pricing Analysis
  avgPricePoint: number;
  priceDistribution: PriceBucket[];
  bundlePerformance: BundleMetrics[];
}
```

### 7.2 Reports

#### 7.2.1 Machine Performance Report

```typescript
interface MachineReport {
  machineId: string;
  period: DateRange;
  
  // Revenue Metrics
  totalRevenue: number;
  revenuePerDay: number;
  revenuePerSlot: number;
  revenueRank: number;           // Among all machines
  
  // Sales Metrics
  totalUnits: number;
  unitsPerDay: number;
  avgBasketSize: number;
  uniqueCustomers: number;       // Estimated from transaction patterns
  
  // Profitability
  totalMargin: number;
  marginPercent: number;
  profitPerSlot: number;
  
  // Efficiency
  stockTurnover: number;         // Times inventory turns per month
  outOfStockRate: number;        // % of time slots were empty
  restockFrequency: number;      // Restocks per week
  
  // Top/Bottom Performers
  topSlots: SlotPerformance[];
  bottomSlots: SlotPerformance[];
  topProducts: ProductPerformance[];
  
  // Recommendations
  recommendations: Recommendation[];
}
```

#### 7.2.2 Product Performance Report

```typescript
interface ProductReport {
  productId: string;
  period: DateRange;
  
  // Sales
  totalUnitsSold: number;
  totalRevenue: number;
  avgPriceSold: number;
  
  // Performance by Location
  performanceByLocation: {
    locationType: LocationType;
    units: number;
    revenue: number;
    avgPrice: number;
  }[];
  
  // Performance by Slot Zone
  performanceByZone: {
    zone: SlotZone;
    units: number;
    conversionRate: number;
  }[];
  
  // Pricing Analysis
  priceElasticity: number;       // How sensitive to price changes
  optimalPrice: number;          // Suggested optimal price point
  
  // Bundling
  frequentlyBoughtWith: Product[];
  bundleParticipation: Bundle[];
  
  // Inventory
  avgDaysToSellOut: number;
  stockoutIncidents: number;
}
```

#### 7.2.3 Pricing Strategy Report

```typescript
interface PricingReport {
  period: DateRange;
  
  // Overall Pricing
  avgSellingPrice: number;
  avgMargin: number;
  priceToCompetitor: number;     // vs market average
  
  // Strategy Performance
  decoyEffectiveness: {
    decoyId: string;
    targetId: string;
    targetSalesLift: number;     // % increase in target sales
  }[];
  
  anchorEffectiveness: {
    anchorId: string;
    surroundingProducts: string[];
    avgPricePerception: number;  // Survey data if available
  }[];
  
  bundlePerformance: {
    bundleId: string;
    takeRate: number;            // % of eligible who chose bundle
    incrementalRevenue: number;
    avgDiscount: number;
  }[];
  
  // Price Testing Results
  activeTests: PriceTest[];
  completedTests: PriceTest[];
  
  // Recommendations
  priceIncreaseOpportunities: Product[];
  priceDecreaseNeeded: Product[];
}
```

### 7.3 Alerts & Notifications

```typescript
interface AlertConfig {
  // Inventory Alerts
  lowStockThreshold: number;     // % remaining
  criticalStockThreshold: number;
  stockoutAlert: boolean;
  
  // Performance Alerts
  dailyRevenueTarget: number;
  underperformanceThreshold: number; // % below target
  
  // Maintenance Alerts
  offlineDurationThreshold: number;  // minutes
  jamAlertEnabled: boolean;
  
  // Pricing Alerts
  marginThresholdMin: number;    // Alert if margin drops below
  priceTestComplete: boolean;
  
  // Notification Channels
  email: string[];
  sms: string[];
  slack?: string;                // Webhook URL
}

interface Alert {
  id: string;
  type: AlertType;
  severity: "critical" | "warning" | "info";
  
  machineId?: string;
  productId?: string;
  slotId?: string;
  
  title: string;
  message: string;
  actionRequired: string;
  
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

enum AlertType {
  LOW_STOCK = "low_stock",
  STOCKOUT = "stockout",
  UNDERPERFORMANCE = "underperformance",
  MACHINE_OFFLINE = "machine_offline",
  SLOT_JAM = "slot_jam",
  LOW_MARGIN = "low_margin",
  PRICE_TEST_COMPLETE = "price_test_complete",
  RESTOCK_NEEDED = "restock_needed"
}
```

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

**Week 1-2: Database & Core Models**
- [ ] Set up PostgreSQL database
- [ ] Create machine, slot, product schemas
- [ ] Create sale transaction schema
- [ ] Build basic CRUD APIs

**Week 3-4: Inventory Management**
- [ ] Real-time inventory tracking
- [ ] Restock alert system
- [ ] Par level calculations
- [ ] Basic inventory dashboard

### Phase 2: Pricing Engine (Weeks 5-8)

**Week 5-6: Core Pricing**
- [ ] Location-based pricing profiles
- [ ] Zone multipliers
- [ ] Charm pricing logic
- [ ] Price calculation engine

**Week 7-8: Behavioral Pricing**
- [ ] Decoy effect configuration
- [ ] Anchor product placement
- [ ] Price A/B testing framework
- [ ] Pricing dashboard

### Phase 3: Bundling & Positioning (Weeks 9-12)

**Week 9-10: Bundle Engine**
- [ ] Bundle templates
- [ ] Bundle suggestion algorithm
- [ ] Market basket analysis
- [ ] Bundle performance tracking

**Week 11-12: Slot Positioning**
- [ ] Zone configuration
- [ ] Heat map generation
- [ ] Positioning recommendations
- [ ] Planogram builder

### Phase 4: Analytics & Optimization (Weeks 13-16)

**Week 13-14: Analytics Dashboard**
- [ ] Machine performance reports
- [ ] Product performance reports
- [ ] Time-based analysis
- [ ] Export functionality

**Week 15-16: Optimization & Polish**
- [ ] Recommendation engine
- [ ] Alert fine-tuning
- [ ] Mobile-responsive dashboard
- [ ] Documentation & training

---

## Appendix A: API Endpoints

```
# Machines
GET    /api/machines                    # List all machines
GET    /api/machines/:id                # Get machine details
POST   /api/machines                    # Create machine
PUT    /api/machines/:id                # Update machine
GET    /api/machines/:id/slots          # Get machine slots
GET    /api/machines/:id/inventory      # Get current inventory
POST   /api/machines/:id/restock        # Record restock

# Slots
GET    /api/slots/:id                   # Get slot details
PUT    /api/slots/:id                   # Update slot
PUT    /api/slots/:id/product           # Assign product to slot

# Products
GET    /api/products                    # List products
GET    /api/products/:id                # Get product details
GET    /api/products/:id/pricing        # Get pricing by machine

# Pricing
GET    /api/pricing/profiles            # List pricing profiles
POST   /api/pricing/calculate           # Calculate price
POST   /api/pricing/test                # Create price test
GET    /api/pricing/test/:id            # Get test results

# Bundles
GET    /api/bundles                     # List bundles
POST   /api/bundles                     # Create bundle
POST   /api/bundles/suggest             # Get bundle suggestions
GET    /api/bundles/:id/performance     # Bundle performance

# Analytics
GET    /api/analytics/overview          # Dashboard overview
GET    /api/analytics/machines/:id      # Machine report
GET    /api/analytics/products/:id      # Product report
GET    /api/analytics/heatmap/:machineId # Slot heatmap
GET    /api/analytics/pricing           # Pricing report

# Sales
POST   /api/sales                       # Record sale (from machine)
GET    /api/sales                       # List sales (filtered)

# Alerts
GET    /api/alerts                      # List alerts
PUT    /api/alerts/:id/acknowledge      # Acknowledge alert
PUT    /api/alerts/:id/resolve          # Resolve alert
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Anchor** | High-priced product that makes other products seem reasonable |
| **Charm Pricing** | Prices ending in .99 or .95 |
| **Decoy** | Product designed to make another product more attractive |
| **Lift** | Increase in probability of buying B when A is bought |
| **Par Level** | Optimal inventory quantity after restocking |
| **Slot** | Individual product position in vending machine |
| **Support** | Percentage of transactions containing item(s) |
| **Velocity** | Rate of sales (units per time period) |
| **Zone** | Group of slots with similar positioning characteristics |

---

*Document Version: 1.0*
*Author: Jarvis (AI Assistant)*
*For: Kande VendTech*
