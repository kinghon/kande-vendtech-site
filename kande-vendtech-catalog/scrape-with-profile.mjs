#!/usr/bin/env node
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

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
  // Allow peanut butter cups, solo cups that are actually food, etc.
  if (lowerName.includes('peanut butter cup') || lowerName.includes('reese')) {
    return true;
  }
  return !NON_FOOD_KEYWORDS.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(lowerName);
  });
}

async function scrapeCategory(page, category) {
  const categoryUrl = `https://www.vendhubhq.com/market/categories/${encodeURIComponent(category)}`;
  console.log(`\nScraping category: ${category}`);
  console.log(`URL: ${categoryUrl}`);
  
  try {
    await page.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.log(`Initial load timeout, continuing...`);
  }
  
  // Check if we're redirected to sign-in
  const currentUrl = page.url();
  if (currentUrl.includes('sign-in')) {
    console.error('ERROR: Not logged in. Please log in to VendHub first.');
    process.exit(1);
  }
  
  // Wait for product grid to load
  try {
    await page.waitForSelector('a[href*="/market/products/"]', { timeout: 30000 });
  } catch (e) {
    console.log(`No products found for ${category}`);
    return [];
  }
  
  // Load all products by scrolling and clicking Load More
  let lastCount = 0;
  let stableCount = 0;
  
  for (let i = 0; i < 100; i++) {
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 500));
    
    // Try to click Load More button
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        if (btn.textContent?.includes('Load More')) {
          btn.click();
          return true;
        }
      }
      return false;
    });
    
    if (clicked) {
      await new Promise(r => setTimeout(r, 2000));
    }
    
    const count = await page.$$eval('a[href*="/market/products/"]', links => links.length);
    console.log(`  Products loaded: ${count}`);
    
    if (count === lastCount) {
      stableCount++;
      if (stableCount >= 3 && !clicked) {
        console.log('  No more products to load');
        break;
      }
    } else {
      stableCount = 0;
    }
    lastCount = count;
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
  console.log('Starting VendHub scraper with Chrome profile...');
  
  const userDataDir = path.join(os.homedir(), 'Library/Application Support/Google/Chrome');
  
  // Close Chrome first if running
  console.log('Note: Chrome must be closed for this to work.');
  console.log('Profile path:', userDataDir);
  
  const browser = await puppeteer.launch({ 
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    userDataDir: userDataDir,
    defaultViewport: { width: 1400, height: 900 },
    args: [
      '--profile-directory=Default',
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });
  
  const page = await browser.newPage();
  
  // Test if we're logged in
  console.log('Testing login status...');
  await page.goto('https://www.vendhubhq.com/market/categories/SNACKS', { 
    waitUntil: 'networkidle2', 
    timeout: 60000 
  });
  
  if (page.url().includes('sign-in')) {
    console.error('Not logged in. Please log in to VendHub manually first.');
    await browser.close();
    process.exit(1);
  }
  
  let allProducts = [];
  
  for (const category of CATEGORIES) {
    try {
      const products = await scrapeCategory(page, category);
      allProducts = allProducts.concat(products);
      console.log(`Total so far: ${allProducts.length}`);
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
