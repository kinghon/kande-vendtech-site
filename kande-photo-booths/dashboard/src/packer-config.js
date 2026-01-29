// Packer List Configuration
// Maps service names to items that need to be packed

const CORPORATE_SERVICES = {
  "Standard Photo Booth": ["Venture", "Sharing Stand", "Ipad", "Backdrop", "Hotspot", "Props", "Power Strip", "Extension Cables"],
  "Glam Booth": ["Venture", "Bulb Softbox + Ring Adapter", "2x Alien Bee Flashes (1 backup)", "Sharing Stand", "Ipad", "Backdrop", "Hotspot", "Props", "Power Strip", "Extension Cables"],
  "Animated GIF Booth": ["Venture + GIFs", "Sharing Stand", "Ipad", "Backdrop", "Hotspot", "Props", "Power Strip", "Extension Cables"],
  "Green Screen Booth": ["Venture + Green Screen", "Green Screen Backdrop", "2x LED Light Wands", "2x Mic Stands", "Light Wand Batteries", "Sharing Stand", "Ipad", "Hotspot", "Power Strip", "Extension Cables"],
  "Boomerang Booth": ["Ipad Booth + DSLR", "2x LED Light Wands", "2x Mic Stands", "Light Wand Batteries", "Sharing Stand", "Ipad", "Backdrop", "Hotspot", "Power Strip", "Extension Cables", "Extra Ipad Pro"],
  "Slow Mo Booth": ["Ipad Booth + DSLR", "2x LED Light Wands", "2x Mic Stands", "Light Wand Batteries", "Sharing Stand", "Ipad", "Backdrop", "Hotspot", "Power Strip", "Extension Cables", "Extra Ipad Pro"],
  "Face Morph Booth": ["Venture", "2x LED Light Wands", "2x Mic Stands", "Light Wand Batteries", "Sitting Bench", "Sharing Stand", "Ipad", "Backdrop", "Hotspot", "Power Strip", "Extension Cables"],
  "NFT Booth": ["Venture", "Sharing Stand", "Ipad", "Backdrop", "Hotspot", "Props", "Power Strip", "Extension Cables"],
  "360 Booth": ["360 Platform + Arm", "Platform Battery + Power Cord", "Ring Light for Arm", "Ring Light Battery", "4 LED Lights + Circle Monopods", "LED Light Batteries", "Iphone", "White Dongle + Cords", "Sharing Stand", "Ipad", "Power Strip", "Extension Cables"],
  "180 Multi-Cam Array": ["Array", "Array PC", "2x Einstein Flashes (1 backup)", "Array Softbox", "Sharing Stand", "Ipad", "Hotspot", "Power Strip", "Extension Cables"],
  "Photo Mosaic": ["PICKUP FOAMBOARD", "Ipad Booth + DSLR", "Speedflash + Bubble diffuser", "AA Batteries - Flash", "2x Mosaic Prints (1 backup)", "2x Printer Stands", "Sticker Paper/Ink", "Mosaic Laptop", "USB Printer Cord", "Sharing Stand", "Ipad", "Black Pillowcase Backdrop (foamboard)", "Backdrop (Photos)", "Foamboard Mounting Arms", "Hotspot", "Power Strip", "Extension Cables", "Gaff Tape", "Extra Ipad Pro"],
  "AI Sketch Bot": ["Sketchbot(s) - Check Quantity + Add 1", "Plain Paper", "Sketchbot Laptop", "Router", "Dongles", "Ethernet Cords", "2x Ipads (for photos)", "Staedler Pens"],
  "Vogue Booth": ["Vogue Booth Enclosure", "2x Sets of LED Lights", "2x LED Controller Boxes", "Custom Vogue Fabric or Black Fabric", "Venture", "Sharing Stand", "Ipad", "Backdrop", "Hotspot", "Power Strip", "Extension Cables"],
  "AI Photo Booth": ["Ipad Booth + DSLR", "Speedflash + Bubble diffuser", "AA Batteries - Flash", "Sharing Stand", "Ipad", "Backdrop", "Hotspot", "Power Strip", "Extension Cables", "Extra Ipad Pro"],
  "Custom Trading Card Booth": ["Ipad Booth + DSLR", "Speedflash + Bubble diffuser", "AA Batteries - Flash", "Trading Card Cases", "Printer", "Paper/Ink", "Trading Card Enclosure", "Glue", "Card Cutter", "2x Cutting Dies", "Ipad (for printing)", "LED Light for inside enclosure", "Card Mid Section Paper", "Hotspot", "2x Power Strips", "2x Extension Cables"],
  "Kande Station": ["Ipad Booth (No DSLR)", "Hotspot", "Extension Cables", "Extra Ipad Pro"],
  "Custom Video Booth": ["Ipad Booth + DSLR", "2x LED Light Wands", "2x Mic Stands", "Light Wand Batteries", "Sharing Stand", "Ipad", "Backdrop", "Hotspot", "Power Strip", "Extension Cables", "Extra Ipad Pro"],
  "Video Testimonial Booth": ["Ipad Booth + DSLR", "2x LED Light Wands", "2x Mic Stands", "Light Wand Batteries", "Sharing Stand", "Ipad", "Rode Mic", "Ulanzi Camera Hotshoe Mount", "Backdrop", "Hotspot", "Power Strip", "Extension Cables", "Extra Ipad Pro"],
  "Roaming Photo Booth": ["Roaming Photo Booth", "Extra Batteries - Roamer", "Hotspot", "Battery Pack - Hotspot", "Extra Ipad Pro"],
  "AI Roaming Photographer": ["R10 Camera", "L Series Lens", "Canon Speedflash", "Bubble Diffuser", "AA Batteries - Flash", "White Dongle", "USB Cord - Iphone to Camera", "Wrist Strap for Iphone", "Iphone", "Camera Batteries", "Battery Pack", "Ipad with Case - Sharing", "Hotspot"],
  "Studio Photographer Setup": ["R6 Camera + Camera Tripod", "Wireless Flash Trigger + Flash receiver", "Hotshoe + Sync Cord (backup)", "2x Alien Bee Flashes (1 backup)", "Large Softbox", "Circle Base Monopod", "Sandbags/Weights", "Iphone or Ipad", "White Dongle + Cord to Camera", "Sharing Stand", "Ipad", "Backdrop", "Hotspot", "Props", "Power Strip", "Extension Cables"],
  "Headshot Studio": ["R6 Camera + Camera Tripod", "Wireless Flash Trigger + Flash receiver", "Hotshoe + Sync Cord (backup)", "2x Alien Bee Flashes (1 backup)", "Large Softbox", "Circle Base Monopod", "Sandbags/Weights", "Iphone or Ipad", "White Dongle + Cord to Camera", "Sharing Stand", "Ipad", "Backdrop", "Hotspot", "Props", "Power Strip", "Extension Cables", "Sitting Bench"]
};

const CORPORATE_ADDONS = {
  "Custom Text Sign Props": ["Custom Text Sign Props"],
  "Print Package": ["Printer", "Printer Stand", "Paper/Ink", "Laptop - if Ipad Booth"],
  "Custom Branded Step and Repeat Backdrop": ["Custom Branded Step and Repeat Backdrop"],
  "Custom Branded Full Booth Vinyl Wrap": ["Custom Branded Full Booth Vinyl Wrap"],
  "Additional Social Media Sharing Kiosk": ["Additional Social Media Sharing Kiosk(s)"],
  "Custom Branded 360 Backdrop": ["Custom Branded 360 Backdrop"],
  "Confetti": ["Confetti", "Shop Vac"],
  "Fog Machine": ["Fog Machine", "Fog Juice"],
  "Custom Branded 360 Booth Vinyl Wrap": ["Custom Branded 360 Booth Vinyl Wrap"],
  "Custom Branded Sharing Kiosk": ["Custom Branded Sharing Kiosk(s)"],
  "Print Package: Unlimited 4x6in Prints": ["Printer", "Printer Stand", "Paper/Ink", "Laptop - if Ipad Booth"],
  "Custom-Branded Step and Repeat Backdrop": ["Custom-Branded Step and Repeat Backdrop"],
  "Custom-Branded Step and Repeat Backdrop 12x10 ft": ["Custom-Branded Step and Repeat Backdrop 12x10 ft"],
  "Custom Branded Full Booth Vinyl Wrap (KS)": ["Custom Branded Full Booth Vinyl Wrap (KS)"],
  "Pre-Printed Custom Branded Photo Paper": ["Pre-Printed Custom Branded Photo Paper"],
  "Additional Bots": ["Additional Bots (check quantity + 1)"],
  "Custom Branded Stickers": ["Custom Branded Stickers"],
  "Additional Card Cutting Station": ["Additional Card Cutting Station"],
  "Hair Blower": ["Hair Blower"],
  "Green Screen Backdrop": ["Green Screen Backdrop"],
  "8x10 inch Prints": ["DS820 Printer (Ask Kurtis)"]
};

const NON_CORPORATE_SERVICES = {
  "Bronze Package": ["Venture", "Printer", "Printer Stand", "Paper/Ink", "Backdrop", "Hotspot", "Props", "Power Strip", "Extension Cables"],
  "Silver Package": ["Venture", "Printer", "Printer Stand", "Paper/Ink", "Sharing Stand", "Ipad", "Backdrop", "Hotspot", "Props", "Power Strip", "Extension Cables"],
  "Gold Package": ["Roaming Photo Booth", "Extra Batteries - Roamer", "Venture/GIFs", "Printer", "Printer Stand", "Paper/Ink", "Sharing Stand", "Ipad", "Backdrop", "Hotspot", "Props", "Power Strip", "Extension Cables", "Extra Ipad Pro"],
  "Glam Booth": ["Venture", "Bulb Softbox + Ring Adapter", "2x Alien Bee Flashes (1 backup)", "Printer", "Printer Stand", "Paper/Ink", "Sharing Stand", "Ipad", "Backdrop", "Hotspot", "Props", "Power Strip", "Extension Cables"],
  "AI Photo Booth": ["Ipad Booth + DSLR", "Speedflash + Bubble diffuser", "AA Batteries - Flash", "Printer", "Printer Stand", "Paper/Ink", "Sharing Stand", "Ipad", "Backdrop", "Hotspot", "Power Strip", "Extension Cables", "Extra Ipad Pro"],
  "Spotlight Photo Booth": ["Venture", "Spotlight Adapter", "Spotlight Video Light", "Printer", "Printer Stand", "Paper/Ink", "Sharing Stand", "Ipad", "Backdrop", "Hotspot", "Props", "Power Strip", "Extension Cables"],
  "Travel Theme Photo Booth": ["Ipad Booth + DSLR", "Speedflash + Bubble diffuser", "AA Batteries - Flash", "Printer", "Printer Stand", "Paper/Ink", "Sharing Stand", "Ipad", "Backdrop", "Hotspot", "Power Strip", "Extension Cables", "Extra Ipad Pro"],
  "Magazine Cover Booth": ["Ipad Booth + DSLR", "Speedflash + Bubble diffuser", "AA Batteries - Flash", "Printer", "Printer Stand", "Paper/Ink", "Sharing Stand", "Ipad", "Backdrop", "Hotspot", "Power Strip", "Extension Cables", "Extra Ipad Pro"],
  "Portrait Studio": ["R6 Camera + Camera Tripod", "Wireless Flash Trigger + Flash receiver", "Hotshoe + Sync Cord (backup)", "2x Alien Bee Flashes (1 backup)", "Large Softbox", "Circle Base Monopod", "Sandbags/Weights", "Iphone or Ipad", "White Dongle + Cord to Camera", "Printer", "Printer Stand", "Paper/Ink", "Sharing Stand", "Ipad", "Backdrop", "Hotspot", "Props", "Power Strip", "Extension Cables"],
  "360 Booth": ["360 Platform + Arm", "Platform Battery + Power Cord", "Ring Light for Arm", "Ring Light Battery", "4 LED Lights + Circle Monopods", "LED Light Batteries", "Sharing Stand", "Ipad", "Power Strip", "Extension Cables", "Iphone", "White Dongle + Cords"],
  "180 Multi-Cam Array": ["Array", "Array PC", "2x Einstein Flashes (1 backup)", "Array Softbox", "Sharing Stand", "Ipad", "Hotspot", "Power Strip", "Extension Cables"],
  "Kande Station Rental": ["Ipad Booth (No DSLR)", "Hotspot", "Extension Cables", "Extra Ipad Pro"],
  "Roaming Photo Booth": ["Roaming Photo Booth", "Extra Batteries - Roamer", "Hotspot", "Battery Pack - Hotspot", "Extra Ipad Pro"]
};

const NON_CORPORATE_ADDONS = {
  "Premium Flower Wall": ["Premium Flower Wall"],
  "Beep Phone": ["Beep Phone", "Battery Pack", "LED Sign"],
  "Custom Branded Step and Repeat Backdrop": ["Custom Branded Step and Repeat Backdrop"],
  "Green Screen Backdrop": ["Green Screen Backdrop", "2x LED Light Wands", "2x Mic Stands", "Light Wand Batteries"],
  "Roaming Photo Booth": ["Extra Batteries - Roamer"],
  "Confetti": ["Confetti", "Shop Vac"],
  "Fog Machine": ["Fog Machine", "Fog Juice"],
  "Custom Branded 360 Booth Vinyl Wrap": ["Apply 360 Platform Wrap"],
  "360 Enclosure with LED String Lights": ["360 Enclosure with LED String Lights", "Zip Ties"],
  "360 Custom Curved Backdrop - 10ft Wide": ["360 Custom Curved Backdrop - 10ft Wide"],
  "360 Custom Branded Step and Repeat Backdrop": ["360 Custom Branded Step and Repeat Backdrop"],
  "Premium Themed Prop Signs": ["Props"]
};

// Check if event type is corporate
function isCorporateEvent(eventType) {
  if (!eventType) return false;
  const lower = eventType.toLowerCase();
  return lower.includes('corporate brand activation') || lower.includes('brand marketing');
}

// Normalize service name for matching (handles variations)
function normalizeServiceName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Find matching service config
function findServiceMatch(serviceName, serviceConfig) {
  const normalized = normalizeServiceName(serviceName);
  
  for (const [configName, items] of Object.entries(serviceConfig)) {
    const normalizedConfig = normalizeServiceName(configName);
    
    // Exact match
    if (normalized === normalizedConfig) return items;
    
    // Partial match (service name contains config name or vice versa)
    if (normalized.includes(normalizedConfig) || normalizedConfig.includes(normalized)) return items;
    
    // Special cases for variations
    if (normalized.includes('ai photo booth') && normalizedConfig.includes('ai photo booth')) return items;
    if (normalized.includes('360') && normalizedConfig.includes('360 booth')) return items;
    if (normalized.includes('kande station') && normalizedConfig.includes('kande station')) return items;
  }
  
  return null;
}

// Check if event has iPad Booth service
function hasIpadBooth(event) {
  for (const service of (event.services || [])) {
    const serviceName = (service.name || service).toLowerCase();
    if (serviceName.includes('ipad booth')) return true;
  }
  return false;
}

// Generate packer list items based on event data
function generatePackerItems(event) {
  const items = [];
  const addedItems = new Set(); // Track to avoid duplicates
  const isCorporate = isCorporateEvent(event.eventType);
  const eventHasIpadBooth = hasIpadBooth(event);
  
  const serviceConfig = isCorporate ? CORPORATE_SERVICES : NON_CORPORATE_SERVICES;
  const addonConfig = isCorporate ? CORPORATE_ADDONS : NON_CORPORATE_ADDONS;
  
  // Process each booked service
  for (const service of (event.services || [])) {
    const serviceName = service.name || service;
    
    // Try to match in services first
    let matchedItems = findServiceMatch(serviceName, serviceConfig);
    
    // If not found in services, try addons
    if (!matchedItems) {
      matchedItems = findServiceMatch(serviceName, addonConfig);
    }
    
    // If still not found in primary config, try the other config (fallback)
    if (!matchedItems) {
      const altServiceConfig = isCorporate ? NON_CORPORATE_SERVICES : CORPORATE_SERVICES;
      const altAddonConfig = isCorporate ? NON_CORPORATE_ADDONS : CORPORATE_ADDONS;
      matchedItems = findServiceMatch(serviceName, altServiceConfig) || findServiceMatch(serviceName, altAddonConfig);
    }
    
    if (matchedItems) {
      for (const item of matchedItems) {
        // Skip "Laptop - if Ipad Booth" if event doesn't have an iPad Booth
        if (item.toLowerCase().includes('laptop') && item.toLowerCase().includes('ipad booth') && !eventHasIpadBooth) {
          continue;
        }
        
        if (!addedItems.has(item.toLowerCase())) {
          addedItems.add(item.toLowerCase());
          items.push({
            id: `auto_${items.length}`,
            text: item,
            required: true,
            source: serviceName, // Track which service added this item
            autoGenerated: true
          });
        }
      }
    }
  }
  
  return items;
}

module.exports = {
  CORPORATE_SERVICES,
  CORPORATE_ADDONS,
  NON_CORPORATE_SERVICES,
  NON_CORPORATE_ADDONS,
  isCorporateEvent,
  generatePackerItems,
  findServiceMatch
};
