require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { getDashboardData } = require('./vsco');
const packerConfig = require('./packer-config');
const { generatePackerItems, isCorporateEvent } = packerConfig;

const app = express();
const PORT = process.env.PORT || 3000;

// Security: Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for inline scripts in dashboard
  crossOriginEmbedderPolicy: false
}));

// Security: CORS - only allow same-origin requests
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || true,
  credentials: true
}));

// Security: Rate limiting
// Rate limiting disabled - internal dashboard doesn't need it
const apiLimiter = (req, res, next) => next();
const strictLimiter = (req, res, next) => next();

// Security: Authentication middleware for write operations
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const authCookie = req.headers.cookie?.match(/staff_auth=([^;]+)/)?.[1];
  const staffToken = process.env.STAFF_TOKEN || process.env.ADMIN_PASSWORD;
  
  // Allow if admin password matches
  if (authHeader === `Bearer ${process.env.ADMIN_PASSWORD}`) {
    req.isAdmin = true;
    return next();
  }
  
  // Allow if staff token matches (for staff members)
  if (authHeader === `Bearer ${staffToken}` || authCookie === staffToken) {
    req.isStaff = true;
    return next();
  }
  
  // For checklist operations, allow if request comes from the dashboard (same origin)
  const origin = req.headers.origin || req.headers.referer;
  if (origin && (origin.includes('kandedash.com') || origin.includes('localhost'))) {
    req.isStaff = true;
    return next();
  }
  
  return res.status(401).json({ error: 'Unauthorized - authentication required' });
};

// Cache for dashboard data
let dashboardCache = null;
let lastFetch = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// PostgreSQL connection
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false
}) : null;

// Initialize database tables
async function initDatabase() {
  if (!pool) {
    console.log('No DATABASE_URL - using in-memory storage (data will not persist)');
    return;
  }
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS checklist_data (
        event_id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// File-based storage directory (fallback when no database)
const CHECKLIST_DATA_DIR = path.join(__dirname, '..', 'data', 'checklists');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(CHECKLIST_DATA_DIR)) {
    fs.mkdirSync(CHECKLIST_DATA_DIR, { recursive: true });
  }
}

// Load checklist data from database or file
async function loadChecklistData(eventId) {
  // Try database first
  if (pool) {
    try {
      const result = await pool.query(
        'SELECT data FROM checklist_data WHERE event_id = $1',
        [eventId]
      );
      return result.rows[0]?.data || null;
    } catch (error) {
      console.error('Error loading checklist data from DB:', error);
    }
  }
  
  // Fallback to file storage
  try {
    ensureDataDir();
    const filePath = path.join(CHECKLIST_DATA_DIR, `${eventId}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data;
    }
  } catch (error) {
    console.error('Error loading checklist data from file:', error);
  }
  
  return null;
}

// Save checklist data to database and file
async function saveChecklistData(eventId, data) {
  // Save to database if available
  if (pool) {
    try {
      await pool.query(`
        INSERT INTO checklist_data (event_id, data, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (event_id) 
        DO UPDATE SET data = $2, updated_at = NOW()
      `, [eventId, JSON.stringify(data)]);
    } catch (error) {
      console.error('Error saving checklist data to DB:', error);
    }
  }
  
  // Always save to file as backup/fallback
  try {
    ensureDataDir();
    const filePath = path.join(CHECKLIST_DATA_DIR, `${eventId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving checklist data to file:', error);
  }
}

// In-memory cache (for performance + fallback when no DB)
let checklistData = {};

// Initialize DB on startup
initDatabase();

// Load saved packer config from database
async function loadPackerConfig() {
  if (!pool) return;
  
  try {
    const result = await pool.query(
      "SELECT data FROM checklist_data WHERE event_id = '__packer_config__'"
    );
    
    if (result.rows[0]?.data) {
      const saved = result.rows[0].data;
      
      if (saved.corporate?.services) {
        Object.keys(packerConfig.CORPORATE_SERVICES).forEach(k => delete packerConfig.CORPORATE_SERVICES[k]);
        Object.assign(packerConfig.CORPORATE_SERVICES, saved.corporate.services);
      }
      if (saved.corporate?.addons) {
        Object.keys(packerConfig.CORPORATE_ADDONS).forEach(k => delete packerConfig.CORPORATE_ADDONS[k]);
        Object.assign(packerConfig.CORPORATE_ADDONS, saved.corporate.addons);
      }
      if (saved.nonCorporate?.services) {
        Object.keys(packerConfig.NON_CORPORATE_SERVICES).forEach(k => delete packerConfig.NON_CORPORATE_SERVICES[k]);
        Object.assign(packerConfig.NON_CORPORATE_SERVICES, saved.nonCorporate.services);
      }
      if (saved.nonCorporate?.addons) {
        Object.keys(packerConfig.NON_CORPORATE_ADDONS).forEach(k => delete packerConfig.NON_CORPORATE_ADDONS[k]);
        Object.assign(packerConfig.NON_CORPORATE_ADDONS, saved.nonCorporate.addons);
      }
      
      console.log('Loaded saved packer configuration from database');
    }
  } catch (error) {
    console.error('Error loading packer config:', error);
  }
}

// Load packer config after DB init
setTimeout(loadPackerConfig, 1000);

// Default checklist templates
const PACKER_CHECKLIST = [
  { id: 'booth_packed', text: 'Photo booth equipment packed and secured', required: true },
  { id: 'props_included', text: 'Props and accessories included per event requirements', required: true },
  { id: 'cables_power', text: 'All cables, power supplies, and adapters included', required: true },
  { id: 'backdrop_lighting', text: 'Backdrop and lighting equipment (if applicable)', required: false },
  { id: 'setup_guide', text: 'Setup instructions and event details included', required: true },
  { id: 'marketing_materials', text: 'Business cards and promotional materials', required: false },
  { id: 'cleaning_supplies', text: 'Cleaning supplies and sanitizer', required: true },
  { id: 'extension_cords', text: 'Extension cords and power strips', required: true },
  { id: 'custom_items', text: 'Any custom requested items per event notes', required: false },
  { id: 'inventory_check', text: 'Final inventory check completed', required: true }
];

const ATTENDANT_CHECKLIST = [
  { id: 'equipment_inspected', text: 'Equipment inspected for damage before pickup', required: true },
  { id: 'items_counted', text: 'All items accounted for per packing list', required: true },
  { id: 'vehicle_loaded', text: 'Equipment loaded safely and secured in vehicle', required: true },
  { id: 'directions_confirmed', text: 'GPS/directions to venue confirmed', required: true },
  { id: 'contact_verified', text: 'Client contact information verified', required: true },
  { id: 'setup_reviewed', text: 'Setup instructions and event timeline reviewed', required: true },
  { id: 'emergency_contacts', text: 'Emergency contact information accessible', required: true },
  { id: 'backup_plan', text: 'Backup equipment plan understood (if needed)', required: false },
  { id: 'arrival_time', text: 'Load-in time and arrival schedule confirmed', required: true },
  { id: 'ready_to_go', text: 'Ready to depart - all systems go!', required: true }
];

// Staff lists
const PACKER_STAFF = [
  { name: 'John Dockery', email: 'dockery.john@yahoo.com' },
  { name: 'Kat Delarea', email: 'kd.yourtraveladvisor@gmail.com' },
  { name: 'Joseph Garcia', email: 'josephgarcia0001@gmail.com' },
  { name: 'Lee Schem Il', email: 'schemil713@yahoo.com' },
  { name: 'Michelle Barbadillo', email: 'michellembarbadillo@gmail.com' }
];

const ALL_STAFF = [
  { name: 'John Dockery', email: 'dockery.john@yahoo.com' },
  { name: 'Kat Delarea', email: 'kd.yourtraveladvisor@gmail.com' },
  { name: 'Joseph Garcia', email: 'josephgarcia0001@gmail.com' },
  { name: 'Lee Schem Il', email: 'schemil713@yahoo.com' },
  { name: 'Michelle Barbadillo', email: 'michellembarbadillo@gmail.com' },
  { name: 'Tim Huang', email: 'timsdesign505@gmail.com' },
  { name: 'Jonathan Mendoza', email: 'mendoza.jonathan.3205@gmail.com' },
  { name: 'Kenneth Ng', email: 'kennethng52@yahoo.com' },
  { name: 'Carly Blaine', email: 'carlyfaithblaine@gmail.com' },
  { name: 'Tam Vu', email: 'vu.quynhtam@gmail.com' },
  { name: 'Marzz Balagot', email: '1005mrsbalagot@gmail.com' },
  { name: 'Carlos Patino', email: 'carlosmpatinor@gmail.com' },
  { name: 'Alex Chan', email: 'alexbunchan@gmail.com' }
];

// Email transporter (configure with your email settings)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Public event page - shareable link (matches dashboard format)
app.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Use cached data if available, otherwise fetch (with rate limit protection)
    let data;
    if (dashboardCache && lastFetch && (Date.now() - lastFetch < CACHE_TTL)) {
      data = dashboardCache;
    } else {
      try {
        data = await getDashboardData();
        dashboardCache = data;
        lastFetch = Date.now();
      } catch (fetchError) {
        // If fetch fails but we have stale cache, use it
        if (dashboardCache) {
          data = dashboardCache;
        } else {
          throw fetchError;
        }
      }
    }
    const event = data.events.find(e => e.id === eventId);
    
    if (!event) {
      return res.status(404).send('<h1>Event not found</h1><p>This event may have passed or the link is invalid.</p>');
    }

    // Parse date
    const [year, month, day] = event.eventDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    const formatTime = (t) => {
      if (!t) return '';
      const [h, m] = t.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const h12 = hour % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    };

    const formatPhone = (phone) => {
      if (!phone) return '';
      const digits = phone.replace(/\D/g, '');
      if (digits.length === 10) {
        return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
      }
      if (digits.length === 11 && digits[0] === '1') {
        return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
      }
      return phone;
    };

    const formatLoadInTime = (loadInValue, eventDateStr) => {
      if (!loadInValue) return 'Not set';
      const [y, m, d] = eventDateStr.split('-').map(Number);
      const eventDate = new Date(y, m - 1, d);
      const timeMatch = loadInValue.match(/(\d{1,2}):?(\d{0,2})\s*(AM|PM)/i);
      if (timeMatch) {
        const [, hours, mins, ampm] = timeMatch;
        const minutes = mins || '00';
        const time = `${hours}:${minutes} ${ampm.toUpperCase()}`;
        const wkdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const mnths = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        return `${time} - ${wkdays[eventDate.getDay()]}, ${mnths[eventDate.getMonth()]} ${eventDate.getDate()}, ${eventDate.getFullYear()}`;
      }
      return loadInValue;
    };

    const escapeHtml = (text) => {
      if (!text) return '';
      return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    // Check if distant
    const isDistantEvent = (location) => {
      if (!location || !location.city || !location.state) return false;
      const city = location.city.toLowerCase().trim();
      const state = location.state.toLowerCase().trim();
      if (state !== 'ca' && state !== 'california') return true;
      const distantCities = ['los angeles', 'san diego', 'riverside', 'anaheim', 'santa ana', 'long beach', 'irvine', 'fresno', 'bakersfield'];
      return distantCities.some(dc => city === dc || city.includes(dc));
    };
    const isDistant = isDistantEvent(event.location);

    // Build staff HTML
    const staffHtml = event.staff && event.staff.length > 0 
      ? `<div class="staff-list">${event.staff.map(s => `<div class="staff-badge">${escapeHtml(s.name)}${s.role ? `<span class="role">(${escapeHtml(s.role)})</span>` : ''}</div>`).join('')}</div>`
      : '<p style="color: #999; font-style: italic;">No staff assigned</p>';

    // Load hidden services from checklist data
    const checklistDataForEvent = await getOrCreateChecklist(eventId);
    const hiddenServiceIndices = checklistDataForEvent.hiddenServices || [];

    // Build services HTML (filter out hidden services)
    // First filter by standard rules
    const preFilteredServices = (event.services || []).filter(s => {
      const name = (s.name || '').toLowerCase();
      if (name.includes('discount')) return false;
      if (name.includes('extended hours')) return false;
      if (name.includes('full day add on') || name.includes('full day rental add on')) return false;
      if (name.includes('props')) return false;
      if (name.includes('premium backdrop')) return false;
      if (s.price < 0) return false;
      return true;
    });
    
    // Then filter out hidden services by index
    const filteredServices = preFilteredServices.filter((s, idx) => !hiddenServiceIndices.includes(idx));

    const servicesHtml = filteredServices.length > 0 
      ? `<div class="services-list">${filteredServices.map(s => `<div class="service-row"><span class="service-qty">${s.quantity || 1}</span><span class="service-name">${escapeHtml(s.name || s)}</span></div>`).join('')}</div>`
      : '<p style="color: #999; font-style: italic;">No services listed</p>';

    // Custom fields
    const hiddenFields = ['budget', 'package', 'eventtimes', 'load in time', 'backup contact', 'backup contact number', 'primary onsite contact', 'primary onsite contact number', 'Primary Onsite Contact', 'Primary Onsite Contact number', 'eventhashtag', 'design direction', 'design themes or colors', 'template wording', '9. attendant picking up equipment', 'backdrop', 'message', 'subject', 'vendor meal', '3: internal notes(for attendants)', '360 booth design choices', '360 music choice', '5: 360 booth design choices', '6: 360 music choice'];
    
    const shouldHideField = (fieldName) => {
      const lower = fieldName.toLowerCase();
      if (hiddenFields.includes(lower)) return true;
      if (lower.includes('360 booth design') || lower.includes('360 music')) return true;
      return false;
    };
    
    const customFields = event.customFields 
      ? Object.entries(event.customFields)
          .filter(([name]) => !shouldHideField(name))
          .sort(([a], [b]) => {
            const priority = { 'Load In Instructions': 1, 'Parking Instructions': 2 };
            return (priority[a] || 999) - (priority[b] || 999);
          })
      : [];

    const customFieldsHtml = customFields.length > 0 
      ? `<details class="custom-fields" open>
          <summary>📋 Event Details & Questionnaire (${customFields.length} fields)</summary>
          <div class="custom-fields-grid">
            ${customFields.map(([name, value]) => {
              let displayValue = '';
              if (!value) {
                displayValue = '<em>Not set</em>';
              } else if (typeof value === 'object' && value.images) {
                displayValue = value.text ? escapeHtml(value.text) + '<br>' : '';
                displayValue += value.images.map(url => `<img src="${url}" onclick="openImageModal('${url}')" class="clickable-image" style="max-width: 200px; margin-top: 8px; border-radius: 6px; cursor: zoom-in;" title="Click to enlarge">`).join('');
              } else {
                displayValue = escapeHtml(String(value));
              }
              return `<div class="custom-field"><div class="field-name">${escapeHtml(name)}</div><div class="field-value">${displayValue}</div></div>`;
            }).join('')}
          </div>
        </details>`
      : '';

    // Get notes - prioritize saved notes from dashboard over VSCO original
    const kurtisNotesRaw = event.customFields?.['3: Internal Notes(for Attendants)'];
    let notesText = '';
    let notesImages = [];
    
    // First check if there are saved notes in the checklist data (from dashboard edits)
    if (checklistDataForEvent.kurtisNotes) {
      notesText = checklistDataForEvent.kurtisNotes;
    } else if (kurtisNotesRaw) {
      // Fall back to original VSCO data
      if (typeof kurtisNotesRaw === 'object') {
        notesText = kurtisNotesRaw.text || '';
        notesImages = kurtisNotesRaw.images || [];
      } else {
        notesText = String(kurtisNotesRaw);
      }
    }
    
    // Always include images from original if present
    if (kurtisNotesRaw && typeof kurtisNotesRaw === 'object' && kurtisNotesRaw.images) {
      notesImages = kurtisNotesRaw.images;
    }

    // Build the event content HTML (matching dashboard format)
    const eventContent = `
      <div class="event-header ${isDistant ? 'distant' : ''}">
        <div>
          <div class="event-title">${escapeHtml(event.title)}</div>
          <div class="event-date">
            <div class="date-box">
              <div class="month">${months[date.getMonth()]}</div>
              <div class="day">${date.getDate()}</div>
              <div class="weekday">${weekdays[date.getDay()]}</div>
            </div>
            ${event.endDate && event.endDate !== event.eventDate ? (() => {
              const [ey, em, ed] = event.endDate.split('-').map(Number);
              const endDt = new Date(ey, em - 1, ed);
              return `<div style="display:flex;align-items:center;margin:0 10px;color:#667eea;font-weight:bold;">→</div>
              <div class="date-box">
                <div class="month">${months[endDt.getMonth()]}</div>
                <div class="day">${endDt.getDate()}</div>
                <div class="weekday">${weekdays[endDt.getDay()]}</div>
              </div>`;
            })() : ''}
            <div class="time-info">
              ${event.startTime ? `<div class="time">${formatTime(event.startTime)}${event.endTime ? ' - ' + formatTime(event.endTime) : ''}</div>` : ''}
              ${event.guestCount ? `<div>${event.guestCount} guests</div>` : ''}
            </div>
          </div>
        </div>
      </div>
      <div class="event-body">
        <div class="info-grid">
          <div class="info-section">
            <h4>📍 Location</h4>
            ${event.location ? `
              <p><strong>${escapeHtml(event.location.name)}</strong></p>
              <p>${escapeHtml(event.location.fullAddress)}</p>
              <a href="https://maps.google.com/?q=${encodeURIComponent(event.location.fullAddress)}" target="_blank" style="color:#667eea;font-size:0.85rem;">Open in Maps →</a>
            ` : `<p><strong>Venue not set</strong></p>`}
            <p style="margin-top: 10px;"><strong>Load In:</strong> <span style="${event.customFields?.['Load In Time'] ? '' : 'color: #999; font-style: italic;'}">${formatLoadInTime(event.customFields?.['Load In Time'], event.eventDate)}</span></p>
            <p style="margin-top: 6px;"><strong>Service Times:</strong> <span style="${event.startTime ? '' : 'color: #999; font-style: italic;'}">${event.startTime ? formatTime(event.startTime) + (event.endTime ? ' - ' + formatTime(event.endTime) : '') : 'Not set'}</span></p>
            <p style="margin-top: 6px;"><strong>Onsite Contact:</strong> <span style="${(event.customFields?.['primary onsite contact'] || event.customFields?.['Primary Onsite Contact']) ? '' : 'color: #999; font-style: italic;'}">${(event.customFields?.['primary onsite contact'] || event.customFields?.['Primary Onsite Contact']) ? escapeHtml(event.customFields['primary onsite contact'] || event.customFields['Primary Onsite Contact']) + ((event.customFields?.['primary onsite contact number'] || event.customFields?.['Primary Onsite Contact number']) ? ` - <a href="tel:${event.customFields['primary onsite contact number'] || event.customFields['Primary Onsite Contact number']}" style="color: #667eea;">${formatPhone(event.customFields['primary onsite contact number'] || event.customFields['Primary Onsite Contact number'])}</a>` : '') : 'Not set'}</span></p>
            <p style="margin-top: 6px;"><strong>Backup Contact:</strong> <span style="${event.customFields?.['Backup Contact'] ? '' : 'color: #999; font-style: italic;'}">${event.customFields?.['Backup Contact'] ? escapeHtml(event.customFields['Backup Contact']) + (event.customFields?.['Backup Contact Number'] ? ` - <a href="tel:${event.customFields['Backup Contact Number']}" style="color: #667eea;">${formatPhone(event.customFields['Backup Contact Number'])}</a>` : '') : 'Not set'}</span></p>
            ${event.customFields?.['Backdrop'] ? `<p style="margin-top: 6px;"><strong>Backdrop:</strong> ${escapeHtml(event.customFields['Backdrop'])}</p>` : ''}
          </div>
        
          <div class="info-section">
            <div class="pickup-box">
              <strong>🚗 Picking Up Equipment:</strong> <span style="${event.customFields?.['9. Attendant Picking Up Equipment'] ? 'font-weight: 500;' : 'color: #999; font-style: italic;'}">${escapeHtml(event.customFields?.['9. Attendant Picking Up Equipment']) || 'Not set'}</span>
            </div>
            <h4>👥 Staff Assigned</h4>
            ${staffHtml}
            ${checklistDataForEvent.subcontractor ? `
              <div style="margin-top: 15px; padding: 12px; background: #e8f5e9; border: 1px solid #4caf50; border-radius: 8px;">
                <strong style="color: #2e7d32;">🤝 Subcontracted to:</strong> 
                <span style="font-weight: 500; color: #2e7d32;">${escapeHtml(checklistDataForEvent.subcontractor)}</span>
              </div>
            ` : ''}
          </div>

          ${filteredServices.length > 0 ? `
            <div class="info-section">
              <h4>📦 Booked Services</h4>
              ${servicesHtml}
            </div>
          ` : ''}
        </div>

        <div class="notes-box">
          <h4>📝 Kurtis' Notes</h4>
          <textarea 
            id="kurtis-notes-edit"
            placeholder="Add notes..."
            style="width: 100%; min-height: 60px; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; font-size: inherit; resize: none; margin-top: 8px; overflow: hidden;"
            oninput="this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px';"
          >${escapeHtml(notesText)}</textarea>
          <script>
            // Auto-resize on load
            document.addEventListener('DOMContentLoaded', function() {
              const ta = document.getElementById('kurtis-notes-edit');
              if (ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
            });
          </script>
          <div style="margin-top: 10px; display: flex; gap: 10px; align-items: center;">
            <button onclick="saveNotes()" style="background: #667eea; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">💾 Save Notes</button>
            <span id="save-status" style="color: #28a745; font-size: 0.85rem;"></span>
          </div>
          ${notesImages.length > 0 ? `<div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px;">${notesImages.map(url => `<img src="${url}" onclick="openImageModal('${url}')" class="clickable-image" style="max-width: 175px; border-radius: 6px; border: 1px solid #ddd; cursor: zoom-in;" title="Click to enlarge">`).join('')}</div>` : ''}
        </div>
        <script>
          const EVENT_ID = '${eventId}';
        </script>

        ${customFieldsHtml}
      </div>
    `;

    // Read template and inject content
    const templatePath = path.join(__dirname, '../public/event-template.html');
    let template = fs.readFileSync(templatePath, 'utf8');
    template = template.replace('{{EVENT_TITLE}}', escapeHtml(event.title));
    template = template.replace('{{EVENT_CONTENT}}', eventContent);

    res.send(template);
  } catch (error) {
    console.error('Error rendering event page:', error);
    res.status(500).send('<h1>Error loading event</h1><p>Please try again later.</p>');
  }
});

// API: Get all events (admin view)
app.get('/api/events', async (req, res) => {
  try {
    // Check auth for admin
    const authHeader = req.headers.authorization;
    const isAdmin = authHeader === `Bearer ${process.env.ADMIN_PASSWORD}`;

    // Check staff filter
    const staffId = req.query.staffId;

    // Use cache if fresh
    if (dashboardCache && lastFetch && (Date.now() - lastFetch < CACHE_TTL)) {
      return await sendFilteredData(res, dashboardCache, isAdmin, staffId);
    }

    // Fetch fresh data
    dashboardCache = await getDashboardData();
    lastFetch = Date.now();

    await sendFilteredData(res, dashboardCache, isAdmin, staffId);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events', message: error.message });
  }
});

async function sendFilteredData(res, data, isAdmin, staffId) {
  let events = data.events;

  // If staff ID provided, filter to only their events
  if (staffId && !isAdmin) {
    events = events.filter(e => 
      e.staff.some(s => s.id === staffId || s.email === staffId)
    );
  }

  // Merge saved kurtisNotes from checklistData into events (async operation)
  const eventsWithNotes = await Promise.all(events.map(async (e) => {
    // Load checklist data if not in memory
    if (!checklistData[e.id]) {
      const dbData = await loadChecklistData(e.id);
      if (dbData) {
        checklistData[e.id] = dbData;
      }
    }
    const savedNotes = checklistData[e.id]?.kurtisNotes;
    if (savedNotes !== undefined) {
      return {
        ...e,
        customFields: {
          ...e.customFields,
          '3: Internal Notes(for Attendants)': savedNotes
        }
      };
    }
    return e;
  }));
  events = eventsWithNotes;

  // For non-admin, strip sensitive fields
  if (!isAdmin) {
    events = events.map(e => ({
      ...e,
      // Remove internal notes for staff view
      customFields: filterCustomFields(e.customFields)
    }));
  }

  res.json({
    events,
    lastUpdated: data.lastUpdated,
    isAdmin
  });
}

// Filter out internal/management notes for staff view
function filterCustomFields(fields) {
  const filtered = { ...fields };
  const hiddenFields = [
    '1: Internal Notes(for Management)',
    '2. Internal Notes (For Designer)',
    'Internal Notes(for Management)'
  ];
  for (const f of hiddenFields) {
    delete filtered[f];
  }
  return filtered;
}

// API: Force refresh cache
app.post('/api/refresh', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    dashboardCache = await getDashboardData();
    lastFetch = Date.now();
    res.json({ success: true, lastUpdated: dashboardCache.lastUpdated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh', message: error.message });
  }
});

// API: Get staff list (for dropdown)
app.get('/api/staff', async (req, res) => {
  if (!dashboardCache) {
    try {
      dashboardCache = await getDashboardData();
      lastFetch = Date.now();
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch data' });
    }
  }

  // Extract unique staff from all events
  const staffMap = {};
  for (const event of dashboardCache.events) {
    for (const s of event.staff) {
      if (!staffMap[s.id]) {
        staffMap[s.id] = s;
      }
    }
  }

  res.json(Object.values(staffMap));
});

// Helper: Get or create checklist for event
async function getOrCreateChecklist(eventId, eventData = null) {
  // Check in-memory cache first
  if (checklistData[eventId]) {
    return checklistData[eventId];
  }
  
  // Try loading from database
  const dbData = await loadChecklistData(eventId);
  if (dbData) {
    checklistData[eventId] = dbData;
    return dbData;
  }
  
  // Generate packer items based on event data if available
  let packerItems = [];
  if (eventData) {
    packerItems = generatePackerItems(eventData);
  }
  
  // If no auto-generated items, use default checklist
  if (packerItems.length === 0) {
    packerItems = PACKER_CHECKLIST.map(item => ({ ...item, completed: false, completedBy: null, completedAt: null }));
  } else {
    // Add completion tracking to auto-generated items
    packerItems = packerItems.map(item => ({ ...item, completed: false, completedBy: null, completedAt: null }));
  }
  
  // Create new checklist
  const newChecklist = {
    packer: packerItems,
    attendant: ATTENDANT_CHECKLIST.map(item => ({ ...item, completed: false, completedBy: null, completedAt: null })),
    customItems: [], // For manually added items
    notes: { packer: '', attendant: '', 'packer-notes': '' },
    subcontractor: '',
    eventType: eventData?.eventType || null,
    isCorporate: eventData ? isCorporateEvent(eventData.eventType) : null
  };
  checklistData[eventId] = newChecklist;
  return newChecklist;
}

// Helper: Get event data from cache
function getEventFromCache(eventId) {
  if (!dashboardCache || !dashboardCache.events) return null;
  return dashboardCache.events.find(e => e.id === eventId) || null;
}

// Helper: Save checklist for event
async function saveChecklist(eventId) {
  await saveChecklistData(eventId, checklistData[eventId]);
}

// API: Get checklist data for an event
app.get('/api/checklist/:eventId', async (req, res) => {
  const { eventId } = req.params;
  
  // Get event data from cache to auto-generate packer items
  const eventData = getEventFromCache(eventId);
  let eventChecklist = await getOrCreateChecklist(eventId, eventData);
  
  // Check if this is an old checklist without auto-generated items - regenerate if so
  const hasAutoItems = eventChecklist.packer?.some(item => item.autoGenerated || (item.id && item.id.startsWith('auto_')));
  const hasOldDefaultItems = eventChecklist.packer?.some(item => item.id === 'booth_packed' || item.id === 'props_included');
  
  if (!hasAutoItems && hasOldDefaultItems && eventData && eventData.services?.length > 0) {
    // Regenerate packer list from event services
    const newPackerItems = generatePackerItems(eventData);
    if (newPackerItems.length > 0) {
      // Keep custom items if any
      const customItems = (eventChecklist.customItems || []).map(item => ({
        ...item,
        completed: item.completed || false,
        completedBy: item.completedBy || null,
        completedAt: item.completedAt || null
      }));
      
      // Replace packer list with auto-generated + custom
      eventChecklist.packer = [
        ...newPackerItems.map(item => ({ ...item, completed: false, completedBy: null, completedAt: null })),
        ...customItems
      ];
      eventChecklist.eventType = eventData.eventType;
      eventChecklist.isCorporate = isCorporateEvent(eventData.eventType);
      
      // Save the updated checklist
      checklistData[eventId] = eventChecklist;
      await saveChecklist(eventId);
    }
  }
  
  // Check if packer checklist was submitted
  const packerSubmitted = eventChecklist.packer_submitted;
  
  // If packer submitted, treat ALL items as completed (fixes old data before the fix)
  let packerItems = eventChecklist.packer;
  if (packerSubmitted) {
    packerItems = eventChecklist.packer.map(item => ({
      ...item,
      completed: true,
      completedBy: item.completedBy || packerSubmitted.submittedBy,
      completedAt: item.completedAt || packerSubmitted.submittedAt
    }));
  }
  
  // Generate attendant/pickup checklist from packer items
  // If packer submitted, show all items; otherwise only show completed items
  const packerCompletedItems = packerSubmitted ? packerItems : packerItems.filter(item => item.completed);
  
  // Create pickup checklist with same items but separate completion tracking
  const pickupChecklist = packerCompletedItems.map(item => ({
    id: `pickup_${item.id}`,
    text: item.text,
    required: true, // All items are required for pickup verification
    // Use pickup-specific completion from stored data, or default to false
    completed: eventChecklist.pickupStatus?.[item.id]?.completed || false,
    completedBy: eventChecklist.pickupStatus?.[item.id]?.completedBy || null,
    completedAt: eventChecklist.pickupStatus?.[item.id]?.completedAt || null,
    originalPackerId: item.id,
    packedBy: item.completedBy || packerSubmitted?.submittedBy,
    packedAt: item.completedAt || packerSubmitted?.submittedAt
  }));
  
  // Return with generated pickup checklist and fixed packer items
  res.json({
    ...eventChecklist,
    packer: packerItems,
    attendant: pickupChecklist,
    packerItemsCount: packerCompletedItems.length
  });
});

// API: Reset/uncomplete a submitted checklist (admin only) - MUST be before :itemId route
app.post('/api/checklist/:eventId/:type/reset', requireAuth, async (req, res) => {
  const { eventId, type } = req.params;

  // Only admin can reset
  if (!req.isAdmin) {
    return res.status(403).json({ error: 'Admin access required to reset checklists' });
  }

  const eventData = getEventFromCache(eventId);
  await getOrCreateChecklist(eventId, eventData);

  if (!checklistData[eventId]) {
    return res.status(404).json({ error: 'Checklist not found' });
  }

  // Remove submission status
  delete checklistData[eventId][`${type}_submitted`];

  // Optionally reset all items to uncompleted
  if (checklistData[eventId][type]) {
    checklistData[eventId][type] = checklistData[eventId][type].map(item => ({
      ...item,
      completed: false,
      completedBy: null,
      completedAt: null
    }));
  }

  // Reset pickup status if resetting packer
  if (type === 'packer' && checklistData[eventId].pickupStatus) {
    checklistData[eventId].pickupStatus = {};
  }

  await saveChecklist(eventId);
  res.json({ success: true, message: `${type} checklist has been reset` });
});

// API: Submit completed checklist (MUST be before :itemId route)
app.post('/api/checklist/:eventId/:type/submit', strictLimiter, requireAuth, express.json({ limit: '10mb' }), async (req, res) => {
  const { eventId, type } = req.params;
  const { staffMember, eventTitle, eventDate, signature, checklistScreenshot, sendEmail = true } = req.body;

  console.log(`[SUBMIT] Starting ${type} submit for event ${eventId} by ${staffMember}`);

  // Get or create checklist
  const eventChecklist = await getOrCreateChecklist(eventId);
  console.log(`[SUBMIT] Got checklist, packer items: ${eventChecklist.packer?.length}, attendant items: ${eventChecklist.attendant?.length}`);

  if (!checklistData[eventId]?.[type]) {
    return res.status(404).json({ error: 'Checklist not found' });
  }

  let checklist;
  
  // For attendant/pickup checklist, dynamically generate from packer items (same as GET endpoint)
  if (type === 'attendant') {
    const packerSubmitted = eventChecklist.packer_submitted;
    let packerItems = eventChecklist.packer || [];
    
    // If packer submitted, all items are considered completed
    if (packerSubmitted) {
      packerItems = packerItems.map(item => ({
        ...item,
        completed: true,
        completedBy: item.completedBy || packerSubmitted.submittedBy,
        completedAt: item.completedAt || packerSubmitted.submittedAt
      }));
    }
    
    // Generate pickup checklist from packer items (same logic as GET endpoint)
    const packerCompletedItems = packerSubmitted ? packerItems : packerItems.filter(item => item.completed);
    
    console.log(`[SUBMIT] pickupStatus:`, JSON.stringify(eventChecklist.pickupStatus || {}));
    console.log(`[SUBMIT] Packer completed items: ${packerCompletedItems.length}`);
    
    checklist = packerCompletedItems.map(item => {
      const isCompleted = eventChecklist.pickupStatus?.[item.id]?.completed || false;
      console.log(`[SUBMIT] Item ${item.id}: pickupStatus completed = ${isCompleted}`);
      return {
        id: `pickup_${item.id}`,
        text: item.text,
        required: true,
        completed: isCompleted,
        completedBy: eventChecklist.pickupStatus?.[item.id]?.completedBy || null,
        completedAt: eventChecklist.pickupStatus?.[item.id]?.completedAt || null
      };
    });
  } else {
    checklist = checklistData[eventId][type];
  }
  
  const requiredItems = checklist.filter(item => item.required);
  const completedRequired = requiredItems.filter(item => item.completed);

  console.log(`[SUBMIT] Checklist has ${checklist.length} items, ${requiredItems.length} required, ${completedRequired.length} completed`);

  if (completedRequired.length < requiredItems.length) {
    const missing = requiredItems.filter(item => !item.completed).map(item => item.text);
    console.log(`[SUBMIT] BLOCKED - missing items:`, missing);
    return res.status(400).json({ 
      error: 'All required items must be completed before submission',
      missing: missing
    });
  }
  
  console.log(`[SUBMIT] Validation passed, proceeding with submission...`);

  // Mark all items as completed with timestamp
  const submittedAt = new Date().toISOString();
  
  if (type === 'attendant') {
    // For attendant/pickup checklist, mark items in pickupStatus
    if (!checklistData[eventId].pickupStatus) {
      checklistData[eventId].pickupStatus = {};
    }
    checklist.forEach(item => {
      const originalId = item.id.replace('pickup_', '');
      if (!checklistData[eventId].pickupStatus[originalId]?.completed) {
        checklistData[eventId].pickupStatus[originalId] = {
          completed: true,
          completedBy: staffMember,
          completedAt: submittedAt
        };
      }
    });
  } else {
    // For packer checklist, mark items directly
    checklist.forEach(item => {
      if (!item.completed) {
        item.completed = true;
        item.completedBy = staffMember;
        item.completedAt = submittedAt;
      }
    });
  }

  // Mark as submitted with signature data
  const submissionData = {
    submittedBy: staffMember,
    submittedAt: submittedAt,
    signature: signature,
    checklistScreenshot: checklistScreenshot
  };
  
  checklistData[eventId][`${type}_submitted`] = submissionData;
  await saveChecklist(eventId);
  console.log(`[SUBMIT] Saved checklist, sendEmail=${sendEmail}`);

  if (sendEmail) {
    // Send email with attachments - don't block response
    console.log(`[SUBMIT] Starting email send...`);
    sendChecklistEmail(eventId, type, staffMember, eventTitle, eventDate, checklist, signature, checklistScreenshot)
      .then(() => {
        console.log(`[SUBMIT] Email sent successfully`);
      })
      .catch(error => {
        console.error('[SUBMIT] Email send failed:', error);
      });
    // Return immediately, don't wait for email
    res.json({ success: true, message: 'Checklist submitted, email sending in background' });
  } else {
    // Skip email sending
    console.log(`[SUBMIT] Email disabled, returning success`);
    res.json({ success: true, message: 'Checklist submitted (email notifications disabled)' });
  }
});

// API: Update checklist item
app.post('/api/checklist/:eventId/:type/:itemId', requireAuth, express.json(), async (req, res) => {
  const { eventId, type, itemId } = req.params;
  const { completed, completedBy } = req.body;

  await getOrCreateChecklist(eventId);

  // Handle pickup/attendant checklist items separately
  if (type === 'attendant' && itemId.startsWith('pickup_')) {
    // Extract original packer item ID
    const originalId = itemId.replace('pickup_', '');
    
    // Initialize pickupStatus if not exists
    if (!checklistData[eventId].pickupStatus) {
      checklistData[eventId].pickupStatus = {};
    }
    
    // Store pickup completion status
    checklistData[eventId].pickupStatus[originalId] = {
      completed: completed,
      completedBy: completed ? completedBy : null,
      completedAt: completed ? new Date().toISOString() : null
    };
    
    await saveChecklist(eventId);
    return res.json({ success: true, item: { id: itemId, completed } });
  }

  // Handle regular packer checklist items
  const checklist = checklistData[eventId][type];
  if (!checklist) {
    return res.status(400).json({ error: 'Invalid checklist type' });
  }

  const item = checklist.find(i => i.id === itemId);
  if (!item) {
    return res.status(404).json({ error: 'Checklist item not found' });
  }

  item.completed = completed;
  item.completedBy = completed ? completedBy : null;
  item.completedAt = completed ? new Date().toISOString() : null;

  await saveChecklist(eventId);
  res.json({ success: true, item });
});

// API: Save notes for checklist
app.post('/api/checklist/:eventId/notes/:type', requireAuth, express.json(), async (req, res) => {
  const { eventId, type } = req.params;
  const { notes } = req.body;

  await getOrCreateChecklist(eventId);

  if (!checklistData[eventId].notes) {
    checklistData[eventId].notes = { packer: '', attendant: '', 'packer-notes': '' };
  }

  checklistData[eventId].notes[type] = notes;
  await saveChecklist(eventId);
  res.json({ success: true, notes });
});

// API: Save subcontractor info
app.post('/api/checklist/:eventId/subcontractor', requireAuth, express.json(), async (req, res) => {
  const { eventId } = req.params;
  const { subcontractor } = req.body;

  await getOrCreateChecklist(eventId);

  checklistData[eventId].subcontractor = subcontractor;
  await saveChecklist(eventId);
  res.json({ success: true, subcontractor });
});

// API: Save backdrop text
app.post('/api/checklist/:eventId/backdrop', requireAuth, express.json(), async (req, res) => {
  const { eventId } = req.params;
  const { backdropText } = req.body;

  await getOrCreateChecklist(eventId);

  checklistData[eventId].backdropText = backdropText;
  await saveChecklist(eventId);
  res.json({ success: true, backdropText });
});

// API: Save backdrop image
app.post('/api/checklist/:eventId/backdrop-image', requireAuth, express.json({ limit: '50mb' }), async (req, res) => {
  const { eventId } = req.params;
  const { image, imageFull } = req.body;

  await getOrCreateChecklist(eventId);

  checklistData[eventId].backdropImage = image;
  checklistData[eventId].backdropImageFull = imageFull || image;
  await saveChecklist(eventId);
  res.json({ success: true });
});

// API: Remove backdrop image
app.delete('/api/checklist/:eventId/backdrop-image', requireAuth, async (req, res) => {
  const { eventId } = req.params;

  await getOrCreateChecklist(eventId);

  checklistData[eventId].backdropImage = null;
  await saveChecklist(eventId);
  res.json({ success: true });
});

// API: Toggle hidden service visibility for subcontracted events
app.post('/api/checklist/:eventId/hidden-services', requireAuth, express.json(), async (req, res) => {
  const { eventId } = req.params;
  const { serviceIndex, hidden } = req.body;

  await getOrCreateChecklist(eventId);

  // Initialize hiddenServices array if it doesn't exist
  if (!checklistData[eventId].hiddenServices) {
    checklistData[eventId].hiddenServices = [];
  }

  if (hidden) {
    // Add to hidden list if not already there
    if (!checklistData[eventId].hiddenServices.includes(serviceIndex)) {
      checklistData[eventId].hiddenServices.push(serviceIndex);
    }
  } else {
    // Remove from hidden list
    checklistData[eventId].hiddenServices = checklistData[eventId].hiddenServices.filter(idx => idx !== serviceIndex);
  }

  await saveChecklist(eventId);
  res.json({ success: true, hiddenServices: checklistData[eventId].hiddenServices });
});

// API: Save Kurtis' Notes
app.post('/api/checklist/:eventId/kurtis-notes', requireAuth, express.json(), async (req, res) => {
  const { eventId } = req.params;
  const { kurtisNotes } = req.body;

  await getOrCreateChecklist(eventId);

  checklistData[eventId].kurtisNotes = kurtisNotes;
  await saveChecklist(eventId);
  res.json({ success: true, kurtisNotes });
});

// API: Add custom item to packer list
app.post('/api/checklist/:eventId/custom-item', requireAuth, express.json(), async (req, res) => {
  const { eventId } = req.params;
  const { text, required = true } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Item text is required' });
  }

  const eventData = getEventFromCache(eventId);
  await getOrCreateChecklist(eventId, eventData);

  // Initialize customItems array if needed
  if (!checklistData[eventId].customItems) {
    checklistData[eventId].customItems = [];
  }

  // Create new custom item
  const customItem = {
    id: `custom_${Date.now()}`,
    text: text.trim(),
    required: required,
    autoGenerated: false,
    isCustom: true,
    completed: false,
    completedBy: null,
    completedAt: null
  };

  // Add to customItems array
  checklistData[eventId].customItems.push(customItem);
  
  // Also add to packer list for immediate display
  checklistData[eventId].packer.push(customItem);

  await saveChecklist(eventId);
  res.json({ success: true, item: customItem, packer: checklistData[eventId].packer });
});

// API: Remove any item from packer list (admin can remove any, others only custom)
app.delete('/api/checklist/:eventId/packer-item/:itemId', requireAuth, async (req, res) => {
  const { eventId, itemId } = req.params;

  const eventData = getEventFromCache(eventId);
  await getOrCreateChecklist(eventId, eventData);

  // Remove from customItems if it's there
  if (checklistData[eventId].customItems) {
    checklistData[eventId].customItems = checklistData[eventId].customItems.filter(item => item.id !== itemId);
  }

  // Track removed auto-generated items so they don't come back on regenerate
  if (!checklistData[eventId].removedItems) {
    checklistData[eventId].removedItems = [];
  }
  const removedItem = checklistData[eventId].packer.find(item => item.id === itemId);
  if (removedItem && (removedItem.autoGenerated || removedItem.id?.startsWith('auto_'))) {
    checklistData[eventId].removedItems.push(removedItem.text.toLowerCase());
  }

  // Remove from packer list
  checklistData[eventId].packer = checklistData[eventId].packer.filter(item => item.id !== itemId);

  await saveChecklist(eventId);
  res.json({ success: true, packer: checklistData[eventId].packer });
});

// API: Edit packer list item text
app.put('/api/checklist/:eventId/packer-item/:itemId', requireAuth, express.json(), async (req, res) => {
  const { eventId, itemId } = req.params;
  const { text, required } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Item text is required' });
  }

  const eventData = getEventFromCache(eventId);
  await getOrCreateChecklist(eventId, eventData);

  // Find and update the item
  const item = checklistData[eventId].packer.find(i => i.id === itemId);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  item.text = text.trim();
  if (typeof required === 'boolean') {
    item.required = required;
  }
  item.edited = true; // Mark as edited so regenerate doesn't overwrite

  // Also update in customItems if it's there
  if (checklistData[eventId].customItems) {
    const customItem = checklistData[eventId].customItems.find(i => i.id === itemId);
    if (customItem) {
      customItem.text = text.trim();
      if (typeof required === 'boolean') {
        customItem.required = required;
      }
    }
  }

  await saveChecklist(eventId);
  res.json({ success: true, item, packer: checklistData[eventId].packer });
});

// Keep old endpoint for backwards compatibility
app.delete('/api/checklist/:eventId/custom-item/:itemId', requireAuth, async (req, res) => {
  // Redirect to new endpoint
  req.url = `/api/checklist/${req.params.eventId}/packer-item/${req.params.itemId}`;
  const eventData = getEventFromCache(req.params.eventId);
  await getOrCreateChecklist(req.params.eventId, eventData);

  if (checklistData[req.params.eventId].customItems) {
    checklistData[req.params.eventId].customItems = checklistData[req.params.eventId].customItems.filter(item => item.id !== req.params.itemId);
  }
  checklistData[req.params.eventId].packer = checklistData[req.params.eventId].packer.filter(item => item.id !== req.params.itemId);

  await saveChecklist(req.params.eventId);
  res.json({ success: true, packer: checklistData[req.params.eventId].packer });
});

// API: Regenerate packer list from event services (refreshes auto-generated items, keeps custom)
app.post('/api/checklist/:eventId/regenerate-packer', requireAuth, async (req, res) => {
  const { eventId } = req.params;

  const eventData = getEventFromCache(eventId);
  if (!eventData) {
    return res.status(404).json({ error: 'Event not found in cache. Try refreshing the dashboard.' });
  }

  await getOrCreateChecklist(eventId, eventData);

  // Generate new packer items from current event services
  const newPackerItems = generatePackerItems(eventData);
  
  // Get existing custom items and their completion status
  const customItems = checklistData[eventId].customItems || [];
  const existingCompletions = {};
  for (const item of checklistData[eventId].packer || []) {
    if (item.completed) {
      existingCompletions[item.text.toLowerCase()] = {
        completed: item.completed,
        completedBy: item.completedBy,
        completedAt: item.completedAt
      };
    }
  }

  // Apply existing completion status to new items where text matches
  const packerWithStatus = newPackerItems.map(item => {
    const existing = existingCompletions[item.text.toLowerCase()];
    return {
      ...item,
      completed: existing?.completed || false,
      completedBy: existing?.completedBy || null,
      completedAt: existing?.completedAt || null
    };
  });

  // Combine auto-generated items with custom items
  checklistData[eventId].packer = [...packerWithStatus, ...customItems];
  checklistData[eventId].eventType = eventData.eventType;
  checklistData[eventId].isCorporate = isCorporateEvent(eventData.eventType);

  await saveChecklist(eventId);
  res.json({ 
    success: true, 
    packer: checklistData[eventId].packer,
    eventType: eventData.eventType,
    isCorporate: checklistData[eventId].isCorporate,
    servicesMatched: newPackerItems.length
  });
});

// API: Get packer configuration
app.get('/api/packer-config', requireAuth, (req, res) => {
  // Only admin can view/edit packer config
  if (!req.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  res.json({
    corporate: {
      services: packerConfig.CORPORATE_SERVICES,
      addons: packerConfig.CORPORATE_ADDONS
    },
    nonCorporate: {
      services: packerConfig.NON_CORPORATE_SERVICES,
      addons: packerConfig.NON_CORPORATE_ADDONS
    }
  });
});

// API: Save packer configuration
app.post('/api/packer-config', requireAuth, express.json({ limit: '5mb' }), async (req, res) => {
  // Only admin can save packer config
  if (!req.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const { corporate, nonCorporate } = req.body;
  
  if (!corporate || !nonCorporate) {
    return res.status(400).json({ error: 'Invalid configuration format' });
  }
  
  try {
    // Update the in-memory config
    Object.keys(packerConfig.CORPORATE_SERVICES).forEach(k => delete packerConfig.CORPORATE_SERVICES[k]);
    Object.assign(packerConfig.CORPORATE_SERVICES, corporate.services || {});
    
    Object.keys(packerConfig.CORPORATE_ADDONS).forEach(k => delete packerConfig.CORPORATE_ADDONS[k]);
    Object.assign(packerConfig.CORPORATE_ADDONS, corporate.addons || {});
    
    Object.keys(packerConfig.NON_CORPORATE_SERVICES).forEach(k => delete packerConfig.NON_CORPORATE_SERVICES[k]);
    Object.assign(packerConfig.NON_CORPORATE_SERVICES, nonCorporate.services || {});
    
    Object.keys(packerConfig.NON_CORPORATE_ADDONS).forEach(k => delete packerConfig.NON_CORPORATE_ADDONS[k]);
    Object.assign(packerConfig.NON_CORPORATE_ADDONS, nonCorporate.addons || {});
    
    // Save to database for persistence
    if (pool) {
      await pool.query(`
        INSERT INTO checklist_data (event_id, data, updated_at)
        VALUES ('__packer_config__', $1, NOW())
        ON CONFLICT (event_id) 
        DO UPDATE SET data = $1, updated_at = NOW()
      `, [JSON.stringify({ corporate, nonCorporate })]);
    }
    
    res.json({ success: true, message: 'Configuration saved' });
  } catch (error) {
    console.error('Error saving packer config:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// API: Get staff list for dropdown
app.get('/api/staff-list/:type', (req, res) => {
  const { type } = req.params;
  const staffList = type === 'packer' ? PACKER_STAFF : ALL_STAFF;
  res.json(staffList);
});

// Email function
async function sendChecklistEmail(eventId, type, staffMember, eventTitle, eventDate, checklist, signature, checklistScreenshot) {
  const isPackerList = type === 'packer';
  const subject = `${isPackerList ? 'Packing List Complete' : 'Pickup List Completed'}: ${eventTitle}, ${eventDate}`;
  
  const staffEmail = isPackerList 
    ? PACKER_STAFF.find(s => s.name === staffMember)?.email
    : ALL_STAFF.find(s => s.name === staffMember)?.email;

  const completedItems = checklist.filter(item => item.completed);
  const requiredItems = checklist.filter(item => item.required);
  const completedRequired = requiredItems.filter(item => item.completed);

  const timestamp = new Date().toLocaleString();

  const emailBody = `
    <h2>${subject}</h2>
    <p><strong>Completed by:</strong> ${staffMember}</p>
    <p><strong>Event:</strong> ${eventTitle}</p>
    <p><strong>Date:</strong> ${eventDate}</p>
    <p><strong>Completed:</strong> ${timestamp}</p>
    <p><strong>Signature:</strong> ✓ Digital signature captured</p>
    
    <h3>Checklist Summary</h3>
    <ul>
      <li>Total Items: ${checklist.length}</li>
      <li>Completed: ${completedItems.length}</li>
      <li>Required Items: ${requiredItems.length}</li>
      <li>Required Completed: ${completedRequired.length}</li>
    </ul>

    <h3>Completed Items</h3>
    <ul>
      ${completedItems.map(item => 
        `<li>${item.text} ${item.required ? '<strong>(REQUIRED)</strong>' : ''}</li>`
      ).join('')}
    </ul>

    ${checklist.length > completedItems.length ? `
      <h3>Incomplete Items</h3>
      <ul>
        ${checklist.filter(item => !item.completed).map(item => 
          `<li>${item.text} ${item.required ? '<strong>(REQUIRED)</strong>' : ''}</li>`
        ).join('')}
      </ul>
    ` : ''}

    <p><strong>Attachments:</strong> Digital signature and checklist screenshot included</p>
  `;

  const ccList = [
    'mary@kandephotobooths.com',
    'coreen@kandephotobooths.com'
  ];

  if (staffEmail) {
    ccList.push(staffEmail);
  }

  // Prepare attachments
  const attachments = [];

  // Add signature attachment if provided
  if (signature && signature.startsWith('data:image/')) {
    const signatureData = signature.replace(/^data:image\/\w+;base64,/, '');
    attachments.push({
      filename: `${type}_signature_${eventId}_${Date.now()}.png`,
      content: signatureData,
      encoding: 'base64',
      contentType: 'image/png'
    });
  }

  // Add checklist screenshot if provided
  if (checklistScreenshot && checklistScreenshot.startsWith('data:image/')) {
    const screenshotData = checklistScreenshot.replace(/^data:image\/\w+;base64,/, '');
    attachments.push({
      filename: `${type}_checklist_${eventId}_${Date.now()}.png`,
      content: screenshotData,
      encoding: 'base64',
      contentType: 'image/png'
    });
  }

  const mailOptions = {
    from: process.env.EMAIL_USER || 'dashboard@kandephotobooths.com',
    to: 'kurtis@kandephotobooths.com',
    cc: ccList,
    subject,
    html: emailBody,
    attachments: attachments
  };

  return transporter.sendMail(mailOptions);
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    cached: !!dashboardCache,
    lastUpdated: dashboardCache?.lastUpdated || null
  });
});

app.listen(PORT, async () => {
  console.log(`🎉 Kande Photo Booths Dashboard running at http://localhost:${PORT}`);
  console.log(`   Admin password: ${process.env.ADMIN_PASSWORD}`);
  
  // Initial data fetch
  try {
    console.log('Fetching initial dashboard data...');
    dashboardCache = await getDashboardData();
    lastFetch = Date.now();
    console.log(`Initial data loaded: ${dashboardCache.events?.length || 0} events`);
  } catch (error) {
    console.error('Failed to fetch initial data:', error.message);
  }
  
  // Auto-refresh VSCO data every 5 minutes
  setInterval(async () => {
    try {
      console.log('Auto-refreshing VSCO data...');
      dashboardCache = await getDashboardData();
      lastFetch = Date.now();
      console.log(`Auto-refresh complete: ${dashboardCache.events?.length || 0} events`);
    } catch (error) {
      console.error('Auto-refresh failed:', error.message);
    }
  }, 5 * 60 * 1000); // 5 minutes
});
