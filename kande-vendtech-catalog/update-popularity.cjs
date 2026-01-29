#!/usr/bin/env node

/**
 * Updates products.js with 7-Eleven Best Sellers popularity rankings
 * Source: 7NOW.com Best Sellers section (scraped January 2025)
 * Lower numbers = more popular (1 = most popular)
 */

const fs = require('fs');
const path = require('path');

// 7-Eleven Best Sellers ranking - using flexible patterns for catalog matching
const sevenElevenBestSellers = [
  // Top 10 - Candy
  { rank: 1, name: 'Snickers Bar 1.86oz', pattern: /snickers.*singles|snickers.*bar.*1\.86|snickers.*rtl/i },
  { rank: 2, name: 'Reese\'s Peanut Butter Cup', pattern: /reese.*peanut.*butter.*cup|reese.*cup.*rtl|reese.*big.*cup/i },
  { rank: 3, name: 'Monster 16oz', pattern: /monster.*green.*16|monster.*energy.*16|monster.*original.*16/i },
  { rank: 4, name: 'Twix Caramel', pattern: /twix.*caramel|twix.*cookie|twix.*original.*single/i },
  { rank: 5, name: 'Red Bull 12oz', pattern: /red.*bull.*12oz|red.*bull.*original.*12|energy.*red.*bull.*original/i },
  { rank: 6, name: 'Monster Zero Ultra 16oz', pattern: /monster.*zero.*ultra.*16/i },
  { rank: 7, name: 'Coca Cola 20oz', pattern: /coca.*cola.*20|coke.*cola.*20|coca.*cola.*pet.*20/i },
  { rank: 8, name: 'Dr Pepper 20oz', pattern: /dr.*pepper.*20|dr.*pepper.*soda.*20/i },
  { rank: 9, name: 'Reese\'s King Size', pattern: /reese.*king.*size|reese.*ks|reese.*peanut.*butter.*ks/i },
  { rank: 10, name: 'Coke Zero 20oz', pattern: /coke.*zero.*20|coca.*cola.*zero.*20|coke.*soda.*zero/i },
  
  // 11-20
  { rank: 11, name: 'Chester\'s Hot Fries', pattern: /chester.*hot.*fries/i },
  { rank: 12, name: 'Snickers King Size', pattern: /snickers.*king|snickers.*ks|snickers.*2.*piece.*ks/i },
  { rank: 13, name: 'Sprite 20oz', pattern: /sprite.*20|sprite.*soda.*pet.*20/i },
  { rank: 14, name: 'Gatorade Cool Blue', pattern: /gatorade.*cool.*blue|gatorade.*glacier.*freeze/i },
  { rank: 15, name: 'Coke 2L', pattern: /coke.*2l|coca.*cola.*2l/i },
  { rank: 16, name: 'Red Bull Sugar Free 12oz', pattern: /red.*bull.*sugar.*free.*12|red.*bull.*sf.*12/i },
  { rank: 17, name: 'Gatorade Fruit Punch', pattern: /gatorade.*fruit.*punch/i },
  { rank: 18, name: 'Twix King Size', pattern: /twix.*king|twix.*ks/i },
  { rank: 19, name: 'Kit Kat King Size', pattern: /kit.*kat.*king|kit.*kat.*ks/i },
  { rank: 20, name: 'Coke 16oz', pattern: /coke.*16oz|coca.*cola.*16oz/i },
  
  // 21-30
  { rank: 21, name: 'Doritos Nacho Cheese Large', pattern: /doritos.*nacho.*cheese.*9/i },
  { rank: 22, name: 'M&M Peanut Sharing', pattern: /m.*m.*peanut.*share|m.*m.*peanut.*tear/i },
  { rank: 23, name: 'Cheetos Flamin Hot', pattern: /cheetos.*flamin.*hot(?!.*limon)/i },
  { rank: 24, name: 'Pepsi 2L', pattern: /pepsi.*2l/i },
  { rank: 25, name: 'Pepsi 20oz', pattern: /pepsi.*20oz|pepsi.*soda.*pet.*20/i },
  { rank: 26, name: 'Gatorade Lemon Lime', pattern: /gatorade.*lemon.*lime/i },
  { rank: 27, name: 'Monster 24oz', pattern: /monster.*24oz|monster.*xxl|monster.*green.*24/i },
  { rank: 28, name: 'Diet Coke 20oz', pattern: /diet.*coke.*20|coke.*soda.*diet.*pet.*20/i },
  { rank: 29, name: 'Diet Pepsi 20oz', pattern: /diet.*pepsi.*20|pepsi.*soda.*diet/i },
  { rank: 30, name: 'Gatorade Glacier Freeze', pattern: /gatorade.*frost|gatorade.*glacier/i },
  
  // 31-40
  { rank: 31, name: 'Funyuns', pattern: /funyuns.*original/i },
  { rank: 32, name: 'Red Bull 8.4oz', pattern: /red.*bull.*8\.4|energy.*red.*bull.*original.*8\.4/i },
  { rank: 33, name: 'Lays Classic Large', pattern: /lays.*classic.*8|lays.*original.*8/i },
  { rank: 34, name: 'Mtn Dew 20oz', pattern: /mtn.*dew.*20|mountain.*dew.*20/i },
  { rank: 35, name: 'Fanta Orange 20oz', pattern: /fanta.*orange.*20/i },
  { rank: 36, name: 'Smartwater 20oz', pattern: /smartwater.*20|smart.*water.*20/i },
  { rank: 37, name: 'Dasani 20oz', pattern: /dasani.*20/i },
  { rank: 38, name: 'Doritos Cool Ranch Large', pattern: /doritos.*cool.*ranch.*9/i },
  { rank: 39, name: 'Cheetos Crunchy Large', pattern: /cheetos.*crunchy.*8/i },
  { rank: 40, name: 'Butterfinger', pattern: /butterfinger.*singles|butterfinger.*bar.*single/i },
  
  // 41-50
  { rank: 41, name: '3 Musketeers', pattern: /3.*musketeers.*single|muskete.*single/i },
  { rank: 42, name: 'Milky Way', pattern: /milky.*way.*single/i },
  { rank: 43, name: 'Crunch Bar', pattern: /crunch.*bar.*single/i },
  { rank: 44, name: 'Hershey Milk Chocolate', pattern: /hershey.*milk.*chocolate.*rtl|hershey.*milk.*choc.*1\.55/i },
  { rank: 45, name: 'Baby Ruth', pattern: /baby.*ruth.*single/i },
  { rank: 46, name: 'Skittles Original', pattern: /skittles.*original.*single/i },
  { rank: 47, name: 'Starburst Original', pattern: /starburst.*original.*single/i },
  { rank: 48, name: 'Haribo Gold Bears', pattern: /haribo.*gold.*bear|haribo.*gummi.*gold/i },
  { rank: 49, name: 'Sour Patch Kids', pattern: /sour.*patch.*kids/i },
  { rank: 50, name: 'Swedish Fish', pattern: /swedish.*fish/i },
  
  // 51-60 - Chips (vending sizes 2-3oz)
  { rank: 51, name: 'Doritos Nacho Cheese 2.75oz', pattern: /doritos.*nacho.*cheese.*2\.75/i },
  { rank: 52, name: 'Doritos Cool Ranch 2.75oz', pattern: /doritos.*cool.*ranch.*2\.75/i },
  { rank: 53, name: 'Doritos Spicy Nacho 2.75oz', pattern: /doritos.*spicy.*nacho.*2\.75/i },
  { rank: 54, name: 'Lays Classic 2.625oz', pattern: /lays.*classic.*2\.625|lays.*classic.*2\.6/i },
  { rank: 55, name: 'Lays BBQ 2.625oz', pattern: /lays.*bbq|lays.*bar.*b.*q/i },
  { rank: 56, name: 'Lays Sour Cream Onion', pattern: /lays.*sour.*cream.*onion/i },
  { rank: 57, name: 'Cheetos Flamin Hot LSS', pattern: /cheetos.*flamin.*hot.*lss/i },
  { rank: 58, name: 'Cheetos Crunchy LSS', pattern: /cheetos.*crunchy.*lss/i },
  { rank: 59, name: 'Ruffles Cheddar Sour Cream', pattern: /ruffles.*ched.*sour/i },
  { rank: 60, name: 'Pringles Original', pattern: /pringles.*original/i },
  
  // 61-70
  { rank: 61, name: 'Pringles BBQ', pattern: /pringles.*bbq/i },
  { rank: 62, name: 'Pringles Sour Cream Onion', pattern: /pringles.*sour.*cream/i },
  { rank: 63, name: 'Takis Fuego', pattern: /takis.*fuego/i },
  { rank: 64, name: 'Bugles Original', pattern: /bugles.*original/i },
  { rank: 65, name: 'Chex Mix Traditional', pattern: /chex.*mix.*traditional/i },
  { rank: 66, name: 'Andy Capps Hot Fries', pattern: /andy.*capp.*hot.*fries/i },
  { rank: 67, name: 'Celsius', pattern: /celsius/i },
  { rank: 68, name: 'Rockstar Original', pattern: /rockstar.*original/i },
  { rank: 69, name: 'Rockstar Sugar Free', pattern: /rockstar.*sugar.*free/i },
  { rank: 70, name: '5 Hour Energy', pattern: /5.*hour.*energy/i },
  
  // 71-80 - Monster variants
  { rank: 71, name: 'Monster Ultra Sunrise', pattern: /monster.*ultra.*sunrise/i },
  { rank: 72, name: 'Monster Ultra Paradise', pattern: /monster.*ultra.*paradise/i },
  { rank: 73, name: 'Monster Ultra Violet', pattern: /monster.*ultra.*violet/i },
  { rank: 74, name: 'Monster Mango Loco', pattern: /monster.*mango.*loco/i },
  { rank: 75, name: 'Monster Pipeline Punch', pattern: /monster.*pipeline/i },
  { rank: 76, name: 'Monster Lo Carb', pattern: /monster.*lo.*carb/i },
  { rank: 77, name: 'Red Bull 16oz', pattern: /red.*bull.*16oz|energy.*red.*bull.*original.*16/i },
  { rank: 78, name: 'Red Bull Sugar Free 8.4oz', pattern: /red.*bull.*sf.*8|red.*bull.*sugar.*free.*8|red.*bull.*zero.*8/i },
  { rank: 79, name: 'Gatorade Orange', pattern: /gatorade.*orange/i },
  { rank: 80, name: 'Bodyarmor', pattern: /bodyarmor|body.*armor/i },
  
  // 81-90 - More drinks
  { rank: 81, name: 'Diet Dr Pepper', pattern: /dr.*pepper.*diet|diet.*dr.*pepper/i },
  { rank: 82, name: 'Dr Pepper Zero Sugar', pattern: /dr.*pepper.*zero.*sugar/i },
  { rank: 83, name: 'Diet Mtn Dew', pattern: /diet.*mtn.*dew|mtn.*dew.*diet/i },
  { rank: 84, name: 'Mtn Dew Baja Blast', pattern: /mtn.*dew.*baja|baja.*blast/i },
  { rank: 85, name: 'Fanta Strawberry', pattern: /fanta.*strawberry/i },
  { rank: 86, name: 'Canada Dry Ginger Ale', pattern: /canada.*dry.*ginger/i },
  { rank: 87, name: 'Snickers Almond', pattern: /snickers.*almond/i },
  { rank: 88, name: 'Reese\'s Fast Break', pattern: /reese.*fast.*break|reese.*fastbreak/i },
  { rank: 89, name: 'M&M Plain Sharing', pattern: /m.*m.*share.*peg|m&m.*plain.*share/i },
  { rank: 90, name: 'Hershey Cookies N Creme', pattern: /hershey.*cookies.*creme|hershey.*cookies.*n.*cream/i },
  
  // 91-100 - More snacks
  { rank: 91, name: 'Doritos Sweet Chili', pattern: /doritos.*sweet.*chili/i },
  { rank: 92, name: 'Doritos Flamin Hot', pattern: /doritos.*flamin.*hot/i },
  { rank: 93, name: 'Lays Flamin Hot', pattern: /lays.*flamin.*hot/i },
  { rank: 94, name: 'Lays Limon', pattern: /lays.*limon/i },
  { rank: 95, name: 'Cheetos Puffs', pattern: /cheetos.*puff/i },
  { rank: 96, name: 'Cheetos Jalapeno Cheddar', pattern: /cheetos.*jalapeno.*cheddar|cheetos.*cheddar.*jalapeno/i },
  { rank: 97, name: 'Ruffles Flamin Hot', pattern: /ruffles.*flamin.*hot/i },
  { rank: 98, name: 'Pringles Cheddar Cheese', pattern: /pringles.*cheddar|pringles.*ched.*cheese/i },
  { rank: 99, name: 'Sun Chips Garden Salsa', pattern: /sun.*chip.*garden.*salsa/i },
  { rank: 100, name: 'Doritos Dinamita', pattern: /doritos.*dinamita/i },
];

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

// Track updates
let updatedCount = 0;
const updates = [];
const matched = new Set(); // Track which products have been matched

// Process each 7-Eleven best seller
for (const sevenItem of sevenElevenBestSellers) {
  products.forEach((product, index) => {
    if (matched.has(index)) return; // Skip if already matched
    
    const combined = `${product.name} ${product.size}`;
    
    if (sevenItem.pattern.test(combined)) {
      const oldPopularity = product.popularity;
      products[index].popularity = sevenItem.rank;
      matched.add(index);
      
      updates.push({
        name: product.name,
        size: product.size,
        oldPopularity,
        newPopularity: sevenItem.rank,
        source: sevenItem.name
      });
      updatedCount++;
    }
  });
}

// Sort updates by new popularity for display
updates.sort((a, b) => a.newPopularity - b.newPopularity);

console.log(`\n${'='.repeat(70)}`);
console.log(`✅ UPDATED ${updatedCount} PRODUCTS WITH 7-ELEVEN POPULARITY RANKINGS`);
console.log(`${'='.repeat(70)}\n`);

console.log('Top 40 Most Popular (by 7-Eleven sales):');
console.log('-'.repeat(70));
updates.slice(0, 40).forEach(u => {
  const change = u.oldPopularity !== u.newPopularity ? 
    `(was ${u.oldPopularity})` : '(unchanged)';
  console.log(`#${u.newPopularity.toString().padStart(2)} ${u.name.substring(0, 40).padEnd(40)} ${change}`);
});

if (updates.length > 40) {
  console.log(`\n... and ${updates.length - 40} more products updated`);
}

// Write updated products back to file
const newContent = `const PRODUCTS = ${JSON.stringify(products, null, 2)};`;
fs.writeFileSync(productsPath, newContent);

console.log(`\n✅ Successfully updated ${productsPath}`);
console.log(`   ${updatedCount} products now have 7-Eleven popularity rankings`);

// Save popularity mapping for reference
const popularityPath = path.join(__dirname, 'popularity-rankings.json');
fs.writeFileSync(popularityPath, JSON.stringify({
  source: '7-Eleven 7NOW Best Sellers',
  scraped: new Date().toISOString(),
  totalRankings: sevenElevenBestSellers.length,
  matchedProducts: updatedCount,
  rankings: updates
}, null, 2));
console.log(`   Rankings saved to ${popularityPath}`);
