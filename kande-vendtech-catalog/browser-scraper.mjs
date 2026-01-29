#!/usr/bin/env node
/**
 * VendHub Product Scraper using Clawdbot Browser Control
 * This script extracts product data from VendHub categories
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONTROL_URL = 'http://127.0.0.1:18791';

const CATEGORIES = [
  { name: 'SNACKS', expected: 899 },
  { name: 'CANDY', expected: 774 },
  { name: 'COLD BEVERAGE', expected: 369 },
  { name: 'FROZEN FOODS', expected: 645 },
  { name: 'HOT FOODS', expected: 70 },
  { name: 'REFRIGERATED', expected: 181 },
  { name: 'SPECIALTY BETTER4YOU', expected: 268 }
];

// Non-food keywords to filter out
const NON_FOOD_KEYWORDS = [
  'cup', 'cups', 'lid', 'lids', 'straw', 'straws', 'napkin', 'napkins',
  'utensil', 'utensils', 'fork', 'forks', 'spoon', 'spoons', 'knife', 'knives',
  'plate', 'plates', 'bowl', 'bowls', 'container', 'containers', 'foil',
  'wrap', 'bags', 'tray', 'trays', 'sleeve', 'sleeves', 'holder',
  'dispenser', 'dispensers', 'stirrer', 'stirrers', 'toothpick', 'toothpicks'
];

function isFoodItem(name) {
  const lowerName = name.toLowerCase();
  // Allow peanut butter cups, etc.
  if (lowerName.includes('peanut butter cup') || lowerName.includes('reese')) {
    return true;
  }
  return !NON_FOOD_KEYWORDS.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(lowerName);
  });
}

async function browserRequest(action, params = {}) {
  const body = { action, ...params };
  const res = await fetch(CONTROL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function scrapeCategory(category) {
  const categoryUrl = `https://www.vendhubhq.com/market/categories/${encodeURIComponent(category.name)}`;
  console.log(`\n=== Scraping ${category.name} (expected: ${category.expected} products) ===`);
  console.log(`URL: ${categoryUrl}`);
  
  // Navigate to category
  const navResult = await browserRequest('navigate', { targetUrl: categoryUrl });
  console.log('Navigation result:', navResult.status);
  
  await sleep(3000);
  
  // Click Load More until no more products
  let iteration = 0;
  let lastProductCount = 0;
  let stableCount = 0;
  
  while (iteration < 100) {
    // Check current state
    const snapshot = await browserRequest('snapshot', { compact: true, maxChars: 100000 });
    
    // Count products in snapshot
    const snapshotText = JSON.stringify(snapshot);
    const productMatches = snapshotText.match(/\/market\/products\/[a-f0-9-]+/g) || [];
    const productCount = new Set(productMatches).size;
    
    console.log(`  Iteration ${iteration}: ${productCount} products loaded`);
    
    if (productCount === lastProductCount) {
      stableCount++;
      if (stableCount >= 3) {
        console.log('  Product count stable, checking for Load More button...');
      }
    } else {
      stableCount = 0;
    }
    lastProductCount = productCount;
    
    // Try to find and click Load More
    const loadMoreMatch = snapshotText.match(/"Load More".*?\[ref=([^\]]+)\]/);
    if (loadMoreMatch) {
      const ref = loadMoreMatch[1];
      console.log(`  Clicking Load More (ref: ${ref})`);
      await browserRequest('act', { 
        request: { kind: 'click', ref: ref }
      });
      await sleep(2000);
      iteration++;
    } else {
      console.log('  No Load More button found');
      if (stableCount >= 2) {
        break;
      }
      await sleep(1000);
      iteration++;
    }
    
    // Safety check - if we've loaded most expected products, we can stop
    if (productCount >= category.expected * 0.95) {
      console.log(`  Reached ${Math.round(productCount/category.expected*100)}% of expected products`);
      break;
    }
  }
  
  // Extract product data using evaluate
  console.log('  Extracting product data...');
  const extractResult = await browserRequest('act', {
    request: {
      kind: 'evaluate',
      fn: `() => {
        const products = [];
        const links = document.querySelectorAll('a[href*="/market/products/"]');
        
        links.forEach(link => {
          try {
            const href = link.getAttribute('href');
            const idMatch = href.match(/\\/market\\/products\\/([a-f0-9-]+)/);
            if (!idMatch) return;
            
            const id = idMatch[1];
            const img = link.querySelector('img');
            const imageUrl = img ? img.src : '';
            
            const heading = link.querySelector('h3');
            let name = '';
            let size = '';
            
            if (heading) {
              const fullText = heading.textContent || '';
              const sizeMatch = fullText.match(/\\(([^)]+)\\)\\s*$/);
              if (sizeMatch) {
                size = sizeMatch[1];
                name = fullText.replace(/\\([^)]+\\)\\s*$/, '').trim();
              } else {
                name = fullText.trim();
              }
            }
            
            const text = link.textContent || '';
            
            // Parse pricing
            const priceMatch = text.match(/\\$(\\d+\\.?\\d*)/);
            const casePrice = priceMatch ? parseFloat(priceMatch[1]) : null;
            
            const countMatch = text.match(/(\\d+)ct.*?\\$(\\d+\\.?\\d*)\\s*ea/);
            const unitCount = countMatch ? parseInt(countMatch[1]) : null;
            const unitPrice = countMatch ? parseFloat(countMatch[2]) : null;
            
            // Get brand
            const paragraphs = link.querySelectorAll('p');
            let brand = '';
            paragraphs.forEach(p => {
              const t = p.textContent?.trim();
              if (t && !t.includes('$') && !t.includes('ct') && !t.includes('Rebate')) {
                brand = t;
              }
            });
            
            if (id && name) {
              products.push({ id, name, brand, size, casePrice, unitCount, unitPrice, imageUrl });
            }
          } catch (e) {}
        });
        
        return products;
      }`
    }
  });
  
  let products = [];
  if (extractResult.result) {
    products = extractResult.result;
  }
  
  console.log(`  Extracted ${products.length} products from ${category.name}`);
  return products.map(p => ({ ...p, category: category.name.toLowerCase().replace(' ', '_') }));
}

async function main() {
  console.log('VendHub Scraper - Using Clawdbot Browser Control');
  console.log('Control URL:', CONTROL_URL);
  
  // Check browser status
  const status = await browserRequest('status');
  console.log('Browser status:', status);
  
  if (!status.running) {
    console.error('Browser not running! Start it first with: clawdbot browser start --profile clawd');
    process.exit(1);
  }
  
  let allProducts = [];
  
  for (const category of CATEGORIES) {
    try {
      const products = await scrapeCategory(category);
      allProducts = allProducts.concat(products);
      console.log(`Total products so far: ${allProducts.length}`);
    } catch (error) {
      console.error(`Error scraping ${category.name}:`, error.message);
    }
  }
  
  // Filter out non-food items
  const foodProducts = allProducts.filter(p => isFoodItem(p.name));
  console.log(`\nFiltered to ${foodProducts.length} food items (from ${allProducts.length} total)`);
  
  // Remove duplicates
  const uniqueProducts = [...new Map(foodProducts.map(p => [p.id, p])).values()];
  console.log(`Unique products: ${uniqueProducts.length}`);
  
  // Write output
  const outputPath = path.join(__dirname, 'dashboard', 'products.js');
  const output = `// VendHub Product Catalog for Kande VendTech
// Generated: ${new Date().toISOString()}
// Total Products: ${uniqueProducts.length}

const PRODUCTS = ${JSON.stringify(uniqueProducts, null, 2)};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRODUCTS };
}
`;
  
  fs.writeFileSync(outputPath, output);
  console.log(`\nWrote ${uniqueProducts.length} products to ${outputPath}`);
}

main().catch(console.error);
