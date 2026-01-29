const fs = require('fs');
const https = require('https');

// Food & drink categories to scrape
const CATEGORIES = [
  'SNACKS',
  'CANDY', 
  'COLD%20BEVERAGE',
  'FROZEN%20FOODS',
  'HOT%20DRINK',
  'HOT%20FOODS',
  'REFRIGERATED',
  'SPECIALTY%20BETTER4YOU',
  'CONCESSION',
  'GENERAL%20GROCERY',
  'PLENTIFUL%20PANTRY',
  'THEATER',
  'MEAT',
  'FRESH%20PASTRY',
  'CHEESE',
  'SALAD%20PRODUCTS',
  'SEAFOOD%20%26%20POULTRY',
  'PASTA%20PRODUCTS',
  'SPICES'
];

// Words that indicate non-food items to filter out
const EXCLUDE_KEYWORDS = [
  'fork', 'spoon', 'knife', 'napkin', 'straw', 'cup', 'lid', 'plate',
  'foil', 'wrap', 'container', 'bag', 'utensil', 'tissue', 'towel',
  'sanitizer', 'cleaner', 'soap', 'glove', 'apron', 'hairnet'
];

const allProducts = [];
let totalScraped = 0;

async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractProductsFromHTML(html, category) {
  const products = [];
  
  // Match product links with data
  const productRegex = /\/market\/products\/([a-f0-9-]+)[^"]*"[^>]*>[\s\S]*?img[^>]*"([^"]+)"[\s\S]*?\$([0-9.]+)[\s\S]*?(\d+)ct[^·]*·\s*\$([0-9.]+)\s*ea[\s\S]*?heading[^>]*>([^<]+)\(([^)]+)\)[\s\S]*?paragraph[^>]*>\s*([^<]+)/gi;
  
  // Alternative: look for JSON data in the page
  const jsonMatch = html.match(/__NEXT_DATA__[^>]*>([^<]+)</);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      // Extract products from Next.js data
      const pageProps = data?.props?.pageProps;
      if (pageProps?.products) {
        return pageProps.products.map(p => ({
          id: p.id,
          name: p.name,
          brand: p.brand || p.manufacturer,
          size: p.size || p.unit_size,
          casePrice: parseFloat(p.case_price || p.price),
          unitCount: parseInt(p.units_per_case || p.unit_count),
          unitPrice: parseFloat(p.unit_price),
          image: p.thumbnail || p.image_url,
          category: category.replace(/%20/g, ' ').toLowerCase(),
          rebate: p.rebate_percentage ? `${p.rebate_percentage}% Rebate` : null
        }));
      }
    } catch (e) {
      console.log('JSON parse failed, using regex fallback');
    }
  }
  
  return products;
}

function isFood(product) {
  const name = (product.name || '').toLowerCase();
  const brand = (product.brand || '').toLowerCase();
  
  for (const keyword of EXCLUDE_KEYWORDS) {
    if (name.includes(keyword) || brand.includes(keyword)) {
      return false;
    }
  }
  return true;
}

async function scrapeCategory(category) {
  console.log(`Scraping ${category}...`);
  const url = `https://www.vendhubhq.com/market/categories/${category}`;
  
  try {
    const html = await fetchPage(url);
    const products = extractProductsFromHTML(html, category);
    
    // Filter to food only
    const foodProducts = products.filter(isFood);
    console.log(`  Found ${foodProducts.length} food products`);
    
    return foodProducts;
  } catch (err) {
    console.error(`  Error scraping ${category}:`, err.message);
    return [];
  }
}

async function main() {
  console.log('Starting VendHub product scrape...');
  console.log(`Scraping ${CATEGORIES.length} categories\n`);
  
  for (const category of CATEGORIES) {
    const products = await scrapeCategory(category);
    allProducts.push(...products);
    totalScraped += products.length;
    
    // Small delay to be nice to the server
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Deduplicate by ID
  const uniqueProducts = [...new Map(allProducts.map(p => [p.id, p])).values()];
  
  console.log(`\n========================================`);
  console.log(`Total products scraped: ${uniqueProducts.length}`);
  console.log(`========================================\n`);
  
  // Write to products.js
  const output = `// Kande VendTech Product Catalog
// Scraped from VendHub - ${new Date().toISOString()}
// Total products: ${uniqueProducts.length}

const PRODUCTS = ${JSON.stringify(uniqueProducts, null, 2)};
`;

  fs.writeFileSync('./dashboard/products.js', output);
  console.log('Saved to dashboard/products.js');
}

main().catch(console.error);
