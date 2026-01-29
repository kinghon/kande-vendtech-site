// Browser-based scraper for VendHub products
// Run this in the browser console on each category page

async function scrapeCurrentPage() {
  const products = [];
  
  // Scroll to load all products
  async function scrollToBottom() {
    return new Promise((resolve) => {
      let lastHeight = document.body.scrollHeight;
      const interval = setInterval(() => {
        window.scrollTo(0, document.body.scrollHeight);
        const newHeight = document.body.scrollHeight;
        if (newHeight === lastHeight) {
          clearInterval(interval);
          resolve();
        }
        lastHeight = newHeight;
      }, 1000);
      
      // Max 30 seconds of scrolling
      setTimeout(() => {
        clearInterval(interval);
        resolve();
      }, 30000);
    });
  }
  
  console.log('Scrolling to load all products...');
  await scrollToBottom();
  console.log('Scroll complete. Extracting products...');
  
  const links = document.querySelectorAll('a[href*="/market/products/"]');
  
  links.forEach(link => {
    try {
      const href = link.href;
      const id = href.match(/products\/([a-f0-9-]+)/)?.[1];
      if (!id) return;
      
      const img = link.querySelector('img')?.src || '';
      const text = link.textContent || '';
      
      // Parse the product info
      const priceMatch = text.match(/\$(\d+\.?\d*)/);
      const unitMatch = text.match(/(\d+)ct/);
      const unitPriceMatch = text.match(/\$(\d+\.?\d*)\s*ea/);
      
      // Extract name and size from heading pattern: "Product Name(size)"
      const nameMatch = text.match(/([A-Za-z][^$]+?)\(([^)]+)\)/);
      
      // Extract brand (usually last word before price)
      const brandMatch = text.match(/\)([A-Za-z0-9]+)$/);
      
      if (nameMatch) {
        const product = {
          id,
          name: nameMatch[1].trim(),
          brand: brandMatch?.[1] || 'Unknown',
          size: nameMatch[2],
          casePrice: parseFloat(priceMatch?.[1]) || 0,
          unitCount: parseInt(unitMatch?.[1]) || 1,
          unitPrice: parseFloat(unitPriceMatch?.[1]) || 0,
          image: img.split('&w=')[0] + '&w=640&q=75',
          rebate: text.includes('Rebate') ? text.match(/(\d+%\s*Rebate[^$]*)/)?.[1]?.trim() : null
        };
        
        // Only add if we have valid price data
        if (product.unitPrice > 0) {
          products.push(product);
        }
      }
    } catch (e) {
      console.error('Error parsing product:', e);
    }
  });
  
  // Deduplicate
  const unique = [...new Map(products.map(p => [p.id, p])).values()];
  console.log(`Found ${unique.length} unique products`);
  return unique;
}

// Usage: Copy result from console
scrapeCurrentPage().then(products => {
  console.log(JSON.stringify(products, null, 2));
  // Copy to clipboard
  copy(JSON.stringify(products));
  console.log('Products copied to clipboard!');
});
