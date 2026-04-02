/**
 * Ferry Pilots Australia — script.js
 * Vanilla JS: hero animation, coverage map, scroll effects, slider, FAQ, form
 */

/* ============================================================
   AUSTRALIA MAP DATA
   SVG coordinate system: viewBox="0 0 700 580"
   Mapping: x = 50 + (lon-113)/41*630, y = 30 + (-10-lat)/35*540
   ============================================================ */

const CITIES = {
  sydney:      { x: 528, y: 449, label: 'Sydney',        abbr: 'SYD' },
  melbourne:   { x: 626, y: 389, label: 'Melbourne',     abbr: 'MEL' },
  brisbane:    { x: 654, y: 290, label: 'Brisbane',      abbr: 'BNE' },
  perth:       { x:  75, y: 359, label: 'Perth',         abbr: 'PER' },
  adelaide:    { x: 430, y: 405, label: 'Adelaide',      abbr: 'ADL' },
  darwin:      { x: 308, y:  59, label: 'Darwin',        abbr: 'DRW' },
  cairns:      { x: 542, y: 127, label: 'Cairns',        abbr: 'CNS' },
  alice:       { x: 356, y: 232, label: 'Alice Springs', abbr: 'ASP' },
  hobart:      { x: 565, y: 528, label: 'Hobart',        abbr: 'HBA' },
  townsville:  { x: 558, y: 164, label: 'Townsville',    abbr: 'TSV' }
};

// Australia outline path points (lon, lat geographic coordinates)
const AUS_OUTLINE_COORDS = [
  [145.5,-10.7],[148.0,-14.0],[145.8,-16.9],[146.8,-19.3],[149.2,-21.1],
  [150.5,-23.4],[153.0,-27.5],[153.6,-28.7],[151.8,-31.0],[151.2,-33.9],
  [150.7,-35.5],[149.9,-37.1],[148.0,-37.8],[146.4,-39.1],[145.2,-38.4],
  [143.5,-38.6],[141.6,-38.4],[140.0,-37.0],[138.5,-35.7],[138.6,-34.9],
  [137.8,-35.6],[136.6,-35.2],[136.0,-34.8],[135.0,-34.8],[133.5,-32.1],
  [131.0,-31.8],[128.9,-31.7],[126.0,-33.8],[121.9,-33.9],[118.5,-34.0],
  [117.9,-35.0],[115.1,-34.4],[114.9,-33.5],[115.9,-32.0],[114.6,-29.0],
  [113.7,-26.0],[113.9,-24.9],[114.2,-22.0],[116.0,-20.9],[118.6,-20.4],
  [122.2,-17.9],[124.0,-15.5],[126.5,-14.3],[130.8,-12.5],[132.0,-11.5],
  [133.5,-12.0],[135.0,-12.3],[136.5,-12.5],[136.5,-15.5],[139.5,-17.5],
  [139.0,-15.0],[141.9,-12.7],[142.5,-10.9],[145.5,-10.7]
];

// Tasmania (separate island)
const TASMANIA_COORDS = [
  [144.5,-40.5],[148.3,-40.5],[148.3,-43.7],[145.2,-43.6],[144.5,-42.0],[144.5,-40.5]
];

// Flight routes [from, to, color]
const ROUTES = [
  ['sydney','melbourne','sky'],
  ['sydney','brisbane','sky'],
  ['sydney','perth','amber'],
  ['melbourne','adelaide','sky'],
  ['adelaide','perth','sky'],
  ['perth','darwin','amber'],
  ['darwin','cairns','sky'],
  ['cairns','brisbane','sky'],
  ['alice','darwin','sky'],
  ['alice','adelaide','sky'],
  ['sydney','cairns','amber'],
  ['melbourne','hobart','sky'],
];

/* ============================================================
   COORDINATE HELPERS
   ============================================================ */

function geoToSvg(lon, lat, W, H, padX, padY) {
  const lonMin=113, lonMax=154, latMin=-45, latMax=-10;
  const x = padX + (lon - lonMin) / (lonMax - lonMin) * (W - 2*padX);
  const y = padY + ((latMax - lat) / (latMax - latMin)) * (H - 2*padY);
  return { x, y };
}

function coordsToPath(coords, W, H, padX, padY) {
  return coords.map((c,i) => {
    const p = geoToSvg(c[0], c[1], W, H, padX, padY);
    return (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1);
  }).join(' ') + ' Z';
}

function bezierControlPoints(p1, p2) {
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const offset = dist * 0.28;
  // Curve upward (toward center of map) for nice arc
  const cx = mx - dy * offset / dist;
  const cy = my + dx * offset / dist - offset * 0.4;
  return { cx1: cx - dx*0.05, cy1: cy, cx2: cx + dx*0.05, cy2: cy };
}

/* ============================================================
   SVG BUILDER HELPERS
   ============================================================ */

function svgEl(tag, attrs={}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k,v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/* ============================================================
   BUILD HERO MAP (700 × 580 viewBox)
   ============================================================ */

function buildHeroMap() {
  const svg = document.getElementById('heroMap');
  if (!svg) return;
  const W=700, H=580, px=30, py=20;

  // Background
  const defs = svgEl('defs');
  const bgGrad = svgEl('radialGradient', { id:'heroBg', cx:'55%', cy:'45%', r:'60%' });
  [{offset:'0%',color:'#0e1d38'},{offset:'100%',color:'#080d1a'}].forEach(s => {
    const stop = svgEl('stop', { offset: s.offset });
    stop.style.stopColor = s.color;
    bgGrad.appendChild(stop);
  });
  const glowFilter = svgEl('filter', { id:'glow' });
  const fe1 = svgEl('feGaussianBlur', { stdDeviation:'3', result:'blur' });
  const fe2 = svgEl('feMerge');
  [svgEl('feMergeNode',{in:'blur'}), svgEl('feMergeNode',{in:'SourceGraphic'})].forEach(n => fe2.appendChild(n));
  glowFilter.appendChild(fe1); glowFilter.appendChild(fe2);
  defs.appendChild(bgGrad); defs.appendChild(glowFilter);
  svg.appendChild(defs);

  // Background rect
  svg.appendChild(svgEl('rect', { width:W, height:H, fill:'url(#heroBg)' }));

  // Grid lines
  const gridG = svgEl('g', { class:'hero-grid' });
  for (let x=50; x<W; x+=70)
    gridG.appendChild(svgEl('line', { x1:x, y1:0, x2:x, y2:H, class:'hero-grid-line' }));
  for (let y=40; y<H; y+=65)
    gridG.appendChild(svgEl('line', { x1:0, y1:y, x2:W, y2:y, class:'hero-grid-line' }));
  // Radar arcs from centre
  const cx=350, cy=290;
  [80,160,240,320].forEach(r =>
    gridG.appendChild(svgEl('circle', { cx, cy, r, class:'radar-arc' }))
  );
  svg.appendChild(gridG);

  // Australia outline (animated draw)
  const ausPath = coordsToPath(AUS_OUTLINE_COORDS, W, H, px, py);
  const ausEl = svgEl('path', { d: ausPath, class:'aus-outline' });
  svg.appendChild(ausEl);

  // Draw-on outline animation via stroke-dasharray
  const ausOutlineAnim = svgEl('path', { d: ausPath, class:'aus-outline-draw' });
  svg.appendChild(ausOutlineAnim);
  requestAnimationFrame(() => {
    const len = ausOutlineAnim.getTotalLength();
    ausOutlineAnim.style.strokeDasharray = len;
    ausOutlineAnim.style.strokeDashoffset = len;
    ausOutlineAnim.style.transition = 'stroke-dashoffset 3.5s ease-in-out 0.8s';
    requestAnimationFrame(() => { ausOutlineAnim.style.strokeDashoffset = '0'; });
  });

  // Tasmania
  const tasPath = coordsToPath(TASMANIA_COORDS, W, H, px, py);
  svg.appendChild(svgEl('path', { d: tasPath, class:'aus-outline' }));

  // Route paths group
  const routeG = svgEl('g', { id:'heroRoutes' });
  svg.appendChild(routeG);

  // City markers group
  const cityG = svgEl('g', { id:'heroCities' });
  svg.appendChild(cityG);

  // Plane group
  const planeG = svgEl('g', { id:'heroPlanes' });
  svg.appendChild(planeG);

  // Draw routes with delay
  setTimeout(() => drawHeroRoutes(svg, routeG, planeG, W, H, px, py), 3200);

  // Draw city markers
  setTimeout(() => drawCityMarkers(cityG, W, H, px, py), 1500);
}

function drawHeroRoutes(svg, routeG, planeG, W, H, px, py) {
  let routeIdx = 0;
  const allPaths = [];

  function drawNext() {
    if (routeIdx >= ROUTES.length) {
      // Animate planes after all routes drawn
      setTimeout(() => animatePlanesOnRoutes(planeG, allPaths), 400);
      return;
    }
    const [from, to, color] = ROUTES[routeIdx++];
    const p1 = CITIES[from], p2 = CITIES[to];
    const ctrl = bezierControlPoints(p1, p2);
    const d = `M${p1.x},${p1.y} C${ctrl.cx1},${ctrl.cy1} ${ctrl.cx2},${ctrl.cy2} ${p2.x},${p2.y}`;
    const path = svgEl('path', {
      d, class: `route-path route-${color}`,
      'stroke-dasharray': '5,4'
    });
    routeG.appendChild(path);
    allPaths.push({ path, from, to, color });

    const len = path.getTotalLength();
    path.style.strokeDasharray = `5 4`;
    path.style.opacity = '0';
    path.style.transition = 'opacity 0.3s';
    // Animate drawing using offset trick on a copy
    const animPath = svgEl('path', {
      d, fill:'none',
      stroke: color === 'sky' ? 'rgba(90,171,240,0.55)' : 'rgba(245,166,58,0.5)',
      'stroke-width': '1.5', 'stroke-linecap': 'round'
    });
    animPath.style.strokeDasharray = len;
    animPath.style.strokeDashoffset = len;
    routeG.appendChild(animPath);
    requestAnimationFrame(() => {
      animPath.style.transition = 'stroke-dashoffset 1.2s ease';
      animPath.style.strokeDashoffset = '0';
      path.style.opacity = '0.5';
    });
    setTimeout(drawNext, 520);
  }
  drawNext();
}

function drawCityMarkers(cityG, W, H, px, py) {
  const showCities = ['sydney','melbourne','brisbane','perth','adelaide','darwin','cairns'];
  showCities.forEach((key, i) => {
    const c = CITIES[key];
    const g = svgEl('g');
    g.style.opacity = '0';
    g.style.transition = `opacity 0.5s ease ${i * 0.15}s`;

    // Pulse ring
    const ring = svgEl('circle', { cx:c.x, cy:c.y, r:5, class:'city-marker-outer' });
    ring.style.animationDelay = `${i * 0.4}s`;
    g.appendChild(ring);
    // Inner dot
    g.appendChild(svgEl('circle', { cx:c.x, cy:c.y, r:3.5, class:'city-marker-inner' }));
    // Label
    const textAnchor = c.x > 400 ? 'end' : 'start';
    const textX = c.x > 400 ? c.x - 7 : c.x + 7;
    const label = svgEl('text', { x:textX, y:c.y + 4, class:'city-label', 'text-anchor': textAnchor });
    label.textContent = c.abbr;
    g.appendChild(label);

    cityG.appendChild(g);
    requestAnimationFrame(() => { g.style.opacity = '1'; });
  });
}

function animatePlanesOnRoutes(planeG, routePaths) {
  if (!routePaths.length) return;
  // Animate 3 planes simultaneously on different routes
  const activeRoutes = routePaths.slice(0, 6);
  activeRoutes.forEach((rp, i) => {
    setTimeout(() => launchPlane(planeG, rp.path, rp.color, i), i * 900);
  });
}

function launchPlane(planeG, routePath, color, idx) {
  const planeColor = color === 'sky' ? '#7eb8ff' : '#f5a63a';
  const plane = svgEl('g', { class:'plane-icon' });
  // Simple plane shape pointing right
  const body = svgEl('polygon', {
    points: '0,-2.5 10,0 0,2.5 2,0',
    fill: planeColor,
    filter: 'url(#glow)'
  });
  const wingL = svgEl('polygon', {
    points: '1,-2.5 6,-7 7,-5 2,-1',
    fill: planeColor,
    opacity: '0.85'
  });
  const wingR = svgEl('polygon', {
    points: '1,2.5 6,7 7,5 2,1',
    fill: planeColor,
    opacity: '0.85'
  });
  [body, wingL, wingR].forEach(el => plane.appendChild(el));
  planeG.appendChild(plane);

  const totalLen = routePath.getTotalLength();
  const duration = 4500 + idx * 300;
  let startTime = null;

  function frame(ts) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;
    let t = (elapsed % (duration + 1200)) / duration;
    if (t > 1) {
      // pause at end before restarting
      const pauseT = (elapsed % (duration + 1200)) - duration;
      if (pauseT < 1200) { requestAnimationFrame(frame); return; }
      startTime = ts;
      t = 0;
    }
    // Ease in-out
    const eased = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    const pt = routePath.getPointAtLength(Math.min(eased * totalLen, totalLen - 0.5));
    const pt2 = routePath.getPointAtLength(Math.min(eased * totalLen + 2, totalLen));
    const angle = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI;
    plane.setAttribute('transform', `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)}) rotate(${angle.toFixed(1)})`);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ============================================================
   BUILD COVERAGE MAP (700 × 580 viewBox)
   ============================================================ */

function buildCoverageMap() {
  const svg = document.getElementById('coverageMap');
  if (!svg) return;
  const W=700, H=580, px=30, py=20;

  // Background
  svg.appendChild(svgEl('rect', { width:W, height:H, fill:'#0d1525', rx:8 }));

  // Grid
  const gridG = svgEl('g');
  for (let x=50; x<W; x+=70)
    gridG.appendChild(svgEl('line', { x1:x, y1:0, x2:x, y2:H, stroke:'rgba(90,171,240,0.06)', 'stroke-width':'0.5' }));
  for (let y=40; y<H; y+=65)
    gridG.appendChild(svgEl('line', { x1:0, y1:y, x2:W, y2:y, stroke:'rgba(90,171,240,0.06)', 'stroke-width':'0.5' }));
  svg.appendChild(gridG);

  // Australia fill + border
  const ausPath = coordsToPath(AUS_OUTLINE_COORDS, W, H, px, py);
  svg.appendChild(svgEl('path', { d: ausPath, fill:'rgba(20,40,70,0.7)', stroke:'rgba(90,171,240,0.5)', 'stroke-width':'1.5', 'stroke-linejoin':'round' }));
  const tasPath = coordsToPath(TASMANIA_COORDS, W, H, px, py);
  svg.appendChild(svgEl('path', { d: tasPath, fill:'rgba(20,40,70,0.7)', stroke:'rgba(90,171,240,0.5)', 'stroke-width':'1.5' }));

  // All routes
  const routeG = svgEl('g');
  svg.appendChild(routeG);
  ROUTES.forEach(([from, to, color]) => {
    const p1 = CITIES[from], p2 = CITIES[to];
    const ctrl = bezierControlPoints(p1, p2);
    const strokeColor = color === 'sky' ? 'rgba(90,171,240,0.4)' : 'rgba(245,166,58,0.35)';
    const path = svgEl('path', {
      d: `M${p1.x},${p1.y} C${ctrl.cx1},${ctrl.cy1} ${ctrl.cx2},${ctrl.cy2} ${p2.x},${p2.y}`,
      fill: 'none', stroke: strokeColor, 'stroke-width':'1.2',
      'stroke-linecap':'round', 'stroke-dasharray':'5,4'
    });
    routeG.appendChild(path);
    // Animate draw-on when section is visible
    path.dataset.animated = 'false';
  });

  // City markers + labels
  const cityG = svgEl('g');
  svg.appendChild(cityG);

  Object.entries(CITIES).forEach(([key, c]) => {
    const g = svgEl('g');
    // Glow bg
    g.appendChild(svgEl('circle', { cx:c.x, cy:c.y, r:10, fill:'rgba(90,171,240,0.08)' }));
    // Pulse ring
    const ring = svgEl('circle', { cx:c.x, cy:c.y, r:5, fill:'none', stroke:'rgba(90,171,240,0.7)', 'stroke-width':'1' });
    ring.innerHTML = `<animate attributeName="r" from="5" to="14" dur="2s" repeatCount="indefinite" begin="${Math.random()*2}s"/>
      <animate attributeName="opacity" from="0.8" to="0" dur="2s" repeatCount="indefinite" begin="${Math.random()*2}s"/>`;
    g.appendChild(ring);
    // Dot
    g.appendChild(svgEl('circle', { cx:c.x, cy:c.y, r:3.5, fill:'#5aabf0' }));
    // Label
    const lx = c.x > 380 ? c.x - 8 : c.x + 8;
    const anchor = c.x > 380 ? 'end' : 'start';
    const ly = key === 'hobart' ? c.y + 14 : key === 'darwin' ? c.y - 7 : c.y + 4;
    const label = svgEl('text', {
      x:lx, y:ly,
      fill:'#c5cdd9', 'font-size':'9.5',
      'font-family':'Inter,sans-serif', 'font-weight':'500',
      'text-anchor': anchor
    });
    label.textContent = c.label;
    g.appendChild(label);
    cityG.appendChild(g);
  });

  // Animate route lines when coverage section becomes visible
  svg._routeG = routeG;
  svg._animated = false;
}

function animateCoverageRoutes(svg) {
  if (!svg || svg._animated) return;
  svg._animated = true;
  const paths = svg._routeG ? svg._routeG.querySelectorAll('path') : [];
  paths.forEach((path, i) => {
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    path.style.transition = `stroke-dashoffset 1.5s ease ${i * 0.12}s`;
    requestAnimationFrame(() => { path.style.strokeDashoffset = '0'; });
  });
}

/* ============================================================
   SCROLL PROGRESS BAR
   ============================================================ */

function initScrollProgress() {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (total > 0 ? (scrolled / total) * 100 : 0) + '%';
  }, { passive: true });
}

/* ============================================================
   STICKY HEADER
   ============================================================ */

function initHeader() {
  const header = document.getElementById('siteHeader');
  if (!header) return;
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 60);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ============================================================
   MOBILE MENU
   ============================================================ */

function initMobileMenu() {
  const btn = document.getElementById('hamburger');
  const nav = document.getElementById('mainNav');
  if (!btn || !nav) return;

  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  // Close on nav link click
  nav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      nav.classList.remove('open');
      btn.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!nav.contains(e.target) && !btn.contains(e.target) && nav.classList.contains('open')) {
      nav.classList.remove('open');
      btn.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
}

/* ============================================================
   ACTIVE NAV LINK (Scroll Spy)
   ============================================================ */

function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.main-nav a[href^="#"]');
  if (!sections.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(a => a.classList.remove('active'));
        const link = document.querySelector(`.main-nav a[href="#${entry.target.id}"]`);
        if (link) link.classList.add('active');
      }
    });
  }, { threshold: 0.35 });

  sections.forEach(s => observer.observe(s));
}

/* ============================================================
   SCROLL REVEAL (IntersectionObserver)
   ============================================================ */

function initScrollReveal() {
  const targets = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (!targets.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  targets.forEach(el => obs.observe(el));
}

/* ============================================================
   COUNTER ANIMATION
   ============================================================ */

function initCounters() {
  const counters = document.querySelectorAll('.stat-number[data-target]');
  if (!counters.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      const target = parseInt(e.target.dataset.target, 10);
      const duration = 1800;
      const start = performance.now();
      const el = e.target;

      function update(ts) {
        const elapsed = ts - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out quad
        const eased = 1 - (1 - progress) * (1 - progress);
        el.textContent = Math.round(eased * target);
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => obs.observe(el));
}

/* ============================================================
   COVERAGE SECTION OBSERVER
   ============================================================ */

function initCoverageObserver() {
  const section = document.getElementById('coverage');
  const svg = document.getElementById('coverageMap');
  if (!section || !svg) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCoverageRoutes(svg);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.25 });

  obs.observe(section);
}

/* ============================================================
   PROCESS STEPS REVEAL
   ============================================================ */

function initProcessSteps() {
  const steps = document.querySelectorAll('.process-step');
  if (!steps.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });

  steps.forEach(s => obs.observe(s));
}

/* ============================================================
   TESTIMONIAL SLIDER
   ============================================================ */

function initTestimonialSlider() {
  const track = document.querySelector('.testimonials-track');
  const slides = document.querySelectorAll('.testimonial-slide');
  const dots = document.querySelectorAll('.testimonial-dot');
  const prevBtn = document.querySelector('.testimonial-prev');
  const nextBtn = document.querySelector('.testimonial-next');
  if (!track || !slides.length) return;

  let current = 0;
  let autoTimer = null;

  function goTo(idx) {
    current = (idx + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  function startAuto() {
    autoTimer = setInterval(() => goTo(current + 1), 6000);
  }
  function stopAuto() {
    clearInterval(autoTimer);
  }

  if (prevBtn) prevBtn.addEventListener('click', () => { stopAuto(); goTo(current - 1); startAuto(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { stopAuto(); goTo(current + 1); startAuto(); });
  dots.forEach((d, i) => d.addEventListener('click', () => { stopAuto(); goTo(i); startAuto(); }));

  // Touch/swipe support
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; stopAuto(); }, { passive: true });
  track.addEventListener('touchend', e => {
    const dx = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 50) goTo(current + (dx > 0 ? 1 : -1));
    startAuto();
  }, { passive: true });

  goTo(0);
  startAuto();
}

/* ============================================================
   FAQ ACCORDION
   ============================================================ */

function initFAQ() {
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer   = item.querySelector('.faq-answer');
    if (!question || !answer) return;

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Close all
      document.querySelectorAll('.faq-item.open').forEach(openItem => {
        openItem.classList.remove('open');
        openItem.querySelector('.faq-answer').style.maxHeight = '0';
      });
      // Open clicked if it was closed
      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
}

/* ============================================================
   CONTACT FORM (Web3Forms)
   ============================================================ */

function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const submitBtn = form.querySelector('.form-submit');
  const formStatus = document.getElementById('formStatus');

  function showError(input, message) {
    input.classList.add('error');
    const errEl = input.parentElement.querySelector('.form-error-msg');
    if (errEl) { errEl.textContent = message; errEl.classList.add('show'); }
  }

  function clearError(input) {
    input.classList.remove('error');
    const errEl = input.parentElement.querySelector('.form-error-msg');
    if (errEl) errEl.classList.remove('show');
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validateForm() {
    let valid = true;
    const required = form.querySelectorAll('[required]');
    required.forEach(input => {
      clearError(input);
      if (!input.value.trim()) {
        showError(input, 'This field is required.');
        valid = false;
      }
    });
    const emailInput = form.querySelector('#email');
    if (emailInput && emailInput.value.trim() && !validateEmail(emailInput.value.trim())) {
      showError(emailInput, 'Please enter a valid email address.');
      valid = false;
    }
    return valid;
  }

  // Real-time validation on blur
  form.querySelectorAll('[required], #email').forEach(input => {
    input.addEventListener('blur', () => {
      if (input.value.trim()) clearError(input);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (formStatus) { formStatus.className = 'form-status'; formStatus.textContent = ''; }
    if (!validateForm()) return;

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
      const data = new FormData(form);
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: data
      });
      const json = await res.json();

      if (json.success) {
        formStatus.className = 'form-status success';
        formStatus.textContent = '✓ Message sent! We\'ll be in touch within 24 hours.';
        form.reset();
      } else {
        throw new Error(json.message || 'Submission failed');
      }
    } catch (err) {
      if (formStatus) {
        formStatus.className = 'form-status error';
        formStatus.textContent = '✗ Something went wrong. Please call us directly on 0414 250 344.';
      }
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  });
}

/* ============================================================
   FLOATING BUTTONS
   ============================================================ */

function initFloatingButtons() {
  const topBtn = document.getElementById('fabTop');
  if (topBtn) {
    window.addEventListener('scroll', () => {
      topBtn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    topBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

/* ============================================================
   SMOOTH SCROLL FOR ANCHOR LINKS
   ============================================================ */

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const headerH = document.getElementById('siteHeader')?.offsetHeight || 70;
      const y = target.getBoundingClientRect().top + window.scrollY - headerH - 16;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });
}

/* ============================================================
   ACTIVE NAV HIGHLIGHT
   ============================================================ */

function initNavHighlight() {
  const navLinks = document.querySelectorAll('.main-nav a[href^="#"]');
  window.addEventListener('scroll', () => {
    const fromTop = window.scrollY + 120;
    navLinks.forEach(link => {
      const sec = document.querySelector(link.getAttribute('href'));
      if (!sec) return;
      const top = sec.offsetTop, bottom = top + sec.offsetHeight;
      link.classList.toggle('active', fromTop >= top && fromTop < bottom);
    });
  }, { passive: true });
}

/* ============================================================
   PILOT ROUTE ANIMATION
   ============================================================ */

function buildPilotAnimation() {
  const svg = document.getElementById('pilotRouteSvg');
  if (!svg) return;

  const W = 420, H = 300;

  // Waypoints for Perth → Alice Springs → Sydney (scaled to 420×300 viewBox)
  const PILOT_WPS = [
    { x: 51,  y: 183, label: 'PER' },
    { x: 214, y: 122, label: 'ASP' },
    { x: 370, y: 198, label: 'SYD' }
  ];

  // Single smooth cubic bezier route
  const ROUTE_D = 'M 51,183 C 132,88 292,83 370,198';

  // Defs: glow filter
  const defs = svgEl('defs');
  const filt = svgEl('filter', { id: 'pilotGlow', x: '-40%', y: '-40%', width: '180%', height: '180%' });
  const fblur = svgEl('feGaussianBlur', { stdDeviation: '2.5', result: 'blur' });
  const fmerge = svgEl('feMerge');
  [svgEl('feMergeNode', { in: 'blur' }), svgEl('feMergeNode', { in: 'SourceGraphic' })]
    .forEach(n => fmerge.appendChild(n));
  filt.appendChild(fblur); filt.appendChild(fmerge);
  defs.appendChild(filt);
  svg.appendChild(defs);

  // Background
  svg.appendChild(svgEl('rect', { width: W, height: H, fill: '#0d1525' }));

  // Grid lines
  const gridG = svgEl('g');
  for (let x = 50; x < W; x += 50)
    gridG.appendChild(svgEl('line', { x1: x, y1: 0, x2: x, y2: H,
      stroke: 'rgba(90,171,240,0.06)', 'stroke-width': '0.5' }));
  for (let y = 50; y < H; y += 50)
    gridG.appendChild(svgEl('line', { x1: 0, y1: y, x2: W, y2: y,
      stroke: 'rgba(90,171,240,0.06)', 'stroke-width': '0.5' }));
  svg.appendChild(gridG);

  // Decorative coordinate text
  const coordG = svgEl('g', { opacity: '0.28' });
  [
    ['113°E', 18, 293], ['134°E', 207, 293], ['154°E', 398, 293],
    ['12°S',  W - 8, 28], ['23°S',  W - 8, 120], ['34°S',  W - 8, 198]
  ].forEach(([t, x, y]) => {
    const el = svgEl('text', {
      x, y, fill: '#8a97aa', 'font-size': '7.5',
      'font-family': 'Inter,sans-serif', 'text-anchor': 'middle'
    });
    el.textContent = t;
    coordG.appendChild(el);
  });
  svg.appendChild(coordG);

  // Australia outline (faint geographic context)
  const ausOutlineP = coordsToPath(AUS_OUTLINE_COORDS, W, H, 20, 18);
  svg.appendChild(svgEl('path', {
    d: ausOutlineP,
    fill: 'rgba(22,42,72,0.3)',
    stroke: 'rgba(90,171,240,0.13)',
    'stroke-width': '1', 'stroke-linejoin': 'round'
  }));
  const tasOutlineP = coordsToPath(TASMANIA_COORDS, W, H, 20, 18);
  svg.appendChild(svgEl('path', {
    d: tasOutlineP,
    fill: 'rgba(22,42,72,0.3)',
    stroke: 'rgba(90,171,240,0.13)',
    'stroke-width': '1'
  }));

  // Route glow shadow
  svg.appendChild(svgEl('path', {
    d: ROUTE_D, fill: 'none',
    stroke: 'rgba(90,171,240,0.12)', 'stroke-width': '10', 'stroke-linecap': 'round'
  }));

  // Dashed route path (visible, low opacity — revealed by draw path)
  const routePath = svgEl('path', {
    id: 'pilotRoute', d: ROUTE_D, fill: 'none',
    stroke: 'rgba(90,171,240,0.55)', 'stroke-width': '1.5',
    'stroke-linecap': 'round', 'stroke-dasharray': '6 4'
  });
  svg.appendChild(routePath);

  // Draw-in animation path (solid, animates stroke-dashoffset to reveal route)
  const drawPath = svgEl('path', {
    d: ROUTE_D, fill: 'none',
    stroke: 'rgba(90,171,240,0.45)', 'stroke-width': '2', 'stroke-linecap': 'round'
  });
  svg.appendChild(drawPath);

  // City groups (hidden until animation)
  const cityG = svgEl('g');
  svg.appendChild(cityG);
  const cityGroups = [];
  PILOT_WPS.forEach((wp, i) => {
    const g = svgEl('g');
    g.style.opacity = '0';
    g.style.transition = `opacity 0.5s ease ${1.2 + i * 0.25}s`;

    // Pulse ring
    const ring = svgEl('circle', { cx: wp.x, cy: wp.y, r: 5, fill: 'none',
      stroke: 'rgba(90,171,240,0.65)', 'stroke-width': '1' });
    ring.innerHTML = `<animate attributeName="r" from="5" to="17" dur="2.8s"
      repeatCount="indefinite" begin="${i * 0.65}s"/>
      <animate attributeName="opacity" from="0.65" to="0" dur="2.8s"
      repeatCount="indefinite" begin="${i * 0.65}s"/>`;
    g.appendChild(ring);

    // Inner dot
    g.appendChild(svgEl('circle', { cx: wp.x, cy: wp.y, r: 4,
      fill: '#5aabf0', filter: 'url(#pilotGlow)' }));

    // Label
    const txOff = i === 0 ? 9 : i === 2 ? -9 : 0;
    const anchor = i === 0 ? 'start' : i === 2 ? 'end' : 'middle';
    const tyOff = i === 1 ? -11 : 16;
    const lbl = svgEl('text', {
      x: wp.x + txOff, y: wp.y + tyOff,
      fill: '#b8c4d4', 'font-size': '10.5',
      'font-family': 'Inter,sans-serif', 'font-weight': '600',
      'text-anchor': anchor, 'letter-spacing': '0.04em'
    });
    lbl.textContent = wp.label;
    g.appendChild(lbl);

    cityG.appendChild(g);
    cityGroups.push(g);
  });

  // Contrail path (drawn behind plane)
  const contrailPath = svgEl('path', {
    fill: 'none', stroke: 'rgba(90,171,240,0.22)',
    'stroke-width': '2', 'stroke-linecap': 'round'
  });
  svg.appendChild(contrailPath);

  // Plane group
  const planeG = svgEl('g', { id: 'pilotPlane', opacity: '0' });
  planeG.appendChild(svgEl('polygon', { points: '0,-3 13,0 0,3 3,0',
    fill: '#7eb8ff', filter: 'url(#pilotGlow)' }));
  planeG.appendChild(svgEl('polygon', { points: '1,-3 7.5,-9.5 9,-6.5 3,-1.5',
    fill: '#7eb8ff', opacity: '0.85' }));
  planeG.appendChild(svgEl('polygon', { points: '1,3 7.5,9.5 9,6.5 3,1.5',
    fill: '#7eb8ff', opacity: '0.85' }));
  svg.appendChild(planeG);

  // Store references for later animation trigger
  svg._routePath  = routePath;
  svg._drawPath   = drawPath;
  svg._planeG     = planeG;
  svg._contrailP  = contrailPath;
  svg._cityGroups = cityGroups;
  svg._animated   = false;
}

function startPilotAnimation(svg) {
  if (!svg || svg._animated) return;
  svg._animated = true;

  const { _routePath: rp, _drawPath: dp, _planeG: pg,
          _contrailP: cp, _cityGroups: cg } = svg;
  if (!rp || !dp) return;

  // Reveal city markers
  cg.forEach(g => { g.style.opacity = '1'; });

  // Animate route draw-in via stroke-dashoffset
  const len = rp.getTotalLength();
  dp.style.strokeDasharray = len;
  dp.style.strokeDashoffset = len;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      dp.style.transition = 'stroke-dashoffset 2s ease 0.3s';
      dp.style.strokeDashoffset = '0';
    });
  });

  // Launch plane after route finishes drawing
  setTimeout(() => {
    pg.style.opacity = '1';
    animatePilotPlane(rp, pg, cp, len);
  }, 2600);
}

function animatePilotPlane(routePath, planeG, contrailPath, totalLen) {
  const DURATION = 5200;
  const PAUSE    = 1000;
  let startTime  = null;
  let trail      = [];

  function frame(ts) {
    if (!startTime) startTime = ts;
    const elapsed  = ts - startTime;
    const cycle    = DURATION + PAUSE;
    const progress = elapsed % cycle;

    if (progress >= DURATION) {
      // Pause phase — reset trail, wait
      trail = [];
      contrailPath.setAttribute('d', '');
      requestAnimationFrame(frame);
      return;
    }

    const t      = progress / DURATION;
    const eased  = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const dist   = Math.min(eased * totalLen, totalLen - 0.5);
    const pt     = routePath.getPointAtLength(dist);
    const pt2    = routePath.getPointAtLength(Math.min(dist + 2, totalLen));
    const angle  = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI;

    planeG.setAttribute('transform',
      `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)}) rotate(${angle.toFixed(1)})`);

    // Rolling contrail
    trail.push({ x: pt.x, y: pt.y });
    if (trail.length > 30) trail.shift();
    if (trail.length > 1) {
      contrailPath.setAttribute('d',
        'M ' + trail.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L '));
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function initPilotSectionObserver() {
  const section = document.getElementById('pilot-registration');
  const svg     = document.getElementById('pilotRouteSvg');
  if (!section || !svg) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        startPilotAnimation(svg);
        obs.unobserve(section);
      }
    });
  }, { threshold: 0.25 });

  obs.observe(section);
}

/* ============================================================
   PILOT MODAL
   ============================================================ */

function initPilotModal() {
  const openBtn  = document.getElementById('openPilotModal');
  const closeBtn = document.getElementById('closePilotModal');
  const modal    = document.getElementById('pilotModal');
  if (!openBtn || !modal) return;

  function openModal() {
    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    // Move focus into modal
    const firstFocusable = modal.querySelector('button, [href], input, select, textarea');
    if (firstFocusable) firstFocusable.focus();
  }

  function closeModal() {
    modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
    openBtn.focus();
  }

  openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  // Close on overlay click
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hasAttribute('hidden')) closeModal();
  });

  // Trap focus within modal
  modal.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(
      modal.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter(el => !el.closest('[hidden]'));
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });
}

/* ============================================================
   PILOT REGISTRATION FORM
   ============================================================ */

function initPilotForm() {
  const form   = document.getElementById('pilotForm');
  if (!form) return;

  const submitBtn  = form.querySelector('.form-submit');
  const formStatus = document.getElementById('pilotFormStatus');

  function showErr(input, msg) {
    input.classList.add('error');
    const el = input.parentElement.querySelector('.form-error-msg');
    if (el) { el.textContent = msg; el.classList.add('show'); }
  }
  function clearErr(input) {
    input.classList.remove('error');
    const el = input.parentElement.querySelector('.form-error-msg');
    if (el) el.classList.remove('show');
  }
  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function validate() {
    let ok = true;
    form.querySelectorAll('[required]').forEach(inp => {
      clearErr(inp);
      if (!inp.value.trim()) { showErr(inp, 'This field is required.'); ok = false; }
    });
    const em = form.querySelector('#pilotEmail');
    if (em && em.value.trim() && !isValidEmail(em.value.trim())) {
      showErr(em, 'Please enter a valid email address.'); ok = false;
    }
    return ok;
  }

  form.querySelectorAll('[required], #pilotEmail').forEach(inp => {
    inp.addEventListener('blur', () => { if (inp.value.trim()) clearErr(inp); });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (formStatus) { formStatus.className = 'form-status'; formStatus.textContent = ''; }
    if (!validate()) return;

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
      const res  = await fetch('https://api.web3forms.com/submit', {
        method: 'POST', body: new FormData(form)
      });
      const json = await res.json();
      if (json.success) {
        formStatus.className = 'form-status success';
        formStatus.textContent =
          '✓ Expression of interest submitted! We\'ll be in touch if suitable opportunities arise.';
        form.reset();
      } else {
        throw new Error(json.message || 'Submission failed');
      }
    } catch {
      if (formStatus) {
        formStatus.className = 'form-status error';
        formStatus.textContent =
          '✗ Something went wrong. Please contact us directly on 0414 250 344.';
      }
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  });
}

/* ============================================================
   INIT ON DOM READY
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initScrollProgress();
  initHeader();
  initMobileMenu();
  initSmoothScroll();
  initNavHighlight();
  initScrollReveal();
  initCounters();
  initProcessSteps();
  initTestimonialSlider();
  initFAQ();
  initContactForm();
  initFloatingButtons();
  initPilotModal();
  initPilotForm();

  // Build SVG maps
  buildHeroMap();
  buildCoverageMap();
  initCoverageObserver();
  buildPilotAnimation();
  initPilotSectionObserver();
});
