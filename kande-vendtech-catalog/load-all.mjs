#!/usr/bin/env node
/**
 * Load all products by connecting to the existing browser
 */
import puppeteer from 'puppeteer';

async function main() {
  console.log('Connecting to existing browser...');
  
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:18800'
  });
  
  const pages = await browser.pages();
  console.log(`Found ${pages.length} pages`);
  
  // Find VendHub page
  let vendHubPage = null;
  for (const page of pages) {
    const url = page.url();
    console.log('Page:', url);
    if (url.includes('vendhubhq.com/market/categories')) {
      vendHubPage = page;
      break;
    }
  }
  
  if (!vendHubPage) {
    console.error('No VendHub category page found');
    process.exit(1);
  }
  
  console.log('Found VendHub page:', vendHubPage.url());
  
  // Click Load More until done
  let clickCount = 0;
  let lastCount = 0;
  let stableCount = 0;
  
  while (clickCount < 100) {
    const productCount = await vendHubPage.evaluate(() => 
      document.querySelectorAll('a[href*="/market/products/"]').length
    );
    
    console.log(`Products loaded: ${productCount}`);
    
    if (productCount === lastCount) {
      stableCount++;
      if (stableCount >= 3) {
        console.log('No new products, done!');
        break;
      }
    } else {
      stableCount = 0;
    }
    lastCount = productCount;
    
    // Try to click Load More
    const clicked = await vendHubPage.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent?.includes('Load More')
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    
    if (!clicked) {
      console.log('No Load More button found');
      break;
    }
    
    clickCount++;
    await new Promise(r => setTimeout(r, 1500));
  }
  
  console.log(`Total clicks: ${clickCount}`);
  
  // Extract products
  const products = await vendHubPage.evaluate(() => {
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
        const priceMatch = text.match(/\$(\d+\.?\d*)/);
        const casePrice = priceMatch ? parseFloat(priceMatch[1]) : null;
        
        const countMatch = text.match(/(\d+)ct.*?\$(\d+\.?\d*)\s*ea/);
        const unitCount = countMatch ? parseInt(countMatch[1]) : null;
        const unitPrice = countMatch ? parseFloat(countMatch[2]) : null;
        
        const paragraphs = link.querySelectorAll('p');
        let brand = '';
        paragraphs.forEach(p => {
          const t = p.textContent?.trim();
          if (t && !t.includes('$') && !t.includes('ct') && !t.includes('Rebate')) {
            brand = t;
          }
        });
        
        if (id && name) {
          items.push({ id, name, brand, size, casePrice, unitCount, unitPrice, imageUrl });
        }
      } catch (e) {}
    });
    
    return items;
  });
  
  console.log(`Extracted ${products.length} products`);
  console.log(JSON.stringify(products, null, 2));
  
  // Don't close browser - just disconnect
  browser.disconnect();
}

main().catch(console.error);
