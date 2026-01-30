# Kande Websites Documentation

*Last updated: 2026-01-30*

This document maps out all the websites, tech stacks, services, and processes used for Kande's web properties.

---

## 1. kandevendtech.com (Main Website)

### Purpose
Main marketing website for Kande VendTech - showcases services, products, and contact form for lead generation.

### Hosting & Deployment
- **Hosting:** GitHub Pages
- **Repository:** https://github.com/kinghon/kande-vendtech-site
- **Custom Domain:** kandevendtech.com
- **DNS:** GoDaddy (A records pointing to GitHub Pages IPs)

### DNS Configuration
```
A Records (@ → GitHub Pages):
- 185.199.108.153
- 185.199.109.153
- 185.199.110.153
- 185.199.111.153

CNAME Record:
- www → kinghon.github.io
```

### Tech Stack
- **Frontend:** Static HTML, Tailwind CSS (CDN)
- **Fonts:** Google Fonts (Inter)
- **Form Handling:** FormSubmit.co (sends to hello@kandevendtech.com)
- **No backend required** - fully static site

### Key Files
- `index.html` - Main homepage
- `thank-you.html` - Form submission confirmation page
- `images/` - All site images
- `CNAME` - Custom domain configuration

### Form Configuration
- Action: `https://formsubmit.co/hello@kandevendtech.com`
- Hidden fields:
  - `_next` → redirects to thank-you.html
  - `_subject` → "New Lead from Kande VendTech Website"
  - `_captcha` → false

### Deployment Process
1. Edit files locally or clone repo
2. Commit and push to `main` branch
3. GitHub Pages auto-deploys (1-2 min)
4. Changes live at kandevendtech.com

---

## 2. products.kandevendtech.com (Product Catalog)

### Purpose
Interactive product catalog for customers to browse vending machine products and create interest lists. Admin mode shows pricing/margins.

### Hosting & Deployment
- **Hosting:** GitHub Pages
- **Repository:** https://github.com/kinghon/kande-vendtech-products
- **Custom Domain:** products.kandevendtech.com
- **Local Path:** `/Users/kurtishon/clawd/kande-vendtech-catalog/dashboard/`

### DNS Configuration
```
CNAME Record:
- products → kinghon.github.io
```

### Tech Stack
- **Frontend:** Static HTML, Tailwind CSS (CDN)
- **JavaScript:** Vanilla JS (app.js, products.js)
- **Data:** JSON files (products.js contains product data)
- **No backend** - fully client-side

### Key Files
- `index.html` - Main catalog interface
- `app.js` - Application logic, cart, admin mode
- `products.js` - Product data (prices, images, categories)
- `products-supplement.json` - Additional product data
- `export.html` - Export interest list page
- `logo.png` - Kande VendTech logo
- `favicon.png` - Site favicon
- `CNAME` - Custom domain configuration

### Features
- Product search and filtering
- Category browsing
- Interest list (cart-like functionality)
- Admin mode (password protected) - shows pricing details
- Export interest list

### Deployment Process
1. Edit files in `/Users/kurtishon/clawd/kande-vendtech-catalog/dashboard/`
2. `git add -A && git commit -m "message" && git push`
3. GitHub Pages auto-deploys (1-2 min)
4. Changes live at products.kandevendtech.com

---

## 3. info.kandedash.com (Photo Booths Dashboard)

### Purpose
Staff dashboard for Kande Photo Booths - pulls data from VSCO Workspace, manages events and packer configurations.

### Hosting & Deployment
- **Hosting:** Local Node.js server (Express)
- **Local Path:** `/Users/kurtishon/clawd/kande-photo-booths/dashboard/`
- **Custom Domain:** info.kandedash.com (likely via tunnel/proxy)

### Tech Stack
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Frontend:** Static HTML in `/public/`
- **Dependencies:**
  - express (web server)
  - pg (PostgreSQL client)
  - nodemailer (email sending)
  - node-fetch (API calls)
  - helmet (security)
  - cors (cross-origin)
  - dotenv (environment variables)

### Key Files
- `src/server.js` - Main Express server
- `src/vsco.js` - VSCO Workspace integration
- `src/packer-config.js` - Packer configuration logic
- `public/index.html` - Main dashboard page
- `public/event-template.html` - Event template page
- `public/packer-config.html` - Packer configuration page
- `public/kande-logo.jpg` - Logo

### Running the Server
```bash
cd /Users/kurtishon/clawd/kande-photo-booths/dashboard
npm start        # Production
npm run dev      # Development (auto-reload)
```

### Environment Variables
- Likely stored in `.env` file (check `.env.local` or similar)
- Database connection, VSCO API keys, email config

---

## Common Patterns & Services

### GitHub Pages Deployment
All sites use GitHub Pages for free static hosting:
1. Create repo on GitHub
2. Enable Pages in repo Settings → Pages
3. Set source to `main` branch, `/ (root)` folder
4. Add `CNAME` file with custom domain
5. Configure DNS at registrar (GoDaddy)

### DNS Setup (GoDaddy)
For apex domain (example.com):
- Add 4 A records pointing to GitHub IPs

For subdomain (sub.example.com):
- Add CNAME record pointing to `username.github.io`

### GitHub Pages IPs
```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

### SSL/HTTPS
- GitHub Pages provides free SSL
- Enable "Enforce HTTPS" in repo Settings → Pages
- May take 15-30 min to provision after DNS setup

### Form Services
- **FormSubmit.co** - Free, no signup needed, just use email in action URL
- First submission requires email confirmation

---

## Troubleshooting

### Site not updating
1. Check GitHub Actions for deployment status
2. Hard refresh browser (Cmd+Shift+R)
3. Try incognito window
4. Flush DNS cache: `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`

### DNS issues
1. Verify records in GoDaddy DNS settings
2. Check propagation: `dig domain.com +short`
3. Test with Google DNS: `nslookup domain.com 8.8.8.8`
4. Wait up to 48 hours for full propagation

### SSL certificate errors
1. Uncheck "Enforce HTTPS" temporarily
2. Wait for certificate provisioning (15-30 min)
3. Re-enable "Enforce HTTPS"

### Old site showing (GoDaddy WordPress conflict)
1. Go to GoDaddy → My Products → Managed WordPress
2. Click "Manage Hosting" 
3. Under Domains, click "..." → Remove domain
4. This disconnects WordPress, allowing DNS to route to GitHub

---

## Quick Reference Commands

```bash
# Clone and edit site
git clone https://github.com/kinghon/REPO-NAME.git
cd REPO-NAME
# make edits
git add -A && git commit -m "description" && git push

# Check DNS
dig kandevendtech.com +short
dig products.kandevendtech.com +short

# Flush local DNS cache (Mac)
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
```

---

## Accounts & Logins

- **GitHub:** kinghon
- **GoDaddy:** (Kurtis's account - manages DNS)
- **FormSubmit:** No account needed (uses hello@kandevendtech.com)

---

*This document should be updated whenever changes are made to site infrastructure.*
