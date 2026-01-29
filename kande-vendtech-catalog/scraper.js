// VendHub Product Scraper Script
// This script will be executed in the browser context

async function scrapeCategory(categoryUrl) {
  const products = [];
  
  // Function to extract products from current page
  function extractProducts() {
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
        const name = img ? img.alt : '';
        
        // Get price info - look for the price pattern
        const priceEl = link.querySelector('div');
        const text = link.textContent || '';
        
        // Parse price: $XX.XX
        const priceMatch = text.match(/\$(\d+\.?\d*)/);
        const casePrice = priceMatch ? parseFloat(priceMatch[1]) : null;
        
        // Parse count info: XXct · $X.XX ea · CS/BX
        const countMatch = text.match(/(\d+)ct\s*(?:\([^)]+\))?\s*·\s*\$(\d+\.?\d*)\s*ea/);
        const unitCount = countMatch ? parseInt(countMatch[1]) : null;
        const unitPrice = countMatch ? parseFloat(countMatch[2]) : null;
        
        // Get name with size - look for heading
        const heading = link.querySelector('h3');
        let productName = name;
        let size = '';
        
        if (heading) {
          const fullText = heading.textContent || '';
          const sizeMatch = fullText.match(/\(([^)]+)\)\s*$/);
          if (sizeMatch) {
            size = sizeMatch[1];
            productName = fullText.replace(/\([^)]+\)\s*$/, '').trim();
          } else {
            productName = fullText.trim();
          }
        }
        
        // Get brand - it's in a paragraph after the heading
        const brand = link.querySelector('p')?.textContent?.trim() || '';
        
        if (id && productName) {
          items.push({
            id,
            name: productName,
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
  }
  
  // Click Load More until no more products
  async function loadAllProducts() {
    let lastCount = 0;
    let attempts = 0;
    const maxAttempts = 100; // Safety limit
    
    while (attempts < maxAttempts) {
      const loadMoreBtn = document.querySelector('button:has-text("Load More")') || 
                          Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Load More'));
      
      if (!loadMoreBtn) {
        console.log('No Load More button found');
        break;
      }
      
      const currentProducts = document.querySelectorAll('a[href*="/market/products/"]');
      if (currentProducts.length === lastCount && attempts > 0) {
        console.log('No new products loaded');
        break;
      }
      
      lastCount = currentProducts.length;
      console.log(`Loaded ${lastCount} products so far...`);
      
      loadMoreBtn.click();
      await new Promise(r => setTimeout(r, 1500)); // Wait for load
      attempts++;
    }
    
    return extractProducts();
  }
  
  return await loadAllProducts();
}

// Export for use
window.scrapeCategory = scrapeCategory;
