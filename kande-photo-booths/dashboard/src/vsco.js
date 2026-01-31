// VSCO Workspace API Client - Optimized
const API_BASE = process.env.VSCO_API_BASE || 'https://workspace.vsco.co/api/v2';
const API_KEY = process.env.VSCO_API_KEY;

async function fetchAPI(endpoint, params = {}) {
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), {
    headers: {
      'X-API-KEY': API_KEY,
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`VSCO API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// Get jobs - fetch ALL upcoming booked/fulfillment events
// IMPORTANT: Booked events are scattered across 23+ pages of mostly leads.
// Uses parallel pairs (batch of 2) to balance speed vs VSCO rate limits.
async function getUpcomingJobs(maxPages = 25) {
  const pstOptions = { timeZone: 'America/Los_Angeles' };
  const now = new Date();
  const pstDateStr = now.toLocaleDateString('en-CA', pstOptions);
  
  const jobs = [];

  // Get page 1 first to learn total pages
  console.log('Fetching jobs page 1...');
  const first = await fetchAPI('/job', {
    page: 1,
    pageSize: 100,
    includeClosed: false,
    sortBy: 'eventDate desc'
  });

  const totalPages = Math.min(first.meta.totalPages || 1, maxPages);

  for (const job of first.items) {
    if (job.eventDate && job.eventDate >= pstDateStr && (job.stage === 'booked' || job.stage === 'fulfillment')) {
      jobs.push(job);
    }
  }

  // Fetch remaining pages in pairs (safe parallelism for VSCO API)
  for (let p = 2; p <= totalPages; p += 2) {
    const batch = [p];
    if (p + 1 <= totalPages) batch.push(p + 1);
    
    console.log(`Fetching pages ${batch.join(',')}/${totalPages}...`);
    const results = await Promise.all(
      batch.map(pg =>
        fetchAPI('/job', { page: pg, pageSize: 100, includeClosed: false, sortBy: 'eventDate desc' })
          .catch(e => { console.error(`Page ${pg} error:`, e.message); return { items: [] }; })
      )
    );

    for (const data of results) {
      for (const job of (data.items || [])) {
        if (job.eventDate && job.eventDate >= pstDateStr && (job.stage === 'booked' || job.stage === 'fulfillment')) {
          jobs.push(job);
        }
      }
    }
  }

  console.log(`Found ${jobs.length} upcoming booked/fulfillment events across ${totalPages} pages`);

  // Sort by eventDate ascending
  jobs.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
  
  return jobs;
}

// Get event details for a job
async function getJobEvent(jobId) {
  const data = await fetchAPI('/event', { jobId });
  return data.items[0] || null;
}

// Get contacts (staff) for a job  
async function getJobContacts(jobId) {
  const data = await fetchAPI('/job-contact', { jobId });
  return data.items || [];
}

// Get contact details
async function getContact(contactId) {
  const data = await fetchAPI(`/address-book/${contactId}`);
  return data;
}

// Get all job roles
async function getJobRoles() {
  const data = await fetchAPI('/job-role');
  return data.items || [];
}

// Get all custom field definitions
async function getCustomFields() {
  const data = await fetchAPI('/custom-field');
  return data.items || [];
}

// Get orders for a job
async function getJobOrders(jobId) {
  try {
    const data = await fetchAPI(`/job/${jobId}/order`);
    return data.items || [];
  } catch (e) {
    return [];
  }
}

// Build complete event view
async function getFullEventDetails(job, roleMap, fieldMap, contactCache) {
  const event = await getJobEvent(job.id);

  // Get contacts and identify team members (staff)
  const jobContacts = await getJobContacts(job.id);
  const staff = [];
  const teamRoleIds = Object.entries(roleMap)
    .filter(([id, role]) => role.kind === 'team')
    .map(([id]) => id);

  for (const jc of jobContacts) {
    const isTeam = (jc.jobRoles || []).some(r => teamRoleIds.includes(r));
    if (isTeam) {
      if (!contactCache[jc.contactId]) {
        try {
          contactCache[jc.contactId] = await getContact(jc.contactId);
        } catch (e) {
          contactCache[jc.contactId] = { firstName: 'Unknown', lastName: '' };
        }
      }
      const contact = contactCache[jc.contactId];
      const roleName = jc.jobRoles
        .map(r => roleMap[r]?.name)
        .filter(Boolean)
        .join(', ');

      staff.push({
        id: jc.contactId,
        name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        phone: contact.cellPhone?.formatted || contact.homePhone?.formatted || '',
        email: contact.email || '',
        role: roleName
      });
    }
  }

  // Get LINE ITEMS from booked orders (not quotes/drafts/voided)
  const orders = await getJobOrders(job.id);
  const services = [];
  let servicesTotal = 0;
  const bookedStatuses = ['open', 'booked', 'paid-in-full', 'partially-paid', 'sent'];
  for (const order of orders) {
    // Only include booked orders, not drafts/quotes/voided
    if (bookedStatuses.includes(order.status) && order.lineItems) {
      for (const item of order.lineItems) {
        // Only include items that are selected and have units > 0
        const isSelected = item.selected !== false && item.units > 0;
        if (item.name && isSelected) {
          // Price is in cents, calculate line total
          const unitPrice = item.pricePerUnit || 0;
          const lineTotal = unitPrice * item.units;
          servicesTotal += lineTotal;
          
          // Check if service already exists, if so add to quantity and price
          const existing = services.find(s => s.name === item.name);
          if (existing) {
            existing.quantity += item.units;
            existing.price += lineTotal;
          } else {
            services.push({ name: item.name, quantity: item.units, price: lineTotal });
          }
        }
      }
    }
  }

  // Map custom fields
  const customFieldValues = {};
  if (job.customFields) {
    for (const cf of job.customFields) {
      const fieldDef = fieldMap[cf.fieldId];
      if (fieldDef) {
        let value = cf.value || '';
        
        // Helper function to convert HTML to text with line breaks and links preserved
        const htmlToText = (html) => {
          return html
            .replace(/<br\s*\/?>/gi, '\n')           // <br> to newline
            .replace(/<\/p>/gi, '\n')                 // </p> to newline
            .replace(/<\/div>/gi, '\n')               // </div> to newline
            .replace(/&nbsp;/gi, ' ')                 // &nbsp; to space
            // Preserve links as markdown-style [text](url)
            .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi, '[$2]($1)')
            .replace(/<[^>]*>/g, '')                  // Strip remaining HTML tags
            .replace(/[ \t]+/g, ' ')                  // Collapse spaces (but not newlines)
            .replace(/\n +/g, '\n')                   // Remove spaces after newlines
            .replace(/ +\n/g, '\n')                   // Remove spaces before newlines
            .replace(/\n{3,}/g, '\n\n')               // Max 2 consecutive newlines
            .trim();
        };

        // Check if value contains image tags and extract them
        const imgMatches = value.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
        if (imgMatches) {
          // Extract image URLs and keep them as special format
          const imgUrls = imgMatches.map(img => {
            const srcMatch = img.match(/src=["']([^"']+)["']/i);
            return srcMatch ? srcMatch[1] : null;
          }).filter(Boolean);
          
          // Strip HTML tags but preserve line breaks
          const textValue = htmlToText(value);
          
          // Store both text and images
          if (imgUrls.length > 0) {
            customFieldValues[fieldDef.name] = {
              text: textValue,
              images: imgUrls
            };
          } else {
            customFieldValues[fieldDef.name] = textValue;
          }
        } else {
          // Strip HTML tags but preserve line breaks
          value = htmlToText(value);
          customFieldValues[fieldDef.name] = value;
        }
      }
    }
  }

  return {
    id: job.id,
    title: job.title || job.name || 'Untitled Event',
    eventType: job.jobTypeName || 'Event',
    stage: job.stage,
    eventDate: event?.startDate || job.eventDate,
    endDate: event?.endDate || null,
    startTime: event?.startTime || null,
    endTime: event?.endTime || null,
    location: event?.location?.address ? {
      name: event.location.address.name || '',
      street: event.location.address.streetAddress || '',
      city: event.location.address.city || '',
      state: event.location.address.state || '',
      zip: event.location.address.postalCode || '',
      fullAddress: [
        event.location.address.streetAddress,
        event.location.address.city,
        event.location.address.state,
        event.location.address.postalCode
      ].filter(Boolean).join(', ')
    } : null,
    staff,
    services,
    servicesTotal,
    customFields: customFieldValues,
    guestCount: job.guestCount || null,
    vscoLink: job.links?.self?.managerHref || null
  };
}

// Main function - get dashboard data
async function getDashboardData() {
  console.log('Fetching dashboard data from VSCO...');
  const startTime = Date.now();

  // Get lookup tables first
  const [roles, fields] = await Promise.all([
    getJobRoles(),
    getCustomFields()
  ]);

  const roleMap = {};
  for (const r of roles) roleMap[r.id] = r;

  const fieldMap = {};
  for (const f of fields) fieldMap[f.id] = f;

  // Get upcoming jobs (limited pagination)
  const jobs = await getUpcomingJobs(10);
  console.log(`Found ${jobs.length} upcoming booked events`);

  // Build full details for each (with rate limiting)
  const contactCache = {};
  const events = [];

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    try {
      console.log(`Processing event ${i + 1}/${jobs.length}: ${job.title || job.id}`);
      const details = await getFullEventDetails(job, roleMap, fieldMap, contactCache);
      events.push(details);
    } catch (e) {
      console.error(`Error processing job ${job.id}:`, e.message);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Dashboard data fetched in ${elapsed}s`);

  return {
    events,
    staff: Object.values(contactCache).map(c => ({
      id: c.id,
      name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
      email: c.email
    })),
    lastUpdated: new Date().toISOString()
  };
}

module.exports = {
  getDashboardData,
  getJobRoles,
  getCustomFields
};
