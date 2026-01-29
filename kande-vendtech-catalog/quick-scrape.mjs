#!/usr/bin/env node
/**
 * Quick VendHub scraper using direct browser control
 */

const CONTROL_URL = 'http://127.0.0.1:18791';

async function browserRequest(action, params = {}) {
  const body = { action, profile: 'clawd', ...params };
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

async function loadAllProducts(targetId) {
  console.log('Loading all products by clicking Load More...');
  
  for (let i = 0; i < 50; i++) {
    // Get snapshot to find Load More button
    const snap = await browserRequest('snapshot', { 
      targetId, 
      compact: true,
      maxChars: 50000 
    });
    
    // Find Load More ref
    const snapText = typeof snap === 'string' ? snap : JSON.stringify(snap);
    const loadMoreMatch = snapText.match(/"Load More"[^}]*\[ref=([^\]]+)\]/);
    
    if (!loadMoreMatch) {
      console.log(`  No Load More button found after ${i} clicks`);
      break;
    }
    
    const ref = loadMoreMatch[1];
    console.log(`  Click ${i + 1}: ref=${ref}`);
    
    await browserRequest('act', {
      targetId,
      request: { kind: 'click', ref }
    });
    
    await sleep(1500);
  }
}

async function extractProducts(targetId) {
  console.log('Extracting product data...');
  
  const result = await browserRequest('act', {
    targetId,
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
            let name = '', size = '';
            
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
            const priceMatch = text.match(/\\$(\\d+\\.?\\d*)/);
            const casePrice = priceMatch ? parseFloat(priceMatch[1]) : null;
            
            const countMatch = text.match(/(\\d+)ct.*?\\$(\\d+\\.?\\d*)\\s*ea/);
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
              products.push({ id, name, brand, size, casePrice, unitCount, unitPrice, imageUrl });
            }
          } catch (e) {}
        });
        
        return products;
      }`
    }
  });
  
  return result.result || [];
}

async function main() {
  // Get current tabs
  const tabs = await browserRequest('tabs');
  console.log('Current tabs:', tabs.tabs?.map(t => t.title));
  
  const vendHubTab = tabs.tabs?.find(t => t.url?.includes('vendhubhq.com'));
  if (!vendHubTab) {
    console.error('No VendHub tab found!');
    process.exit(1);
  }
  
  const targetId = vendHubTab.targetId;
  console.log('Using tab:', vendHubTab.title);
  
  // Load all products
  await loadAllProducts(targetId);
  
  // Extract products
  const products = await extractProducts(targetId);
  console.log(`Extracted ${products.length} products`);
  
  console.log(JSON.stringify(products.slice(0, 3), null, 2));
}

main().catch(console.error);
