#!/usr/bin/env node
/**
 * Final VendHub Product Scraper with Fixed Parsing
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CATEGORIES = [
  { name: 'SNACKS', slug: 'SNACKS' },
  { name: 'CANDY', slug: 'CANDY' },
  { name: 'COLD BEVERAGE', slug: 'COLD%20BEVERAGE' },
  { name: 'FROZEN FOODS', slug: 'FROZEN%20FOODS' },
  { name: 'HOT FOODS', slug: 'HOT%20FOODS' },
  { name: 'REFRIGERATED', slug: 'REFRIGERATED' },
  { name: 'SPECIALTY BETTER4YOU', slug: 'SPECIALTY%20BETTER4YOU' }
];

const NON_FOOD_KEYWORDS = [
  'cup', 'cups', 'lid', 'lids', 'straw', 'straws', 'napkin', 'napkins',
  'utensil', 'fork', 'spoon', 'knife', 'knives', 'plate', 'plates',
  'bowl', 'bowls', 'container', 'containers', 'foil', 'wrap', 'tray',
  'sleeve', 'holder', 'dispenser', 'stirrer', 'toothpick'
];

function isFoodItem(name) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('peanut butter cup') || lowerName.includes('reese')) {
    return true;
  }
  return !NON_FOOD_KEYWORDS.some(keyword => {
    const regex = new RegExp(`\\b${keyword}s?\\b`, 'i');
    return regex.test(lowerName);
  });
}

async function scrapeCategory(page, category) {
  const url = `https://www.vendhubhq.com/market/categories/${category.slug}`;
  console.log(`\n=== Scraping ${category.name} ===`);
  
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  
  try {
    await page.waitForSelector('a[href*="/market/products/"]', { timeout: 15000 });
  } catch (e) {
    console.log('No products found');
    return [];
  }
  
  let clickCount = 0;
  let lastCount = 0;
  let stableCount = 0;
  
  while (clickCount < 100) {
    const productCount = await page.evaluate(() => 
      document.querySelectorAll('a[href*="/market/products/"]').length
    );
    
    if (clickCount % 5 === 0) console.log(`  Products: ${productCount}`);
    
    if (productCount === lastCount) {
      stableCount++;
      if (stableCount >= 3) break;
    } else {
      stableCount = 0;
    }
    lastCount = productCount;
    
    const clicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent?.includes('Load More')
      );
      if (btn) { btn.click(); return true; }
      return false;
    });
    
    if (!clicked) break;
    clickCount++;
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // Extract products with fixed parsing
  const products = await page.evaluate((catName) => {
    const items = [];
    document.querySelectorAll('a[href*="/market/products/"]').forEach(link => {
      try {
        const href = link.getAttribute('href');
        const idMatch = href.match(/\/market\/products\/([a-f0-9-]+)/);
        if (!idMatch) return;
        
        const id = idMatch[1];
        const img = link.querySelector('img');
        const imageUrl = img ? img.src : '';
        
        const heading = link.querySelector('h3');
        let name = '', size = '';
        
        if (heading) {
          const fullText = heading.textContent || '';
          const sizeMatch = fullText.match(/\(([^)]+)\)\s*$/);
          if (sizeMatch) {
            size = sizeMatch[1];
            name = fullText.replace(/\([^)]+\)\s*$/, '').trim();
          } else {
            name = fullText.trim();
          }
        }
        
        const text = link.textContent || '';
        
        // Fixed regex: $XX.XX followed by XXct (no space required)
        // Pattern: $39.2012ct · $3.27 ea
        const priceMatch = text.match(/\$(\d+\.\d{2})(\d+)ct.*?\$(\d+\.\d+)\s*ea/);
        let casePrice = null, unitCount = null, unitPrice = null;
        
        if (priceMatch) {
          casePrice = parseFloat(priceMatch[1]);
          unitCount = parseInt(priceMatch[2]);
          unitPrice = parseFloat(priceMatch[3]);
        } else {
          // Try alternate format: $XX.XX XXct
          const altMatch = text.match(/\$(\d+\.?\d*)\s+(\d+)ct.*?\$(\d+\.?\d*)\s*ea/);
          if (altMatch) {
            casePrice = parseFloat(altMatch[1]);
            unitCount = parseInt(altMatch[2]);
            unitPrice = parseFloat(altMatch[3]);
          }
        }
        
        const paragraphs = link.querySelectorAll('p');
        let brand = '';
        paragraphs.forEach(p => {
          const t = p.textContent?.trim();
          if (t && !t.includes('$') && !t.includes('ct') && !t.includes('Rebate')) {
            brand = t;
          }
        });
        
        if (id && name) {
          items.push({ 
            id, name, brand, size, casePrice, unitCount, unitPrice, imageUrl,
            category: catName.toLowerCase().replace(/ /g, '_')
          });
        }
      } catch (e) {}
    });
    return items;
  }, category.name);
  
  console.log(`  Extracted ${products.length} products`);
  return products;
}

async function main() {
  console.log('VendHub Final Scraper');
  console.log('=====================');
  
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:18800' });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('vendhubhq.com')) || await browser.newPage();
  
  let allProducts = [];
  
  for (const category of CATEGORIES) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const products = await scrapeCategory(page, category);
        if (products.length > 0) {
          allProducts = allProducts.concat(products);
          console.log(`Total: ${allProducts.length}`);
          break;
        }
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error.message);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }
  
  // Filter and dedupe
  const foodProducts = allProducts.filter(p => isFoodItem(p.name));
  console.log(`\nFiltered to ${foodProducts.length} food items`);
  
  const uniqueProducts = [...new Map(foodProducts.map(p => [p.id, p])).values()];
  console.log(`Unique: ${uniqueProducts.length}`);
  
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
  
  browser.disconnect();
}

main().catch(console.error);
