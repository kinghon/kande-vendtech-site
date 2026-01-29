#!/usr/bin/env node
/**
 * Full VendHub Product Scraper
 * Connects to existing browser and scrapes all food/drink categories
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
  console.log(`URL: ${url}`);
  
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  
  // Wait for products to load
  try {
    await page.waitForSelector('a[href*="/market/products/"]', { timeout: 15000 });
  } catch (e) {
    console.log('No products found, skipping...');
    return [];
  }
  
  // Click Load More until all products loaded
  let clickCount = 0;
  let lastCount = 0;
  let stableCount = 0;
  
  while (clickCount < 100) {
    const productCount = await page.evaluate(() => 
      document.querySelectorAll('a[href*="/market/products/"]').length
    );
    
    if (clickCount % 10 === 0 || productCount !== lastCount) {
      console.log(`  Products: ${productCount}`);
    }
    
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
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    
    if (!clicked) break;
    
    clickCount++;
    await new Promise(r => setTimeout(r, 1500));
  }
  
  // Extract products
  const products = await page.evaluate((categoryName) => {
    const items = [];
    const links = document.querySelectorAll('a[href*="/market/products/"]');
    
    links.forEach(link => {
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
        
        // Parse: $37.33 15ct · $2.49 ea
        const fullMatch = text.match(/\$(\d+\.?\d*)\s+(\d+)ct.*?\$(\d+\.?\d*)\s*ea/);
        const casePrice = fullMatch ? parseFloat(fullMatch[1]) : null;
        const unitCount = fullMatch ? parseInt(fullMatch[2]) : null;
        const unitPrice = fullMatch ? parseFloat(fullMatch[3]) : null;
        
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
            category: categoryName.toLowerCase().replace(/ /g, '_')
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
  console.log('VendHub Full Scraper');
  console.log('====================');
  
  // Connect to existing browser
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:18800'
  });
  
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('vendhubhq.com'));
  
  if (!page) {
    page = await browser.newPage();
  }
  
  let allProducts = [];
  
  for (const category of CATEGORIES) {
    try {
      const products = await scrapeCategory(page, category);
      allProducts = allProducts.concat(products);
      console.log(`Total: ${allProducts.length}`);
    } catch (error) {
      console.error(`Error scraping ${category.name}:`, error.message);
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
