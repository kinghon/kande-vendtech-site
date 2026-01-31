const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Simple JSON file database
const DB_FILE = process.env.DB_PATH || '/data/data.json';

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading DB:', e);
  }
  return {
    prospects: [], contacts: [], activities: [],
    machines: [], locations: [], products: [], suppliers: [],
    finances: [], creditCards: [], restocks: [],
    staff: [], shifts: [],
    clients: [], touchpoints: [], issues: [],
    nextId: 1
  };
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

let db = loadDB();

// Ensure new collections exist
if (!db.machines) db.machines = [];
if (!db.locations) db.locations = [];
if (!db.products) db.products = [];
if (!db.suppliers) db.suppliers = [];
if (!db.finances) db.finances = [];
if (!db.creditCards) db.creditCards = [];
if (!db.restocks) db.restocks = [];
if (!db.staff) db.staff = [];
if (!db.shifts) db.shifts = [];
if (!db.clients) db.clients = [];
if (!db.touchpoints) db.touchpoints = [];
if (!db.issues) db.issues = [];
if (!db.aiOfficeRuns) db.aiOfficeRuns = [];
if (!db.sales) db.sales = [];
if (!db.planograms) db.planograms = [];
if (!db.marketingSpend) db.marketingSpend = [];
if (!db.leadSources) db.leadSources = [];
if (!db.gbpMetrics) db.gbpMetrics = [];

// Server-side geocoding
async function geocodeAddress(address) {
  try {
    const q = encodeURIComponent(address + ', Las Vegas, NV');
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`, {
      headers: { 'User-Agent': 'KandeVendTech-CRM/1.0' }
    });
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (e) {
    console.error('Geocode error:', address, e.message);
  }
  return null;
}

async function geocodeProspect(prospect) {
  if (!prospect.address || (prospect.lat && prospect.lng)) return false;
  const coords = await geocodeAddress(prospect.address);
  if (coords) { prospect.lat = coords.lat; prospect.lng = coords.lng; return true; }
  return false;
}

async function geocodeAll() {
  const missing = db.prospects.filter(p => p.address && (!p.lat || !p.lng));
  if (missing.length === 0) return;
  console.log(`Geocoding ${missing.length} prospects...`);
  let updated = 0;
  for (let i = 0; i < missing.length; i += 3) {
    const batch = missing.slice(i, i + 3);
    const results = await Promise.all(batch.map(p => geocodeProspect(p)));
    updated += results.filter(Boolean).length;
    if (i + 3 < missing.length) await new Promise(r => setTimeout(r, 350));
  }
  if (updated > 0) { saveDB(db); console.log(`Geocoded ${updated} prospects.`); }
}

geocodeAll();

app.use(express.json());

// Root route
app.get('/', (req, res) => {
  if (req.hostname.startsWith('sales')) {
    res.sendFile(path.join(__dirname, 'crm.html'));
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.use(express.static(__dirname, { index: false }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== PLAYBOOK API =====
const PLAYBOOK_FILE = process.env.PLAYBOOK_PATH || (fs.existsSync('/data/playbook.md') ? '/data/playbook.md' : path.join(__dirname, 'data', 'playbook.md'));
app.get('/api/playbook', (req, res) => {
  try {
    const content = fs.readFileSync(PLAYBOOK_FILE, 'utf8');
    const stats = fs.statSync(PLAYBOOK_FILE);
    res.json({ content, updated: stats.mtime.toISOString() });
  } catch (e) {
    res.json({ content: '# Playbook\n\nNo playbook content yet.', updated: null });
  }
});
app.put('/api/playbook', (req, res) => {
  try {
    const dir = path.dirname(PLAYBOOK_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PLAYBOOK_FILE, req.body.content);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== SEO API =====
const SEO_FILE = fs.existsSync('/data/seo.json') ? '/data/seo.json' : path.join(__dirname, 'data', 'seo.json');
function loadSEO() {
  try { if (fs.existsSync(SEO_FILE)) return JSON.parse(fs.readFileSync(SEO_FILE, 'utf8')); } catch (e) {}
  return { keywords: ['vending machines las vegas','smart vending las vegas','vending machine service las vegas','AI vending machines las vegas','vending machine rental las vegas','office vending machine las vegas','apartment vending machine las vegas','free vending machine las vegas','vending machine company las vegas','micro market las vegas','kande vendtech','smart vending solutions nevada'], history: [] };
}
function saveSEO(data) {
  const dir = path.dirname(SEO_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SEO_FILE, JSON.stringify(data, null, 2));
}
app.get('/api/seo', (req, res) => res.json(loadSEO()));
app.post('/api/seo/check', (req, res) => {
  const data = loadSEO();
  data.history.push({ date: new Date().toISOString(), rankings: req.body.rankings || {}, pageSpeed: req.body.pageSpeed || null, indexedPages: req.body.indexedPages || null, onPage: req.body.onPage || null, competitors: req.body.competitors || null });
  if (data.history.length > 52) data.history = data.history.slice(-52);
  saveSEO(data);
  res.json({ success: true, entries: data.history.length });
});
app.put('/api/seo/keywords', (req, res) => {
  const data = loadSEO();
  if (req.body.keywords) data.keywords = req.body.keywords;
  saveSEO(data);
  res.json({ success: true });
});

// ===== MARKETING SPEND API =====
app.get('/api/marketing/spend', (req, res) => {
  const { channel, from, to } = req.query;
  let records = db.marketingSpend || [];
  if (channel) records = records.filter(r => r.channel === channel);
  if (from) records = records.filter(r => r.date >= from);
  if (to) records = records.filter(r => r.date <= to);
  res.json(records.sort((a, b) => new Date(b.date) - new Date(a.date)));
});

app.post('/api/marketing/spend', (req, res) => {
  const record = {
    id: nextId(),
    channel: req.body.channel || 'other',
    amount: parseFloat(req.body.amount) || 0,
    date: req.body.date || new Date().toISOString().split('T')[0],
    description: req.body.description || '',
    created_at: new Date().toISOString()
  };
  if (!db.marketingSpend) db.marketingSpend = [];
  db.marketingSpend.push(record);
  saveDB(db);
  res.json(record);
});

app.delete('/api/marketing/spend/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.marketingSpend = (db.marketingSpend || []).filter(r => r.id !== id);
  saveDB(db);
  res.json({ success: true });
});

app.get('/api/marketing/roi', (req, res) => {
  const spend = db.marketingSpend || [];
  const leads = db.leadSources || [];
  const prospects = db.prospects || [];

  // Total spend by channel
  const spendByChannel = {};
  spend.forEach(s => {
    if (!spendByChannel[s.channel]) spendByChannel[s.channel] = 0;
    spendByChannel[s.channel] += s.amount || 0;
  });

  // Lead count by source
  const leadsBySource = {};
  leads.forEach(l => {
    if (!leadsBySource[l.source]) leadsBySource[l.source] = 0;
    leadsBySource[l.source]++;
  });

  // Count converted (signed) prospects per source
  const convertedBySource = {};
  leads.forEach(l => {
    const p = prospects.find(pr => pr.id === l.prospect_id);
    if (p && p.status === 'signed') {
      if (!convertedBySource[l.source]) convertedBySource[l.source] = 0;
      convertedBySource[l.source]++;
    }
  });

  // Revenue by source (from finances linked to prospects via locations)
  const allRevenue = (db.finances || []).filter(f => f.type === 'revenue');
  const totalRevenue = allRevenue.reduce((s, f) => s + (f.amount || 0), 0);

  const totalSpend = spend.reduce((s, r) => s + (r.amount || 0), 0);
  const totalLeads = leads.length;
  const totalConverted = Object.values(convertedBySource).reduce((s, n) => s + n, 0);

  // Per-channel ROI
  const channels = [...new Set([...Object.keys(spendByChannel), ...Object.keys(leadsBySource)])];
  const channelROI = channels.map(ch => {
    const spent = spendByChannel[ch] || 0;
    const leadCount = leadsBySource[ch] || 0;
    const converted = convertedBySource[ch] || 0;
    const costPerLead = leadCount > 0 ? spent / leadCount : null;
    const costPerConversion = converted > 0 ? spent / converted : null;
    return { channel: ch, spent, leads: leadCount, converted, costPerLead, costPerConversion };
  });

  res.json({
    totalSpend,
    totalRevenue,
    totalLeads,
    totalConverted,
    overallROI: totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend * 100).toFixed(1) : null,
    costPerLead: totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : null,
    conversionRate: totalLeads > 0 ? ((totalConverted / totalLeads) * 100).toFixed(1) : null,
    channels: channelROI,
    spendByChannel,
    leadsBySource
  });
});

// ===== LEAD SOURCES API =====
app.get('/api/marketing/leads', (req, res) => {
  const records = (db.leadSources || []).map(l => {
    const prospect = db.prospects.find(p => p.id === l.prospect_id);
    return { ...l, prospect_name: prospect?.name || 'Unknown', prospect_status: prospect?.status || 'unknown' };
  });
  res.json(records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

app.post('/api/marketing/leads', (req, res) => {
  const record = {
    id: nextId(),
    prospect_id: req.body.prospect_id || null,
    source: req.body.source || 'other',
    notes: req.body.notes || '',
    created_at: new Date().toISOString()
  };
  if (!db.leadSources) db.leadSources = [];
  db.leadSources.push(record);
  saveDB(db);
  res.json(record);
});

app.delete('/api/marketing/leads/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.leadSources = (db.leadSources || []).filter(r => r.id !== id);
  saveDB(db);
  res.json({ success: true });
});

// ===== GBP METRICS API =====
app.get('/api/marketing/gbp', (req, res) => {
  res.json(db.gbpMetrics || []);
});

app.post('/api/marketing/gbp', (req, res) => {
  const record = {
    id: nextId(),
    date: req.body.date || new Date().toISOString().split('T')[0],
    views: req.body.views || 0,
    searches: req.body.searches || 0,
    calls: req.body.calls || 0,
    directions: req.body.directions || 0,
    website_clicks: req.body.website_clicks || 0,
    reviews: req.body.reviews || 0,
    avg_rating: req.body.avg_rating || 0,
    created_at: new Date().toISOString()
  };
  if (!db.gbpMetrics) db.gbpMetrics = [];
  db.gbpMetrics.push(record);
  saveDB(db);
  res.json(record);
});

// ===== HELPER =====
function nextId() { return db.nextId++; }

// ===== PROSPECTS API =====
app.get('/api/prospects', (req, res) => {
  const prospects = db.prospects.map(p => {
    const activities = db.activities.filter(a => a.prospect_id === p.id);
    const contacts = db.contacts.filter(c => c.prospect_id === p.id);
    const lastActivity = activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    const primaryContact = contacts.find(c => c.is_primary) || contacts[0];
    return {
      ...p, activities, contacts,
      activity_count: activities.length,
      last_activity: lastActivity ? `${lastActivity.type}: ${lastActivity.description || ''}` : null,
      last_activity_date: lastActivity?.created_at,
      next_action: lastActivity?.next_action,
      next_action_date: lastActivity?.next_action_date,
      primary_contact: primaryContact?.name
    };
  }).sort((a, b) => {
    const priorityOrder = { hot: 1, warm: 2, normal: 3 };
    return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
  });
  res.json(prospects);
});

app.get('/api/prospects/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const prospect = db.prospects.find(p => p.id === id);
  if (!prospect) return res.status(404).json({ error: 'Not found' });
  const contacts = db.contacts.filter(c => c.prospect_id === id);
  const activities = db.activities.filter(a => a.prospect_id === id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ ...prospect, contacts, activities });
});

app.post('/api/prospects', (req, res) => {
  const prospect = { id: nextId(), ...req.body, status: req.body.status || 'new', priority: req.body.priority || 'normal', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  db.prospects.push(prospect);
  saveDB(db);
  res.json(prospect);
  geocodeProspect(prospect).then(updated => { if (updated) saveDB(db); });
});

app.put('/api/prospects/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = db.prospects.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  const oldAddress = db.prospects[index].address;
  db.prospects[index] = { ...db.prospects[index], ...req.body, updated_at: new Date().toISOString() };
  saveDB(db);
  res.json(db.prospects[index]);
  if (req.body.address && req.body.address !== oldAddress) {
    db.prospects[index].lat = null; db.prospects[index].lng = null;
    geocodeProspect(db.prospects[index]).then(updated => { if (updated) saveDB(db); });
  }
});

app.delete('/api/prospects/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.prospects = db.prospects.filter(p => p.id !== id);
  db.contacts = db.contacts.filter(c => c.prospect_id !== id);
  db.activities = db.activities.filter(a => a.prospect_id !== id);
  saveDB(db);
  res.json({ success: true });
});

// ===== CONTACTS API =====
app.post('/api/prospects/:id/contacts', (req, res) => {
  const prospect_id = parseInt(req.params.id);
  if (req.body.is_primary) db.contacts.forEach(c => { if (c.prospect_id === prospect_id) c.is_primary = false; });
  const contact = { id: nextId(), prospect_id, ...req.body, is_primary: req.body.is_primary || false, created_at: new Date().toISOString() };
  db.contacts.push(contact);
  saveDB(db);
  res.json(contact);
});

app.put('/api/contacts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = db.contacts.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  if (req.body.is_primary) db.contacts.forEach(c => { if (c.prospect_id === db.contacts[idx].prospect_id) c.is_primary = false; });
  db.contacts[idx] = { ...db.contacts[idx], ...req.body };
  saveDB(db);
  res.json(db.contacts[idx]);
});

app.delete('/api/contacts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.contacts = db.contacts.filter(c => c.id !== id);
  saveDB(db);
  res.json({ success: true });
});

// ===== ACTIVITIES API =====
app.post('/api/prospects/:id/activities', (req, res) => {
  const prospect_id = parseInt(req.params.id);
  const activity = { id: nextId(), prospect_id, ...req.body, created_at: new Date().toISOString() };
  db.activities.push(activity);
  const prospect = db.prospects.find(p => p.id === prospect_id);
  if (prospect) {
    if (req.body.outcome === 'interested') prospect.priority = 'hot';
    else if (req.body.outcome === 'not_interested') prospect.status = 'closed';
    prospect.updated_at = new Date().toISOString();
  }
  saveDB(db);
  res.json(activity);
});

app.delete('/api/activities/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.activities = db.activities.filter(a => a.id !== id);
  saveDB(db);
  res.json({ success: true });
});

// ===== MACHINES API =====
app.get('/api/machines', (req, res) => {
  const machines = db.machines.map(m => {
    const location = db.locations.find(l => l.id === m.location_id);
    return { ...m, location: location || null };
  });
  res.json(machines);
});

app.get('/api/machines/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const machine = db.machines.find(m => m.id === id);
  if (!machine) return res.status(404).json({ error: 'Not found' });
  const location = db.locations.find(l => l.id === machine.location_id);
  const restocks = db.restocks.filter(r => r.machine_id === id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const revenue = db.finances.filter(f => f.machine_id === id && f.type === 'revenue');
  res.json({ ...machine, location: location || null, restocks, revenue });
});

app.post('/api/machines', (req, res) => {
  const machine = {
    id: nextId(),
    ...req.body,
    status: req.body.status || 'available',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.machines.push(machine);
  saveDB(db);
  res.json(machine);
});

app.put('/api/machines/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = db.machines.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.machines[idx] = { ...db.machines[idx], ...req.body, updated_at: new Date().toISOString() };
  saveDB(db);
  res.json(db.machines[idx]);
});

app.delete('/api/machines/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.machines = db.machines.filter(m => m.id !== id);
  saveDB(db);
  res.json({ success: true });
});

// ===== LOCATIONS API =====
app.get('/api/locations', (req, res) => {
  const locations = db.locations.map(l => {
    const machines = db.machines.filter(m => m.location_id === l.id);
    const prospect = db.prospects.find(p => p.id === l.prospect_id);
    return { ...l, machines, prospect_name: prospect?.name || l.name };
  });
  res.json(locations);
});

app.post('/api/locations', (req, res) => {
  const location = {
    id: nextId(),
    ...req.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.locations.push(location);
  saveDB(db);
  res.json(location);
});

app.put('/api/locations/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = db.locations.findIndex(l => l.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.locations[idx] = { ...db.locations[idx], ...req.body, updated_at: new Date().toISOString() };
  saveDB(db);
  res.json(db.locations[idx]);
});

app.delete('/api/locations/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.locations = db.locations.filter(l => l.id !== id);
  // Unassign machines from deleted location
  db.machines.forEach(m => { if (m.location_id === id) { m.location_id = null; m.status = 'available'; } });
  saveDB(db);
  res.json({ success: true });
});

// ===== PRODUCTS API =====
app.get('/api/products', (req, res) => {
  res.json(db.products);
});

app.post('/api/products', (req, res) => {
  const product = {
    id: nextId(),
    ...req.body,
    margin: req.body.cost_price && req.body.sell_price ? Math.round(((req.body.sell_price - req.body.cost_price) / req.body.sell_price) * 100) : 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.products.push(product);
  saveDB(db);
  res.json(product);
});

app.put('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = db.products.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const updated = { ...db.products[idx], ...req.body, updated_at: new Date().toISOString() };
  if (updated.cost_price && updated.sell_price) {
    updated.margin = Math.round(((updated.sell_price - updated.cost_price) / updated.sell_price) * 100);
  }
  db.products[idx] = updated;
  saveDB(db);
  res.json(db.products[idx]);
});

app.delete('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.products = db.products.filter(p => p.id !== id);
  saveDB(db);
  res.json({ success: true });
});

// ===== SUPPLIERS API =====
app.get('/api/suppliers', (req, res) => res.json(db.suppliers));
app.post('/api/suppliers', (req, res) => {
  const supplier = { id: nextId(), ...req.body, created_at: new Date().toISOString() };
  db.suppliers.push(supplier);
  saveDB(db);
  res.json(supplier);
});
app.put('/api/suppliers/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = db.suppliers.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.suppliers[idx] = { ...db.suppliers[idx], ...req.body };
  saveDB(db);
  res.json(db.suppliers[idx]);
});
app.delete('/api/suppliers/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.suppliers = db.suppliers.filter(s => s.id !== id);
  saveDB(db);
  res.json({ success: true });
});

// ===== FINANCES API =====
app.get('/api/finances', (req, res) => {
  const { type, machine_id, month } = req.query;
  let records = db.finances;
  if (type) records = records.filter(f => f.type === type);
  if (machine_id) records = records.filter(f => f.machine_id === parseInt(machine_id));
  if (month) records = records.filter(f => f.month === month);
  res.json(records);
});

app.get('/api/finances/summary', (req, res) => {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

  const allRevenue = db.finances.filter(f => f.type === 'revenue');
  const allExpenses = db.finances.filter(f => f.type === 'expense');

  const currentRevenue = allRevenue.filter(f => f.month === currentMonth).reduce((s, f) => s + (f.amount || 0), 0);
  const currentExpenses = allExpenses.filter(f => f.month === currentMonth).reduce((s, f) => s + (f.amount || 0), 0);
  const lastRevenue = allRevenue.filter(f => f.month === lastMonthStr).reduce((s, f) => s + (f.amount || 0), 0);
  const lastExpenses = allExpenses.filter(f => f.month === lastMonthStr).reduce((s, f) => s + (f.amount || 0), 0);

  const totalRevenue = allRevenue.reduce((s, f) => s + (f.amount || 0), 0);
  const totalExpenses = allExpenses.reduce((s, f) => s + (f.amount || 0), 0);

  // Revenue by machine
  const machineRevenue = {};
  allRevenue.forEach(f => {
    if (!machineRevenue[f.machine_id]) machineRevenue[f.machine_id] = 0;
    machineRevenue[f.machine_id] += f.amount || 0;
  });

  // Monthly totals
  const months = {};
  db.finances.forEach(f => {
    if (!f.month) return;
    if (!months[f.month]) months[f.month] = { revenue: 0, expenses: 0 };
    if (f.type === 'revenue') months[f.month].revenue += f.amount || 0;
    if (f.type === 'expense') months[f.month].expenses += f.amount || 0;
  });

  // Credit cards
  const creditCards = db.creditCards || [];
  const totalCreditBalance = creditCards.reduce((s, c) => s + (c.balance || 0), 0);
  const totalCreditLimit = creditCards.reduce((s, c) => s + (c.credit_limit || 0), 0);

  res.json({
    currentMonth, lastMonthStr,
    currentRevenue, currentExpenses, currentProfit: currentRevenue - currentExpenses,
    lastRevenue, lastExpenses, lastProfit: lastRevenue - lastExpenses,
    totalRevenue, totalExpenses, totalProfit: totalRevenue - totalExpenses,
    machineRevenue, months,
    machineCount: db.machines.length,
    deployedCount: db.machines.filter(m => m.status === 'deployed').length,
    locationCount: db.locations.length,
    totalCreditBalance, totalCreditLimit,
    creditCards
  });
});

app.post('/api/finances', (req, res) => {
  const record = {
    id: nextId(),
    ...req.body,
    created_at: new Date().toISOString()
  };
  db.finances.push(record);
  saveDB(db);
  res.json(record);
});

app.put('/api/finances/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = db.finances.findIndex(f => f.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.finances[idx] = { ...db.finances[idx], ...req.body };
  saveDB(db);
  res.json(db.finances[idx]);
});

app.delete('/api/finances/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.finances = db.finances.filter(f => f.id !== id);
  saveDB(db);
  res.json({ success: true });
});

// ===== CREDIT CARDS API =====
app.get('/api/credit-cards', (req, res) => res.json(db.creditCards));

app.post('/api/credit-cards', (req, res) => {
  const card = { id: nextId(), ...req.body, created_at: new Date().toISOString() };
  db.creditCards.push(card);
  saveDB(db);
  res.json(card);
});

app.put('/api/credit-cards/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = db.creditCards.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.creditCards[idx] = { ...db.creditCards[idx], ...req.body };
  saveDB(db);
  res.json(db.creditCards[idx]);
});

app.delete('/api/credit-cards/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.creditCards = db.creditCards.filter(c => c.id !== id);
  saveDB(db);
  res.json({ success: true });
});

// ===== RESTOCKS API =====
app.get('/api/restocks', (req, res) => {
  const { machine_id, status } = req.query;
  let records = db.restocks;
  if (machine_id) records = records.filter(r => r.machine_id === parseInt(machine_id));
  if (status) records = records.filter(r => r.status === status);
  res.json(records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

app.post('/api/restocks', (req, res) => {
  const restock = {
    id: nextId(),
    ...req.body,
    status: req.body.status || 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.restocks.push(restock);
  saveDB(db);
  res.json(restock);
});

app.put('/api/restocks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = db.restocks.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.restocks[idx] = { ...db.restocks[idx], ...req.body, updated_at: new Date().toISOString() };
  saveDB(db);
  res.json(db.restocks[idx]);
});

app.delete('/api/restocks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.restocks = db.restocks.filter(r => r.id !== id);
  saveDB(db);
  res.json({ success: true });
});

// ===== AI OFFICE RUNS API =====
app.get('/api/ai-office/runs', (req, res) => {
  const runs = (db.aiOfficeRuns || [])
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const limit = parseInt(req.query.limit) || 20;
  res.json(runs.slice(0, limit));
});

app.post('/api/ai-office/runs', (req, res) => {
  const run = {
    id: nextId(),
    task: req.body.task || 'Untitled task',
    status: req.body.status || 'planning',
    created_at: new Date().toISOString(),
    completed_at: null,
    subtasks: req.body.subtasks || [],
    final_output: req.body.final_output || null
  };
  db.aiOfficeRuns.push(run);
  saveDB(db);
  res.json(run);
});

app.put('/api/ai-office/runs/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = db.aiOfficeRuns.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Run not found' });

  const run = db.aiOfficeRuns[idx];

  // Update basic fields
  if (req.body.status) run.status = req.body.status;
  if (req.body.final_output) run.final_output = req.body.final_output;
  if (req.body.status === 'complete' || req.body.status === 'failed') {
    run.completed_at = new Date().toISOString();
  }

  // Replace subtasks array if provided
  if (req.body.subtasks) {
    run.subtasks = req.body.subtasks;
  }

  // Add or update a single subtask
  if (req.body.add_subtask) {
    const st = req.body.add_subtask;
    const existingIdx = run.subtasks.findIndex(s => s.id === st.id);
    if (existingIdx >= 0) {
      run.subtasks[existingIdx] = { ...run.subtasks[existingIdx], ...st };
    } else {
      run.subtasks.push({
        id: st.id || `T${run.subtasks.length + 1}`,
        name: st.name || 'Unnamed subtask',
        role: st.role || 'builder',
        status: st.status || 'pending',
        retries: st.retries || 0,
        result_summary: st.result_summary || null
      });
    }
  }

  // Update a specific subtask by id
  if (req.body.update_subtask) {
    const update = req.body.update_subtask;
    const stIdx = run.subtasks.findIndex(s => s.id === update.id);
    if (stIdx >= 0) {
      run.subtasks[stIdx] = { ...run.subtasks[stIdx], ...update };
    }
  }

  db.aiOfficeRuns[idx] = run;
  saveDB(db);
  res.json(run);
});

// ===== DASHBOARD STATS =====
app.get('/api/stats', (req, res) => {
  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthRevenue = db.finances.filter(f => f.type === 'revenue' && f.month === currentMonth).reduce((s, f) => s + (f.amount || 0), 0);
  const monthExpenses = db.finances.filter(f => f.type === 'expense' && f.month === currentMonth).reduce((s, f) => s + (f.amount || 0), 0);

  // Staff stats
  const weekStartStr = weekAgo.toISOString().split('T')[0];
  const weekEndStr = now.toISOString().split('T')[0];
  const weekShifts = db.shifts.filter(s => s.date >= weekStartStr && s.date <= weekEndStr);
  const weekHours = weekShifts.reduce((sum, s) => sum + (s.hours || 0), 0);
  const weekLaborCost = weekShifts.reduce((sum, s) => {
    const emp = db.staff.find(e => e.id === s.employee_id);
    return sum + ((s.hours || 0) * (emp?.hourly_rate || 0));
  }, 0);

  // Client stats
  const openIssues = db.issues.filter(i => i.status !== 'resolved').length;

  res.json({
    prospects: db.prospects.length,
    hot: db.prospects.filter(p => p.priority === 'hot').length,
    active: db.prospects.filter(p => p.status === 'active' || p.status === 'new').length,
    signed: db.prospects.filter(p => p.status === 'signed').length,
    closed: db.prospects.filter(p => p.status === 'closed').length,
    thisWeek: db.activities.filter(a => new Date(a.created_at) > weekAgo).length,
    needsFollowup: db.activities.filter(a => a.next_action && a.next_action_date).length,
    machines: db.machines.length,
    machinesDeployed: db.machines.filter(m => m.status === 'deployed').length,
    machinesAvailable: db.machines.filter(m => m.status === 'available').length,
    locations: db.locations.length,
    products: db.products.length,
    monthRevenue,
    monthExpenses,
    monthProfit: monthRevenue - monthExpenses,
    pendingRestocks: db.restocks.filter(r => r.status === 'pending' || r.status === 'picking').length,
    // Staff
    staffCount: db.staff.length,
    activeStaff: db.staff.filter(s => s.status === 'active').length,
    weekHours,
    weekLaborCost,
    // Clients
    clientCount: db.clients.length,
    openIssues
  });
});

// ===== IMPORT / RESET =====
app.post('/api/reset', (req, res) => {
  db = { prospects: [], contacts: [], activities: [], machines: [], locations: [], products: [], suppliers: [], finances: [], creditCards: [], restocks: [], aiOfficeRuns: [], staff: [], shifts: [], clients: [], touchpoints: [], issues: [], sales: [], planograms: [], marketingSpend: [], leadSources: [], gbpMetrics: [], nextId: 1 };
  saveDB(db);
  res.json({ success: true });
});

app.post('/api/import', (req, res) => {
  const { prospects } = req.body;
  let imported = 0;
  for (const p of prospects) {
    try {
      let priority = 'normal';
      const notes = ((p.notes || '') + ' ' + (p.kurtis_notes || '')).toLowerCase();
      if (notes.includes('hot lead') || notes.includes('very interested') || notes.includes('eager') || notes.includes('please hook me up')) priority = 'hot';
      else if (notes.includes('will follow') || notes.includes('send proposal')) priority = 'warm';
      let status = 'active';
      if (notes.includes('not interested') || notes.includes('will not approve') || notes.includes('board not interested')) status = 'closed';
      const prospect = { id: nextId(), name: p.name, property_type: p.property_type, units: p.units, address: p.address, phone: p.phone, hours: p.hours, kurtis_notes: p.kurtis_notes || '', notes: p.notes, status, priority, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      db.prospects.push(prospect);
      if (p.contact_name) {
        db.contacts.push({ id: nextId(), prospect_id: prospect.id, name: p.contact_name, role: p.contact_role, email: p.contact_email, phone: p.contact_phone, is_primary: true, created_at: new Date().toISOString() });
      }
      if (p.outreach_status) {
        db.activities.push({ id: nextId(), prospect_id: prospect.id, type: 'outreach', description: p.outreach_status, next_action: p.next_action, created_at: new Date().toISOString() });
      }
      imported++;
    } catch (e) { console.error('Import error:', e.message); }
  }
  saveDB(db);
  res.json({ imported });
});

// ===== GEOCACHE =====
const GEOCACHE_FILE = process.env.DB_PATH ? process.env.DB_PATH.replace('data.json','geocache.json') : '/data/geocache.json';
function loadGeoCache() { try { if (fs.existsSync(GEOCACHE_FILE)) return JSON.parse(fs.readFileSync(GEOCACHE_FILE, 'utf8')); } catch(e) {} return {}; }
function saveGeoCache(cache) { fs.writeFileSync(GEOCACHE_FILE, JSON.stringify(cache)); }
app.get('/api/geocache', (req, res) => res.json(loadGeoCache()));
app.post('/api/geocache', (req, res) => { saveGeoCache(req.body); res.json({ success: true }); });

// ===== STAFF API =====
app.get('/api/staff', (req, res) => {
  res.json(db.staff);
});

app.post('/api/staff', (req, res) => {
  const employee = {
    id: nextId(),
    ...req.body,
    status: req.body.status || 'active',
    availability: req.body.availability || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.staff.push(employee);
  saveDB(db);
  res.json(employee);
});

app.put('/api/staff/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = db.staff.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.staff[idx] = { ...db.staff[idx], ...req.body, updated_at: new Date().toISOString() };
  saveDB(db);
  res.json(db.staff[idx]);
});

app.delete('/api/staff/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.staff = db.staff.filter(s => s.id !== id);
  // Also remove their shifts
  db.shifts = db.shifts.filter(s => s.employee_id !== id);
  saveDB(db);
  res.json({ success: true });
});

// ===== SHIFTS API =====
app.get('/api/shifts', (req, res) => {
  const { employee_id, date_from, date_to } = req.query;
  let records = db.shifts;
  if (employee_id) records = records.filter(s => s.employee_id === parseInt(employee_id));
  if (date_from) records = records.filter(s => s.date >= date_from);
  if (date_to) records = records.filter(s => s.date <= date_to);
  res.json(records.sort((a, b) => new Date(b.date) - new Date(a.date)));
});

app.post('/api/shifts', (req, res) => {
  const shift = {
    id: nextId(),
    ...req.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.shifts.push(shift);
  saveDB(db);
  res.json(shift);
});

app.put('/api/shifts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = db.shifts.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.shifts[idx] = { ...db.shifts[idx], ...req.body, updated_at: new Date().toISOString() };
  saveDB(db);
  res.json(db.shifts[idx]);
});

app.delete('/api/shifts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.shifts = db.shifts.filter(s => s.id !== id);
  saveDB(db);
  res.json({ success: true });
});

// ===== CLIENTS API =====
app.get('/api/clients', (req, res) => {
  res.json(db.clients);
});

app.post('/api/clients', (req, res) => {
  const client = {
    id: nextId(),
    ...req.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.clients.push(client);
  saveDB(db);
  res.json(client);
});

app.put('/api/clients/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = db.clients.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.clients[idx] = { ...db.clients[idx], ...req.body, updated_at: new Date().toISOString() };
  saveDB(db);
  res.json(db.clients[idx]);
});

app.delete('/api/clients/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.clients = db.clients.filter(c => c.id !== id);
  // Also remove associated touchpoints and issues
  db.touchpoints = db.touchpoints.filter(t => t.client_id !== id);
  db.issues = db.issues.filter(i => i.client_id !== id);
  saveDB(db);
  res.json({ success: true });
});

// ===== TOUCHPOINTS API =====
app.get('/api/touchpoints', (req, res) => {
  const { client_id } = req.query;
  let records = db.touchpoints;
  if (client_id) records = records.filter(t => t.client_id === parseInt(client_id));
  res.json(records.sort((a, b) => new Date(b.date) - new Date(a.date)));
});

app.post('/api/touchpoints', (req, res) => {
  const touchpoint = {
    id: nextId(),
    ...req.body,
    created_at: new Date().toISOString()
  };
  db.touchpoints.push(touchpoint);
  saveDB(db);
  res.json(touchpoint);
});

// ===== ISSUES API =====
app.get('/api/issues', (req, res) => {
  const { client_id, status } = req.query;
  let records = db.issues;
  if (client_id) records = records.filter(i => i.client_id === parseInt(client_id));
  if (status) records = records.filter(i => i.status === status);
  res.json(records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

app.post('/api/issues', (req, res) => {
  const issue = {
    id: nextId(),
    ...req.body,
    status: req.body.status || 'open',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.issues.push(issue);
  saveDB(db);
  res.json(issue);
});

app.put('/api/issues/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = db.issues.findIndex(i => i.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.issues[idx] = { ...db.issues[idx], ...req.body, updated_at: new Date().toISOString() };
  saveDB(db);
  res.json(db.issues[idx]);
});

// ===== SALES API =====
app.get('/api/sales', (req, res) => {
  const { machine_id, product_id, from, to } = req.query;
  let records = db.sales || [];
  if (machine_id) records = records.filter(s => s.machine_id === parseInt(machine_id));
  if (product_id) records = records.filter(s => s.product_id === parseInt(product_id));
  if (from) records = records.filter(s => (s.date || s.created_at) >= from);
  if (to) records = records.filter(s => (s.date || s.created_at) <= to);
  res.json(records.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at)));
});

app.post('/api/sales', (req, res) => {
  const sale = {
    id: nextId(),
    product_id: req.body.product_id,
    machine_id: req.body.machine_id || null,
    quantity: req.body.quantity || 1,
    unit_price: req.body.unit_price || 0,
    total: req.body.total || (req.body.unit_price || 0) * (req.body.quantity || 1),
    date: req.body.date || new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  };
  if (!db.sales) db.sales = [];
  db.sales.push(sale);
  saveDB(db);
  res.json(sale);
});

app.delete('/api/sales/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.sales = (db.sales || []).filter(s => s.id !== id);
  saveDB(db);
  res.json({ success: true });
});

// ===== PERFORMANCE API =====
app.get('/api/performance/summary', (req, res) => {
  const { period, machine_id, category } = req.query;
  const now = new Date();
  let fromDate = null;

  if (period === 'week') {
    fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - fromDate.getDay());
    fromDate.setHours(0,0,0,0);
  } else if (period === 'month') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === '30days') {
    fromDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
  }
  // 'all' = no date filter

  let sales = db.sales || [];
  if (fromDate) {
    const fromStr = fromDate.toISOString().split('T')[0];
    sales = sales.filter(s => (s.date || s.created_at?.split('T')[0] || '') >= fromStr);
  }
  if (machine_id) sales = sales.filter(s => s.machine_id === parseInt(machine_id));

  // Calculate weeks for velocity
  let weeks = 1;
  if (sales.length > 0) {
    const dates = sales.map(s => new Date(s.date || s.created_at)).filter(d => !isNaN(d));
    if (dates.length > 0) {
      const earliest = Math.min(...dates);
      const latest = Math.max(...dates);
      weeks = Math.max(1, (latest - earliest) / (7 * 24 * 60 * 60 * 1000));
    }
  }

  // Aggregate by product
  const productMap = {};
  (db.products || []).forEach(p => { productMap[p.id] = p; });

  const productAgg = {};
  sales.forEach(s => {
    const prod = productMap[s.product_id];
    if (!prod) return;
    if (category && prod.category !== category) return;
    if (!productAgg[s.product_id]) {
      productAgg[s.product_id] = {
        product_id: s.product_id,
        name: prod.name,
        category: prod.category || 'Other',
        cost_price: prod.cost_price || 0,
        sell_price: prod.sell_price || 0,
        margin: prod.margin || 0,
        revenue: 0,
        units: 0,
        cost_total: 0
      };
    }
    const qty = s.quantity || 1;
    const price = s.unit_price || prod.sell_price || 0;
    productAgg[s.product_id].revenue += price * qty;
    productAgg[s.product_id].units += qty;
    productAgg[s.product_id].cost_total += (prod.cost_price || 0) * qty;
  });

  // If no sales but products exist and category filter applied, include them with 0s
  if (category) {
    (db.products || []).filter(p => p.category === category).forEach(p => {
      if (!productAgg[p.id]) {
        productAgg[p.id] = {
          product_id: p.id, name: p.name, category: p.category || 'Other',
          cost_price: p.cost_price || 0, sell_price: p.sell_price || 0,
          margin: p.margin || 0, revenue: 0, units: 0, cost_total: 0
        };
      }
    });
  }

  const productList = Object.values(productAgg).map(p => ({
    ...p,
    profit: p.revenue - p.cost_total,
    profit_per_unit: p.units > 0 ? (p.revenue - p.cost_total) / p.units : 0,
    velocity: p.units / weeks
  })).sort((a, b) => b.revenue - a.revenue);

  // Category breakdown
  const categoryBreakdown = {};
  productList.forEach(p => {
    if (!categoryBreakdown[p.category]) categoryBreakdown[p.category] = 0;
    categoryBreakdown[p.category] += p.revenue;
  });

  const totalRevenue = productList.reduce((s, p) => s + p.revenue, 0);
  const totalUnits = productList.reduce((s, p) => s + p.units, 0);
  const totalProfit = productList.reduce((s, p) => s + p.profit, 0);
  const totalVelocity = productList.reduce((s, p) => s + p.velocity, 0);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const swapCount = productList.filter(p => p.velocity < 2 && p.units > 0).length;

  res.json({
    products: productList,
    categoryBreakdown,
    totalRevenue, totalUnits, totalProfit, totalVelocity,
    avgMargin, swapCount, weeks
  });
});

app.get('/api/performance/by-machine/:id', (req, res) => {
  const machineId = parseInt(req.params.id);
  const sales = (db.sales || []).filter(s => s.machine_id === machineId);
  const productMap = {};
  (db.products || []).forEach(p => { productMap[p.id] = p; });

  const productAgg = {};
  sales.forEach(s => {
    const prod = productMap[s.product_id];
    if (!prod) return;
    if (!productAgg[s.product_id]) {
      productAgg[s.product_id] = { product_id: s.product_id, name: prod.name, category: prod.category, revenue: 0, units: 0 };
    }
    productAgg[s.product_id].revenue += (s.unit_price || prod.sell_price || 0) * (s.quantity || 1);
    productAgg[s.product_id].units += s.quantity || 1;
  });

  res.json({
    machine_id: machineId,
    products: Object.values(productAgg).sort((a, b) => b.revenue - a.revenue),
    total_sales: sales.length,
    total_revenue: sales.reduce((s, sl) => s + (sl.total || 0), 0)
  });
});

app.get('/api/performance/recommendations', (req, res) => {
  const sales = db.sales || [];
  const productMap = {};
  (db.products || []).forEach(p => { productMap[p.id] = p; });

  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const recentSales = sales.filter(s => (s.date || '') >= thirtyDaysAgo);

  const productUnits = {};
  recentSales.forEach(s => {
    if (!productUnits[s.product_id]) productUnits[s.product_id] = 0;
    productUnits[s.product_id] += s.quantity || 1;
  });

  const recommendations = (db.products || []).map(p => {
    const units = productUnits[p.id] || 0;
    const velocity = units / 4.3; // ~30 days = 4.3 weeks
    return {
      product_id: p.id, name: p.name, category: p.category,
      velocity, units_30d: units,
      margin: p.margin || 0,
      profit_per_unit: (p.sell_price || 0) - (p.cost_price || 0),
      recommendation: velocity < 2 ? 'consider_replacing' : 'keep',
      reason: velocity < 2
        ? `Only ${velocity.toFixed(1)} units/week — below 2/week threshold`
        : `${velocity.toFixed(1)} units/week — performing well`
    };
  }).sort((a, b) => a.velocity - b.velocity);

  res.json(recommendations);
});

// ===== PLANOGRAMS API =====
app.get('/api/planograms', (req, res) => {
  res.json(db.planograms || []);
});

app.post('/api/planograms', (req, res) => {
  const planogram = {
    id: nextId(),
    name: req.body.name || 'Untitled',
    machine_id: req.body.machine_id || null,
    rows: req.body.rows || 6,
    columns: req.body.columns || 8,
    slots: req.body.slots || [],
    is_template: req.body.is_template || false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  if (!db.planograms) db.planograms = [];
  db.planograms.push(planogram);
  saveDB(db);
  res.json(planogram);
});

app.put('/api/planograms/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = (db.planograms || []).findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.planograms[idx] = {
    ...db.planograms[idx],
    ...req.body,
    updated_at: new Date().toISOString()
  };
  saveDB(db);
  res.json(db.planograms[idx]);
});

app.delete('/api/planograms/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.planograms = (db.planograms || []).filter(p => p.id !== id);
  saveDB(db);
  res.json({ success: true });
});

app.get('/api/planograms/by-machine/:machineId', (req, res) => {
  const machineId = parseInt(req.params.machineId);
  const planogram = (db.planograms || []).find(p => p.machine_id === machineId && !p.is_template);
  if (!planogram) return res.status(404).json({ error: 'No planogram for this machine' });
  res.json(planogram);
});

app.post('/api/planograms/:id/slots', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = (db.planograms || []).findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.planograms[idx].slots = req.body.slots || [];
  db.planograms[idx].updated_at = new Date().toISOString();
  saveDB(db);
  res.json(db.planograms[idx]);
});

// ===== PAGE ROUTES =====
app.get('/crm/map', (req, res) => res.sendFile(path.join(__dirname, 'map.html')));
app.get('/crm', (req, res) => res.sendFile(path.join(__dirname, 'crm.html')));
app.get('/map', (req, res) => res.sendFile(path.join(__dirname, 'map.html')));
app.get('/machines', (req, res) => res.sendFile(path.join(__dirname, 'machines.html')));
app.get('/inventory', (req, res) => res.sendFile(path.join(__dirname, 'inventory.html')));
app.get('/finance', (req, res) => res.sendFile(path.join(__dirname, 'finance.html')));
app.get('/restock', (req, res) => res.sendFile(path.join(__dirname, 'restock.html')));
app.get('/staff', (req, res) => res.sendFile(path.join(__dirname, 'staff.html')));
app.get('/clients', (req, res) => res.sendFile(path.join(__dirname, 'clients.html')));
app.get('/ai-office', (req, res) => res.sendFile(path.join(__dirname, 'ai-office.html')));
app.get('/kanban', (req, res) => res.sendFile(path.join(__dirname, 'kanban.html')));
app.get('/performance', (req, res) => res.sendFile(path.join(__dirname, 'performance.html')));
app.get('/planogram', (req, res) => res.sendFile(path.join(__dirname, 'planogram.html')));

app.listen(PORT, () => {
  console.log(`🤖 Kande VendTech Dashboard running at http://localhost:${PORT}`);
});
