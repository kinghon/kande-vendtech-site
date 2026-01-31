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
  return { prospects: [], contacts: [], activities: [], nextId: 1 };
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

let db = loadDB();

app.use(express.json());

// Root route BEFORE static so sales subdomain gets CRM
app.get('/', (req, res) => {
  if (req.hostname.startsWith('sales')) {
    res.sendFile(path.join(__dirname, 'crm.html'));
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.use(express.static(__dirname, { index: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Playbook API
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

// SEO Rankings API
const SEO_FILE = fs.existsSync('/data/seo.json') ? '/data/seo.json' : path.join(__dirname, 'data', 'seo.json');

function loadSEO() {
  try {
    if (fs.existsSync(SEO_FILE)) return JSON.parse(fs.readFileSync(SEO_FILE, 'utf8'));
  } catch (e) {}
  return {
    keywords: [
      'vending machines las vegas',
      'smart vending las vegas',
      'vending machine service las vegas',
      'AI vending machines las vegas',
      'vending machine rental las vegas',
      'office vending machine las vegas',
      'apartment vending machine las vegas',
      'free vending machine las vegas',
      'vending machine company las vegas',
      'micro market las vegas',
      'kande vendtech',
      'smart vending solutions nevada'
    ],
    history: []
  };
}

function saveSEO(data) {
  const dir = path.dirname(SEO_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SEO_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/seo', (req, res) => {
  res.json(loadSEO());
});

app.post('/api/seo/check', (req, res) => {
  const data = loadSEO();
  const entry = {
    date: new Date().toISOString(),
    rankings: req.body.rankings || {},
    pageSpeed: req.body.pageSpeed || null,
    indexedPages: req.body.indexedPages || null,
    onPage: req.body.onPage || null,
    competitors: req.body.competitors || null
  };
  data.history.push(entry);
  // Keep last 52 weeks
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

app.put('/api/playbook', (req, res) => {
  try {
    const dir = path.dirname(PLAYBOOK_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PLAYBOOK_FILE, req.body.content);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Helper to get next ID
function nextId() {
  return db.nextId++;
}

// API Routes

// Get all prospects with latest activity
app.get('/api/prospects', (req, res) => {
  const prospects = db.prospects.map(p => {
    const activities = db.activities.filter(a => a.prospect_id === p.id);
    const contacts = db.contacts.filter(c => c.prospect_id === p.id);
    const lastActivity = activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    const primaryContact = contacts.find(c => c.is_primary) || contacts[0];
    
    return {
      ...p,
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

// Get single prospect with contacts and activities
app.get('/api/prospects/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const prospect = db.prospects.find(p => p.id === id);
  if (!prospect) return res.status(404).json({ error: 'Not found' });
  
  const contacts = db.contacts.filter(c => c.prospect_id === id);
  const activities = db.activities
    .filter(a => a.prospect_id === id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  res.json({ ...prospect, contacts, activities });
});

// Create prospect
app.post('/api/prospects', (req, res) => {
  const prospect = {
    id: nextId(),
    ...req.body,
    status: req.body.status || 'new',
    priority: req.body.priority || 'normal',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.prospects.push(prospect);
  saveDB(db);
  res.json(prospect);
});

// Update prospect
app.put('/api/prospects/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = db.prospects.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  
  db.prospects[index] = {
    ...db.prospects[index],
    ...req.body,
    updated_at: new Date().toISOString()
  };
  saveDB(db);
  res.json(db.prospects[index]);
});

// Delete prospect
app.delete('/api/prospects/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.prospects = db.prospects.filter(p => p.id !== id);
  db.contacts = db.contacts.filter(c => c.prospect_id !== id);
  db.activities = db.activities.filter(a => a.prospect_id !== id);
  saveDB(db);
  res.json({ success: true });
});

// Add contact
app.post('/api/prospects/:id/contacts', (req, res) => {
  const prospect_id = parseInt(req.params.id);
  
  if (req.body.is_primary) {
    db.contacts.forEach(c => {
      if (c.prospect_id === prospect_id) c.is_primary = false;
    });
  }
  
  const contact = {
    id: nextId(),
    prospect_id,
    ...req.body,
    is_primary: req.body.is_primary || false,
    created_at: new Date().toISOString()
  };
  db.contacts.push(contact);
  saveDB(db);
  res.json(contact);
});

// Log activity
app.post('/api/prospects/:id/activities', (req, res) => {
  const prospect_id = parseInt(req.params.id);
  
  const activity = {
    id: nextId(),
    prospect_id,
    ...req.body,
    created_at: new Date().toISOString()
  };
  db.activities.push(activity);
  
  // Update prospect based on outcome
  const prospect = db.prospects.find(p => p.id === prospect_id);
  if (prospect) {
    if (req.body.outcome === 'interested') {
      prospect.priority = 'hot';
    } else if (req.body.outcome === 'not_interested') {
      prospect.status = 'closed';
    }
    prospect.updated_at = new Date().toISOString();
  }
  
  saveDB(db);
  res.json(activity);
});

// Reset data (for re-imports)
app.post('/api/reset', (req, res) => {
  db = { prospects: [], contacts: [], activities: [], nextId: 1 };
  saveDB(db);
  res.json({ success: true });
});

// Import prospects
app.post('/api/import', (req, res) => {
  const { prospects } = req.body;
  let imported = 0;
  
  for (const p of prospects) {
    try {
      // Determine priority from notes
      let priority = 'normal';
      const notes = ((p.notes || '') + ' ' + (p.kurtis_notes || '')).toLowerCase();
      if (notes.includes('hot lead') || notes.includes('very interested') || notes.includes('eager') || notes.includes('please hook me up')) {
        priority = 'hot';
      } else if (notes.includes('will follow') || notes.includes('send proposal')) {
        priority = 'warm';
      }
      
      // Determine status
      let status = 'active';
      if (notes.includes('not interested') || notes.includes('will not approve') || notes.includes('board not interested')) {
        status = 'closed';
      }
      
      const prospect = {
        id: nextId(),
        name: p.name,
        property_type: p.property_type,
        units: p.units,
        address: p.address,
        phone: p.phone,
        hours: p.hours,
        kurtis_notes: p.kurtis_notes || '',
        notes: p.notes,
        status,
        priority,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.prospects.push(prospect);
      
      // Add contact if exists
      if (p.contact_name) {
        db.contacts.push({
          id: nextId(),
          prospect_id: prospect.id,
          name: p.contact_name,
          role: p.contact_role,
          email: p.contact_email,
          phone: p.contact_phone,
          is_primary: true,
          created_at: new Date().toISOString()
        });
      }
      
      // Add initial activity if there's outreach status
      if (p.outreach_status) {
        db.activities.push({
          id: nextId(),
          prospect_id: prospect.id,
          type: 'outreach',
          description: p.outreach_status,
          next_action: p.next_action,
          created_at: new Date().toISOString()
        });
      }
      
      imported++;
    } catch (e) {
      console.error('Import error:', e.message);
    }
  }
  
  saveDB(db);
  res.json({ imported });
});

// Geocache - store lat/lng so we don't re-geocode
const GEOCACHE_FILE = process.env.DB_PATH ? process.env.DB_PATH.replace('data.json','geocache.json') : '/data/geocache.json';
function loadGeoCache() {
  try {
    if (fs.existsSync(GEOCACHE_FILE)) return JSON.parse(fs.readFileSync(GEOCACHE_FILE, 'utf8'));
  } catch(e) {}
  return {};
}
function saveGeoCache(cache) {
  fs.writeFileSync(GEOCACHE_FILE, JSON.stringify(cache));
}

app.get('/api/geocache', (req, res) => {
  res.json(loadGeoCache());
});

app.post('/api/geocache', (req, res) => {
  saveGeoCache(req.body);
  res.json({ success: true });
});

// Serve map
app.get('/crm/map', (req, res) => {
  res.sendFile(path.join(__dirname, 'map.html'));
});

// Dashboard stats
app.get('/api/stats', (req, res) => {
  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  
  const stats = {
    total: db.prospects.length,
    hot: db.prospects.filter(p => p.priority === 'hot').length,
    active: db.prospects.filter(p => p.status === 'active' || p.status === 'new').length,
    closed: db.prospects.filter(p => p.status === 'closed').length,
    thisWeek: db.activities.filter(a => new Date(a.created_at) > weekAgo).length,
    needsFollowup: db.activities.filter(a => a.next_action && a.next_action_date).length
  };
  res.json(stats);
});

// Serve CRM app
app.get('/crm', (req, res) => {
  res.sendFile(path.join(__dirname, 'crm.html'));
});

// Serve map
app.get('/map', (req, res) => {
  res.sendFile(path.join(__dirname, 'map.html'));
});

app.listen(PORT, () => {
  console.log(`🤖 Kande VendTech Dashboard running at http://localhost:${PORT}`);
});
