/**
 * Kande VendTech — Global Navigation Component
 * Include via: <script src="/nav.js"></script>
 * Automatically injects nav bar, mobile hamburger, active page highlighting.
 * Hides any existing .top-nav or .topbar elements.
 */
(function () {
  'use strict';

  var ITEMS = [
    { label: 'Dashboard',   href: '/',               icon: '🏠' },
    { label: 'Sales CRM',   href: '/crm',            icon: '🎯' },
    { label: 'Machines',     href: '/machines',       icon: '🏭' },
    { label: 'Inventory',    href: '/inventory',      icon: '📦' },
    { label: 'Finance',      href: '/finance',        icon: '💰' },
    { label: 'Restock',      href: '/restock',        icon: '📋' },
    { label: 'Staff',        href: '/staff',          icon: '👥' },
    { label: 'Clients',      href: '/clients',        icon: '🤝' },
    { label: 'Performance',  href: '/performance',    icon: '📊' },
    { label: 'Planogram',    href: '/planogram',      icon: '🎰' },
    { label: 'Strategy',     href: '/strategy.html',  icon: '🧠' },
    { label: 'AI Office',    href: '/ai-office',      icon: '🤖' },
    { label: 'Kanban',       href: '/kanban',         icon: '📌' },
    { label: 'SEO',          href: '/seo.html',       icon: '🔍' },
    { label: 'Map',          href: '/map',            icon: '🗺️' }
  ];

  var path = location.pathname;

  function isActive(href) {
    if (href === '/') return path === '/' || path === '/index.html';
    return path === href || path.startsWith(href + '/') || path === href.replace('.html', '');
  }

  /* ── CSS ──────────────────────────────────────────── */
  var css = document.createElement('style');
  css.textContent = [
    '#kv-nav{position:fixed;top:0;left:0;right:0;z-index:9999;background:#fff;border-bottom:1px solid #e2e8f0;height:52px;display:flex;align-items:center;padding:0 16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.05)}',
    '#kv-nav .kv-brand{font-weight:700;font-size:.95rem;color:#1a202c;text-decoration:none;margin-right:16px;white-space:nowrap;display:flex;align-items:center;gap:8px}',
    '#kv-nav .kv-brand img{height:28px}',
    '#kv-nav .kv-links{display:flex;align-items:center;gap:2px;overflow-x:auto;flex:1;-webkit-overflow-scrolling:touch;scrollbar-width:none}',
    '#kv-nav .kv-links::-webkit-scrollbar{display:none}',
    '#kv-nav .kv-links a{color:#718096;text-decoration:none;font-size:.78rem;font-weight:500;padding:6px 9px;border-radius:6px;white-space:nowrap;transition:all .15s}',
    '#kv-nav .kv-links a:hover{color:#3182ce;background:rgba(49,130,206,.06)}',
    '#kv-nav .kv-links a.active{color:#3182ce;background:rgba(49,130,206,.1);font-weight:600}',
    '#kv-nav .kv-hamburger{display:none;background:none;border:none;font-size:1.4rem;cursor:pointer;padding:8px;color:#1a202c;margin-left:auto}',

    /* mobile overlay */
    '#kv-nav-mobile{display:none;position:fixed;top:52px;left:0;right:0;bottom:0;background:#fff;z-index:9998;overflow-y:auto;padding:8px 0}',
    '#kv-nav-mobile.open{display:block}',
    '#kv-nav-mobile a{display:flex;align-items:center;gap:10px;padding:14px 24px;color:#1a202c;text-decoration:none;font-size:.95rem;border-bottom:1px solid #f0f4f8;transition:background .15s}',
    '#kv-nav-mobile a:hover{background:#f7fafc}',
    '#kv-nav-mobile a.active{color:#3182ce;background:rgba(49,130,206,.06);font-weight:600}',

    /* body offset so content isn't hidden behind fixed nav */
    'body.kv-nav-active{padding-top:52px!important}',

    '@media(max-width:1100px){#kv-nav .kv-links{display:none}#kv-nav .kv-hamburger{display:block}}'
  ].join('\n');
  document.head.appendChild(css);

  /* ── Desktop nav bar ──────────────────────────────── */
  var nav = document.createElement('nav');
  nav.id = 'kv-nav';
  nav.innerHTML =
    '<a class="kv-brand" href="/">' +
      '<img src="/logo.png" alt="KV" onerror="this.style.display=\'none\'">' +
      'Kande VendTech' +
    '</a>' +
    '<div class="kv-links">' +
      ITEMS.map(function (i) {
        return '<a href="' + i.href + '"' + (isActive(i.href) ? ' class="active"' : '') + '>' + i.label + '</a>';
      }).join('') +
    '</div>' +
    '<button class="kv-hamburger" aria-label="Menu">☰</button>';

  document.body.prepend(nav);

  /* ── Mobile overlay ───────────────────────────────── */
  var mobile = document.createElement('div');
  mobile.id = 'kv-nav-mobile';
  mobile.innerHTML = ITEMS.map(function (i) {
    return '<a href="' + i.href + '"' + (isActive(i.href) ? ' class="active"' : '') + '>' + i.icon + ' ' + i.label + '</a>';
  }).join('');
  nav.parentNode.insertBefore(mobile, nav.nextSibling);

  /* ── Hamburger toggle ─────────────────────────────── */
  var btn = nav.querySelector('.kv-hamburger');
  btn.addEventListener('click', function () {
    var open = mobile.classList.toggle('open');
    btn.textContent = open ? '✕' : '☰';
  });

  /* close mobile menu on link click */
  mobile.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      mobile.classList.remove('open');
      btn.textContent = '☰';
    });
  });

  /* ── Body class for top-padding ───────────────────── */
  document.body.classList.add('kv-nav-active');

  /* ── Hide old inline navs ─────────────────────────── */
  document.querySelectorAll('.top-nav, .topbar').forEach(function (el) {
    if (el.id !== 'kv-nav') el.style.display = 'none';
  });
})();
