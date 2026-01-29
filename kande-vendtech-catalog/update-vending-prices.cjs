#!/usr/bin/env node

/**
 * Updates products.js with competitive vending prices based on 7-Eleven pricing
 * Strategy: 7-Eleven price + $0.25
 */

const fs = require('fs');
const path = require('path');

// 7-Eleven prices collected from 7NOW.com (January 2025)
const sevenElevenPrices = {
  // CANDY - Singles/Standard bars
  'snickers': { size: '1.86oz', price: 2.99, keywords: ['snickers', 'singles'] },
  'snickers-ks': { size: '3.29oz', price: 3.99, keywords: ['snickers', 'king', 'ks'] },
  'snickers-almond-ks': { size: '2ct', price: 3.99, keywords: ['snickers', 'almond', 'king', 'ks'] },
  'reeses-fastbreak-ks': { size: '3.5oz', price: 2.99, keywords: ['reese', 'fastbreak', 'fast break', 'king', 'ks'] },
  'mm-peanut': { size: '3.27oz', price: 3.49, keywords: ['m&m', 'm m', 'peanut', 'share'] },
  'mm-plain': { size: '3.14oz', price: 3.49, keywords: ['m&m', 'm m', 'share', 'peg'] },
  'kitkat-ks': { size: '3oz', price: 3.49, keywords: ['kit kat', 'kitkat', 'king', 'ks'] },
  'twix-ks': { size: '3.02oz', price: 3.49, keywords: ['twix', 'king', 'ks'] },
  'hershey-milk': { size: '1.55oz', price: 2.99, keywords: ['hershey', 'milk', 'chocolate', 'rtl', '1.55'] },
  'hershey-cookies': { size: '1.54oz', price: 2.99, keywords: ['hershey', 'cookies', 'creme', 'cream'] },
  'butterfinger': { size: '1.9oz', price: 2.99, keywords: ['butterfinger', 'singles', '1.9'] },
  'babyruth': { size: '1.9oz', price: 2.99, keywords: ['baby ruth', 'babyruth', 'singles'] },
  'crunch': { size: '1.55oz', price: 2.99, keywords: ['crunch', 'single', '1.55'] },
  '3musketeers': { size: '1.92oz', price: 2.99, keywords: ['3 musketeers', 'muskete', 'singles', '1.92'] },
  'milkyway': { size: '1.84oz', price: 2.99, keywords: ['milky way', 'milkyway', 'singles'] },
  'skittles': { size: '2.17oz', price: 2.49, keywords: ['skittles', 'original', 'singles'] },
  'starburst': { size: '2.07oz', price: 2.49, keywords: ['starburst', 'original', 'singles'] },
  'haribo': { size: '5oz', price: 3.49, keywords: ['haribo', 'gold', 'bear', '5'] },
  'sourpatch': { size: 'peg', price: 2.99, keywords: ['sour patch', 'sourpatch', 'peg'] },
  'swedishfish': { size: '3.1oz', price: 2.99, keywords: ['swedish fish', 'swedishfish', 'soft', 'red'] },

  // CHIPS - Doritos
  'doritos-nacho': { size: '2.75oz', price: 2.69, keywords: ['doritos', 'nacho', 'cheese', '2.75'] },
  'doritos-coolranch': { size: '2.75oz', price: 2.69, keywords: ['doritos', 'cool', 'ranch', '2.75'] },
  'doritos-spicynacho': { size: '2.75oz', price: 2.69, keywords: ['doritos', 'spicy', 'nacho', '2.75'] },
  'doritos-sweetchili': { size: '2.75oz', price: 2.69, keywords: ['doritos', 'sweet', 'chili', '2.75'] },
  'doritos-flamin': { size: '2.75oz', price: 2.69, keywords: ['doritos', 'flamin', 'hot', '2.75'] },
  'doritos-dinamita': { size: '4oz', price: 2.69, keywords: ['doritos', 'dinamita', 'chile', 'limon'] },

  // CHIPS - Lay's
  'lays-classic': { size: '2.625oz', price: 2.69, keywords: ['lays', 'lay', 'classic', 'original', '2.6'] },
  'lays-bbq': { size: '2.62oz', price: 2.69, keywords: ['lays', 'lay', 'bbq', 'bar b', '2.6'] },
  'lays-sourcream': { size: '2.625oz', price: 2.69, keywords: ['lays', 'lay', 'sour', 'cream', 'onion', '2.6'] },
  'lays-flamin': { size: '2.5oz', price: 2.69, keywords: ['lays', 'lay', 'flamin', 'hot', '2.5'] },
  'lays-limon': { size: '2.625oz', price: 2.69, keywords: ['lays', 'lay', 'limon', '2.6'] },

  // CHIPS - Cheetos
  'cheetos-flamin': { size: '2oz', price: 2.69, keywords: ['cheetos', 'flamin', 'hot', '2'] },
  'cheetos-crunchy': { size: '2oz', price: 2.69, keywords: ['cheetos', 'crunchy', '2'] },
  'cheetos-puffs': { size: '2oz', price: 2.69, keywords: ['cheetos', 'puffs', '2'] },
  'cheetos-jalapeno': { size: '2oz', price: 2.69, keywords: ['cheetos', 'jalapeno', 'cheddar', '2'] },

  // CHIPS - Ruffles
  'ruffles-cheddarsour': { size: '2.5oz', price: 2.69, keywords: ['ruffles', 'ched', 'sour', 'cream', '2.5'] },
  'ruffles-flamin': { size: '2.5oz', price: 2.69, keywords: ['ruffles', 'flamin', 'hot', '2.5'] },

  // CHIPS - Pringles
  'pringles-original': { size: '2.5oz', price: 2.49, keywords: ['pringles', 'original', '2.5', '2.3'] },
  'pringles-bbq': { size: '2.5oz', price: 2.49, keywords: ['pringles', 'bbq', '2.5', '2.3'] },
  'pringles-sourcream': { size: '2.5oz', price: 2.49, keywords: ['pringles', 'sour', 'cream', 'onion', '2.5', '2.3'] },
  'pringles-cheddar': { size: '2.5oz', price: 2.49, keywords: ['pringles', 'ched', 'cheese', '2.5', '2.3'] },

  // CHIPS - Other
  'takis-fuego': { size: '4oz', price: 2.69, keywords: ['takis', 'fuego', '4'] },
  'funyuns': { size: '2.125oz', price: 2.69, keywords: ['funyuns', 'original', '2.125'] },
  'bugles': { size: '3oz', price: 3.29, keywords: ['bugles', 'original', '3'] },
  'chexmix': { size: '3.75oz', price: 3.79, keywords: ['chex', 'mix', 'traditional', '3.75'] },
  'sunchips': { size: '2.75oz', price: 4.99, keywords: ['sun', 'chip', 'garden', 'salsa', '2.75'] },
  'andycapps': { size: '3oz', price: 2.09, keywords: ['andy', 'capp', 'hot', 'fries', '3'] },

  // SODAS - 20oz
  'coke-20': { size: '20oz', price: 3.29, keywords: ['coca', 'cola', 'coke', '20'] },
  'coke-16': { size: '16oz', price: 2.79, keywords: ['coca', 'cola', 'coke', '16'] },
  'dietcoke-20': { size: '20oz', price: 3.29, keywords: ['diet', 'coke', '20'] },
  'cokezero-20': { size: '20oz', price: 3.29, keywords: ['coke', 'zero', 'sugar', '20'] },
  'sprite-20': { size: '20oz', price: 3.29, keywords: ['sprite', '20'] },
  'fanta-20': { size: '20oz', price: 3.29, keywords: ['fanta', 'orange', '20'] },
  'pepsi-20': { size: '20oz', price: 3.29, keywords: ['pepsi', '20'] },
  'dietpepsi-20': { size: '20oz', price: 3.29, keywords: ['diet', 'pepsi', '20'] },
  'mtndew-20': { size: '20oz', price: 3.29, keywords: ['mtn', 'dew', 'mountain', '20'] },
  'dietmtndew-20': { size: '20oz', price: 3.29, keywords: ['diet', 'mtn', 'dew', '20'] },
  'drpepper-20': { size: '20oz', price: 3.29, keywords: ['dr', 'pepper', '20'] },
  'dietdrpepper-20': { size: '20oz', price: 3.29, keywords: ['diet', 'dr', 'pepper', '20'] },

  // ENERGY DRINKS - Red Bull
  'redbull-8': { size: '8.4oz', price: 3.49, keywords: ['red', 'bull', '8.4'] },
  'redbull-12': { size: '12oz', price: 4.39, keywords: ['red', 'bull', '12oz', '12 oz'] },
  'redbull-16': { size: '16oz', price: 5.09, keywords: ['red', 'bull', '16'] },
  'redbull-sf-8': { size: '8.4oz', price: 3.49, keywords: ['red', 'bull', 'sugar', 'free', 'sf', '8.4'] },
  'redbull-sf-12': { size: '12oz', price: 4.39, keywords: ['red', 'bull', 'sugar', 'free', 'sf', '12'] },

  // ENERGY DRINKS - Monster 16oz
  'monster-green-16': { size: '16oz', price: 3.89, keywords: ['monster', 'green', 'original', '16'] },
  'monster-zero-16': { size: '16oz', price: 3.89, keywords: ['monster', 'zero', 'ultra', '16'] },
  'monster-locarb-16': { size: '16oz', price: 3.89, keywords: ['monster', 'lo', 'carb', '16'] },
  'monster-sunrise-16': { size: '16oz', price: 3.89, keywords: ['monster', 'ultra', 'sunrise', '16'] },
  'monster-paradise-16': { size: '16oz', price: 3.89, keywords: ['monster', 'ultra', 'paradise', '16'] },
  'monster-violet-16': { size: '16oz', price: 3.89, keywords: ['monster', 'ultra', 'violet', '16'] },
  'monster-mango-16': { size: '16oz', price: 3.89, keywords: ['monster', 'mango', 'loco', '16'] },
  'monster-pipeline-16': { size: '16oz', price: 3.89, keywords: ['monster', 'pipeline', 'punch', '16'] },
  'monster-24': { size: '24oz', price: 5.09, keywords: ['monster', '24'] },

  // ENERGY DRINKS - Rockstar 16oz
  'rockstar-original': { size: '16oz', price: 3.49, keywords: ['rockstar', 'original', '16'] },
  'rockstar-sf': { size: '16oz', price: 3.49, keywords: ['rockstar', 'sugar', 'free', '16'] },
  'rockstar-punched': { size: '16oz', price: 3.49, keywords: ['rockstar', 'punched', 'punch', '16'] },

  // ENERGY DRINKS - Celsius
  'celsius': { size: '12oz', price: 3.39, keywords: ['celsius', '12'] },

  // ENERGY DRINKS - 5-Hour
  '5hour': { size: 'extra', price: 4.19, keywords: ['5', 'hour', 'energy', 'extra', 'strength'] },

  // WATER & OTHER
  'dasani': { size: '20oz', price: 2.79, keywords: ['dasani', '20'] },
  'smartwater': { size: '20oz', price: 3.29, keywords: ['smart', 'water', '20'] },
  'gatorade': { size: '20oz', price: 3.29, keywords: ['gatorade', '20'] },
  'bodyarmor': { size: '16oz', price: 3.29, keywords: ['body', 'armor', 'bodyarmor', '16'] },
};

// Read products.js
const productsPath = path.join(__dirname, 'dashboard', 'products.js');
let content = fs.readFileSync(productsPath, 'utf-8');

// Extract the PRODUCTS array
const match = content.match(/const PRODUCTS = (\[[\s\S]*\]);/);
if (!match) {
  console.error('Could not find PRODUCTS array in file');
  process.exit(1);
}

let products;
try {
  products = eval(match[1]);
} catch (e) {
  console.error('Failed to parse PRODUCTS:', e);
  process.exit(1);
}

console.log(`Loaded ${products.length} products`);

// Match function - checks if product matches 7-Eleven item
function matchProduct(product, sevenItem) {
  const name = product.name.toLowerCase();
  const size = product.size.toLowerCase();
  const combined = name + ' ' + size;
  
  // Must match ALL keywords
  return sevenItem.keywords.every(keyword => combined.includes(keyword.toLowerCase()));
}

// Find best match for each product
let updatedCount = 0;
const updates = [];

products.forEach((product, index) => {
  for (const [key, sevenItem] of Object.entries(sevenElevenPrices)) {
    if (matchProduct(product, sevenItem)) {
      const vendingPrice = Math.round((sevenItem.price + 0.25) * 100) / 100;
      
      // Only update if there's a meaningful difference and vending price > unit cost
      if (vendingPrice > product.unitPrice * 1.2) {
        updates.push({
          index,
          name: product.name,
          size: product.size,
          unitCost: product.unitPrice,
          sevenElevenPrice: sevenItem.price,
          vendingPrice,
          margin: Math.round((vendingPrice - product.unitPrice) * 100) / 100,
          matched: key
        });
        
        // Add vendingPriceOverride to product
        products[index].vendingPriceOverride = vendingPrice;
        updatedCount++;
      }
      break; // Only match first item
    }
  }
});

// Sort updates by name for readability
updates.sort((a, b) => a.name.localeCompare(b.name));

console.log(`\n=== UPDATED ${updatedCount} PRODUCTS ===\n`);
updates.forEach(u => {
  console.log(`✓ ${u.name} (${u.size})`);
  console.log(`  Unit Cost: $${u.unitCost.toFixed(2)} | 7-Eleven: $${u.sevenElevenPrice.toFixed(2)} | Vending: $${u.vendingPrice.toFixed(2)} | Margin: $${u.margin.toFixed(2)}`);
});

// Write updated products back to file
const newContent = `const PRODUCTS = ${JSON.stringify(products, null, 2)};`;
fs.writeFileSync(productsPath, newContent);

console.log(`\n✅ Successfully updated ${productsPath}`);
console.log(`   ${updatedCount} products now have vendingPriceOverride field`);
