#!/usr/bin/env node
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CATEGORIES = [
  'SNACKS',
  'CANDY', 
  'COLD BEVERAGE',
  'FROZEN FOODS',
  'HOT FOODS',
  'REFRIGERATED',
  'SPECIALTY BETTER4YOU'
];

// Non-food keywords to filter out
const NON_FOOD_KEYWORDS = [
  'cup', 'cups', 'lid', 'lids', 'straw', 'straws', 'napkin', 'napkins',
  'utensil', 'utensils', 'fork', 'forks', 'spoon', 'spoons', 'knife', 'knives',
  'plate', 'plates', 'bowl', 'bowls', 'container', 'containers', 'foil',
  'wrap', 'bag', 'bags', 'tray', 'trays', 'sleeve', 'sleeves', 'holder',
  'dispenser', 'dispensers', 'stirrer', 'stirrers', 'toothpick', 'toothpicks'
];

function isFoodItem(name) {
  const lowerName = name.toLowerCase();
  return !NON_FOOD_KEYWORDS.some(keyword => {
    // Only filter if it's the main product, not a descriptor
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(lowerName) && !lowerName.includes('peanut butter cup');
  });
}

async function scrapeCategory(page, category) {
  const categoryUrl = `https://www.vendhubhq.com/market/categories/${encodeURIComponent(category)}`;
  console.log(`\nScraping category: ${category}`);
  console.log(`URL: ${categoryUrl}`);
  
  await page.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('a[href*="/market/products/"]', { timeout: 30000 });
  
  // Load all products by clicking Load More
  let loadMoreAttempts = 0;
  const maxAttempts = 100;
  
  while (loadMoreAttempts < maxAttempts) {
    const loadMoreBtn = await page.$('button:has-text("Load More")');
    if (!loadMoreBtn) {
      // Try alternative selector
      const buttons = await page.$$('button');
      let found = false;
      for (const btn of buttons) {
        const text = await btn.evaluate(el => el.textContent);
        if (text && text.includes('Load More')) {
          await btn.click();
          found = true;
          break;
        }
      }
      if (!found) {
        console.log('No more Load More button found');
        break;
      }
    } else {
      await loadMoreBtn.click();
    }
    
    await new Promise(r => setTimeout(r, 1500));
    loadMoreAttempts++;
    
    const count = await page.$$eval('a[href*="/market/products/"]', links => links.length);
    console.log(`  Loaded ${count} products (attempt ${loadMoreAttempts})`);
  }
  
  // Extract all products
  const products = await page.evaluate(() => {
    const items = [];
    const productLinks = document.querySelectorAll('a[href*="/market/products/"]');
    
    productLinks.forEach(link => {
      try {
        const url = link.getAttribute('href');
        const idMatch = url.match(/\/market\/products\/([a-f0-9-]+)/);
        if (!idMatch) return;
        
        const id = idMatch[1];
        
        // Get image
        const img = link.querySelector('img[alt]');
        const imageUrl = img ? img.src : '';
        
        // Get heading for name
        const heading = link.querySelector('h3');
        let name = '';
        let size = '';
        
        if (heading) {
          const fullText = heading.textContent || '';
          const sizeMatch = fullText.match(/\(([^)]+)\)\s*$/);
          if (sizeMatch) {
            size = sizeMatch[1];
            name = fullText.replace(/\([^)]+\)\s*$/, '').trim();
          } else {
            name = fullText.trim();
          }
        } else if (img) {
          name = img.alt || '';
        }
        
        // Get text content for parsing
        const text = link.textContent || '';
        
        // Parse case price: first $XX.XX pattern
        const priceMatch = text.match(/\$(\d+\.?\d*)/);
        const casePrice = priceMatch ? parseFloat(priceMatch[1]) : null;
        
        // Parse count info: XXct · $X.XX ea
        const countMatch = text.match(/(\d+)ct\s*(?:\([^)]+\))?\s*·\s*\$(\d+\.?\d*)\s*ea/);
        const unitCount = countMatch ? parseInt(countMatch[1]) : null;
        const unitPrice = countMatch ? parseFloat(countMatch[2]) : null;
        
        // Get brand - paragraph after heading
        const paragraphs = link.querySelectorAll('p');
        let brand = '';
        paragraphs.forEach(p => {
          const t = p.textContent?.trim();
          if (t && !t.includes('$') && !t.includes('ct')) {
            brand = t;
          }
        });
        
        if (id && name) {
          items.push({
            id,
            name,
            brand,
            size,
            casePrice,
            unitCount,
            unitPrice,
            imageUrl
          });
        }
      } catch (e) {
        console.error('Error parsing product:', e);
      }
    });
    
    return items;
  });
  
  console.log(`  Extracted ${products.length} products from ${category}`);
  return products.map(p => ({ ...p, category }));
}

async function main() {
  console.log('Starting VendHub scraper...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();
  
  let allProducts = [];
  
  for (const category of CATEGORIES) {
    try {
      const products = await scrapeCategory(page, category);
      allProducts = allProducts.concat(products);
    } catch (error) {
      console.error(`Error scraping ${category}:`, error.message);
    }
  }
  
  // Filter out non-food items
  const foodProducts = allProducts.filter(p => isFoodItem(p.name));
  console.log(`\nFiltered to ${foodProducts.length} food items (from ${allProducts.length} total)`);
  
  // Remove duplicates by ID
  const uniqueProducts = [...new Map(foodProducts.map(p => [p.id, p])).values()];
  console.log(`Unique products: ${uniqueProducts.length}`);
  
  // Write to JavaScript file
  const outputPath = path.join(__dirname, 'dashboard', 'products.js');
  const output = `// VendHub Product Catalog for Kande VendTech
// Generated: ${new Date().toISOString()}
// Total Products: ${uniqueProducts.length}

const PRODUCTS = ${JSON.stringify(uniqueProducts, null, 2)};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRODUCTS };
}
`;
  
  fs.writeFileSync(outputPath, output);
  console.log(`\nWrote ${uniqueProducts.length} products to ${outputPath}`);
  
  await browser.close();
}

main().catch(console.error);
