#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  'cup ', 'cups ', ' cups', ' lid', 'lids', 'straw', 'napkin',
  'utensil', 'fork', 'spoon', 'knife', 'knives', 'spork',
  'plate', 'bowl', 'container', ' foil', 'aluminum foil',
  'plastic wrap', 'cling wrap', ' tray', 'sleeve', 'holder',
  'dispenser', 'stirrer', 'toothpick', 'paper towel', 'tissue'
];

function isFoodItem(product) {
  const lowerName = (product.name + ' ' + product.brand).toLowerCase();
  
  // Check for non-food keywords
  for (const keyword of NON_FOOD_KEYWORDS) {
    if (lowerName.includes(keyword.toLowerCase())) {
      // Exception for food items that might match
      if (lowerName.includes('peanut butter cup') || 
          lowerName.includes('reese') ||
          lowerName.includes('candy cup') ||
          lowerName.includes('cup cake') ||
          lowerName.includes('cupcake') ||
          lowerName.includes('cup noodle') ||
          lowerName.includes('ramen cup') ||
          lowerName.includes('fruit cup')) {
        return true;
      }
      console.log(`  Filtered out: ${product.name} (matched: ${keyword})`);
      return false;
    }
  }
  return true;
}

async function scrapeCategory(page, categoryName) {
  const categoryUrl = `https://www.vendhubhq.com/market/categories/${encodeURIComponent(categoryName)}`;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Scraping: ${categoryName}`);
  console.log(`URL: ${categoryUrl}`);
  
  await page.goto(categoryUrl, { waitUntil: 'networkidle', timeout: 60000 });
  
  // Wait for products to load
  await page.waitForSelector('a[href*="/market/products/"]', { timeout: 30000 });
  
  // Count initial products
  let productCount = await page.locator('a[href*="/market/products/"]').count();
  console.log(`Initial products: ${productCount}`);
  
  // Keep clicking Load More until no more
  let attempts = 0;
  const maxAttempts = 60;
  let lastCount = 0;
  let noChangeCount = 0;
  
  while (attempts < maxAttempts) {
    const loadMoreButton = page.locator('button', { hasText: 'Load More' });
    const buttonVisible = await loadMoreButton.isVisible().catch(() => false);
    
    if (!buttonVisible) {
      console.log('No Load More button visible');
      break;
    }
    
    try {
      await loadMoreButton.click({ timeout: 5000 });
      await page.waitForTimeout(1000);
      
      productCount = await page.locator('a[href*="/market/products/"]').count();
      console.log(`  Loaded: ${productCount} products (attempt ${attempts + 1})`);
      
      if (productCount === lastCount) {
        noChangeCount++;
        if (noChangeCount >= 3) {
          console.log('No new products loaded after 3 attempts');
          break;
        }
      } else {
        noChangeCount = 0;
      }
      lastCount = productCount;
      
    } catch (e) {
      console.log(`Click failed: ${e.message}`);
      break;
    }
    
    attempts++;
  }
  
  console.log(`Final count: ${productCount} products`);
  
  // Extract all products
  const products = await page.evaluate(() => {
    const items = [];
    const seen = new Set();
    
    document.querySelectorAll('a[href*="/market/products/"]').forEach(link => {
      try {
        const url = link.getAttribute('href');
        const idMatch = url.match(/\/market\/products\/([a-f0-9-]+)/);
        if (!idMatch) return;
        
        const id = idMatch[1];
        if (seen.has(id)) return;
        seen.add(id);
        
        // Get image
        const img = link.querySelector('img[alt]');
        const imageUrl = img ? img.src : '';
        
        // Get heading for name
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
        } else if (img) {
          name = img.alt || '';
        }
        
        // Get text content for parsing
        const text = link.textContent || '';
        
        // Parse case price: first $XX.XX pattern
        const priceMatch = text.match(/\$(\d+\.?\d*)/);
        const casePrice = priceMatch ? parseFloat(priceMatch[1]) : null;
        
        // Parse count info: XXct · $X.XX ea or XXct (X/X) · $X.XX ea
        const countMatch = text.match(/(\d+)ct\s*(?:\([^)]+\))?\s*·\s*\$(\d+\.?\d*)\s*ea/);
        const unitCount = countMatch ? parseInt(countMatch[1]) : null;
        const unitPrice = countMatch ? parseFloat(countMatch[2]) : null;
        
        // Get brand - paragraph element
        let brand = '';
        const paragraphs = link.querySelectorAll('p');
        paragraphs.forEach(p => {
          const t = p.textContent?.trim();
          if (t && !t.includes('$') && !t.includes('ct ·') && t.length < 50 && t.length > 1) {
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
      } catch(e) {
        console.error('Parse error:', e);
      }
    });
    
    return items;
  });
  
  console.log(`Extracted ${products.length} unique products`);
  return products.map(p => ({ ...p, category: categoryName }));
}

async function main() {
  console.log('VendHub Product Scraper');
  console.log('========================');
  console.log(`Started: ${new Date().toISOString()}\n`);
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  
  const page = await context.newPage();
  
  let allProducts = [];
  const categoryResults = {};
  
  for (const cat of CATEGORIES) {
    try {
      const products = await scrapeCategory(page, cat.name);
      categoryResults[cat.name] = {
        expected: cat.expected,
        scraped: products.length
      };
      allProducts = allProducts.concat(products);
    } catch (error) {
      console.error(`\nERROR scraping ${cat.name}:`, error.message);
      categoryResults[cat.name] = { expected: cat.expected, scraped: 0, error: error.message };
    }
  }
  
  await browser.close();
  
  // Summary before filtering
  console.log('\n' + '='.repeat(60));
  console.log('SCRAPING SUMMARY');
  console.log('='.repeat(60));
  for (const [name, result] of Object.entries(categoryResults)) {
    const status = result.error ? '❌' : (result.scraped >= result.expected * 0.9 ? '✅' : '⚠️');
    console.log(`${status} ${name}: ${result.scraped}/${result.expected}`);
  }
  console.log(`\nTotal scraped: ${allProducts.length}`);
  
  // Filter out non-food items
  console.log('\nFiltering non-food items...');
  const foodProducts = allProducts.filter(isFoodItem);
  console.log(`After filtering: ${foodProducts.length} food products`);
  
  // Remove duplicates by ID
  const uniqueProducts = [...new Map(foodProducts.map(p => [p.id, p])).values()];
  console.log(`After dedup: ${uniqueProducts.length} unique products`);
  
  // Ensure dashboard directory exists
  const dashboardDir = path.join(__dirname, 'dashboard');
  if (!fs.existsSync(dashboardDir)) {
    fs.mkdirSync(dashboardDir, { recursive: true });
  }
  
  // Write to JavaScript file
  const outputPath = path.join(dashboardDir, 'products.js');
  const output = `// VendHub Product Catalog for Kande VendTech
// Generated: ${new Date().toISOString()}
// Total Products: ${uniqueProducts.length}
// Categories: ${CATEGORIES.map(c => c.name).join(', ')}

const PRODUCTS = ${JSON.stringify(uniqueProducts, null, 2)};

// Category counts
const CATEGORY_COUNTS = ${JSON.stringify(
  Object.fromEntries(
    CATEGORIES.map(c => [c.name, uniqueProducts.filter(p => p.category === c.name).length])
  ), null, 2)};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRODUCTS, CATEGORY_COUNTS };
}
`;
  
  fs.writeFileSync(outputPath, output);
  console.log(`\n✅ Wrote ${uniqueProducts.length} products to ${outputPath}`);
  
  // Also write a JSON version
  const jsonPath = path.join(dashboardDir, 'products.json');
  fs.writeFileSync(jsonPath, JSON.stringify(uniqueProducts, null, 2));
  console.log(`✅ Wrote JSON to ${jsonPath}`);
  
  console.log(`\nCompleted: ${new Date().toISOString()}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
