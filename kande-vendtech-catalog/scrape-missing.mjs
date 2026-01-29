#!/usr/bin/env node
/**
 * Scrape missing categories: COLD BEVERAGE, FROZEN FOODS, SPECIALTY BETTER4YOU
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CATEGORIES = [
  { name: 'COLD BEVERAGE', slug: 'COLD%20BEVERAGE' },
  { name: 'FROZEN FOODS', slug: 'FROZEN%20FOODS' },
  { name: 'REFRIGERATED', slug: 'REFRIGERATED' },
  { name: 'SPECIALTY BETTER4YOU', slug: 'SPECIALTY%20BETTER4YOU' }
];

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
  
  // Click Load More until done
  let clickCount = 0;
  let lastCount = 0;
  let stableCount = 0;
  
  while (clickCount < 100) {
    const productCount = await page.evaluate(() => 
      document.querySelectorAll('a[href*="/market/products/"]').length
    );
    
    console.log(`  Products: ${productCount}`);
    
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
  
  // Extract products
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
  
  // Save to supplemental file
  const outputPath = path.join(__dirname, 'dashboard', 'products-supplement.json');
  fs.writeFileSync(outputPath, JSON.stringify(allProducts, null, 2));
  console.log(`\nWrote ${allProducts.length} products to ${outputPath}`);
  
  browser.disconnect();
}

main().catch(console.error);
