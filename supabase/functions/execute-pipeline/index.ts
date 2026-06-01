// @ts-ignore - Deno imports are valid in Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { completePrompt } from "../_shared/ai.ts";
import { interpolate, evaluateQualityGate } from "../_shared/pipeline-utils.ts";

// @ts-ignore - Deno is available in Supabase Edge Functions
declare const Deno: any;

/**
 * Generate a default basic PWA export package
 */
function generateDefaultExport(pipelineTitle: string, context: Record<string, unknown>): Record<string, unknown> {
  const safeContext = JSON.parse(JSON.stringify(context));
  return {
    "index.html": `<!DOCTYPE html><html><head><title>${pipelineTitle}</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><div id="root"></div></body></html>`,
    "manifest.json": { name: pipelineTitle, short_name: "App", display: "standalone", theme_color: "#000000" },
    "context.json": safeContext,
    "README.md": `# ${pipelineTitle}

Generated PWA package.

## Installation
Serve static files from any HTTP server:
\`\`\`bash
npx serve .
\`\`\`
`,
    "execution-summary.json": {
      generatedAt: new Date().toISOString(),
      pipelineTitle: pipelineTitle,
      pwaReady: true
    }
  };
}

/**
 * Check if the pipeline appears to be for an agency landing page
 * Based on pipeline title and context keys
 */
function isAgencyPipeline(pipelineTitle: string | undefined, context: Record<string, unknown>): boolean {
  if (!pipelineTitle) return false;
  
  const lowerTitle = pipelineTitle.toLowerCase();
  const agencyKeywords = [
    "barber", "salon", "spa", "restaurant", "cafe", "bistro", "diner",
    "agency", "business", "shop", "store", "boutique", "studio",
    "landing", "pwa", "premium", "professional"
  ];
  
  // Check title
  if (agencyKeywords.some(keyword => lowerTitle.includes(keyword))) {
    return true;
  }
  
  // Check context for agency-specific keys
  const agencyContextKeys = ["agencySpec", "heroSection", "services", "bookingCTA", "agencyExport"];
  if (agencyContextKeys.some(key => key in context)) {
    return true;
  }
  
  return false;
}

/**
 * Extract rich text from various context formats
 */
function extractText(data: unknown, fallback: string): string {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    return extractText(obj.headline || obj.title || obj.name || obj.text || obj.content, fallback);
  }
  return fallback;
}

/**
 * Extract description from various context formats
 */
function extractDescription(data: unknown, fallback: string): string {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    return extractDescription(
      obj.description || obj.subheadline || obj.tagline || obj.details || obj.bio,
      fallback
    );
  }
  return fallback;
}

/**
 * Extract items array from context
 */
function extractItems(data: unknown): Array<{ name: string; description: string; price?: string }> {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map((item, index) => ({
      name: extractText(item, `Item ${index + 1}`),
      description: extractDescription(item, ""),
      price: (item as any)?.price || (item as any)?.cost
    }));
  }
  return [];
}

/**
 * Generate a polished Agency Landing PWA package
 * Creates a premium, production-ready landing page for local businesses
 */
function generateAgencyLandingExport(pipelineTitle: string, context: Record<string, unknown>): Record<string, unknown> {
  const safeContext = JSON.parse(JSON.stringify(context));
  
  // Extract agency-specific data from context
  const agencySpec = safeContext.agencySpec || {};
  const heroSection = safeContext.heroSection || {};
  const services = safeContext.services || [];
  const bookingCTA = safeContext.bookingCTA || {};
  
  // Extract from agencySpec if it has structured data
  let brandName = pipelineTitle;
  let seoDescription = `Discover the best ${pipelineTitle.toLowerCase()} services. Modern, professional, and convenient.`;
  let heroHeadline = `Premium ${pipelineTitle} Experience`;
  let heroSubheadline = `Discover the best ${pipelineTitle.toLowerCase()} services in town. Modern, professional, and convenient.`;
  let heroCTA = "Book Now";
  let contactInfo = {};
  let openingHours = [];
  let socialLinks = [];
  let menuItems = [];
  
  // Try to extract rich data from agencySpec
  if (typeof agencySpec === 'object' && agencySpec !== null) {
    const spec = agencySpec as Record<string, unknown>;
    
    // Extract from pwaSpecification
    const pwaSpec = spec.pwaSpecification as Record<string, unknown> | undefined;
    if (pwaSpec) {
      brandName = extractText(pwaSpec.name || pwaSpec.title, brandName);
      seoDescription = extractDescription(pwaSpec.seo?.meta?.description || pwaSpec.description, seoDescription);
    }
    
    // Extract from landingPageStructure
    const landingPage = spec.landingPageStructure as Record<string, unknown> | undefined;
    if (landingPage) {
      const hero = landingPage.heroSection as Record<string, unknown> | undefined;
      if (hero) {
        heroHeadline = extractText(hero.headline || hero.title, heroHeadline);
        heroSubheadline = extractDescription(hero.subheadline || hero.tagline || hero.description, heroSubheadline);
        heroCTA = extractText(hero.cta || hero.callToAction, heroCTA);
      }
      
      // Extract contact/footers
      const footer = landingPage.footer as Record<string, unknown> | undefined;
      if (footer) {
        contactInfo = {
          phone: extractText(footer.contact?.phone, "+1-555-0123"),
          email: extractText(footer.contact?.email, "contact@business.com"),
          address: extractText(footer.contact?.address, "123 Main Street")
        };
        openingHours = extractItems(footer.hours || footer.openingHours) || [];
        socialLinks = extractItems(footer.social || footer.socialMedia) || [];
      }
      
      // Extract menu for restaurants
      const menu = landingPage.menuPreview as Record<string, unknown> | undefined;
      if (menu) {
        menuItems = extractItems(menu.items || menu.dishes);
      }
      
      // Extract reservation system
      const reservation = spec.reservationSystem as Record<string, unknown> | undefined;
      if (reservation) {
        bookingHeadline = extractText(reservation.headline || reservation.title, "Ready to book?");
        bookingDescription = extractDescription(reservation.description, `Schedule your appointment today and experience the difference.`);
        bookingButtonText = extractText(reservation.buttonText || reservation.cta, "Book Appointment");
      }
    }
    
    // Fallback to direct fields in agencySpec
    if (!brandName || brandName === pipelineTitle) {
      brandName = extractText(spec.name || spec.title || spec.businessName, pipelineTitle);
    }
  }
  
  // Determine colors from agencySpec theme or fallback to defaults
  let primaryColor = "#1a1a2e";
  let secondaryColor = "#16213e";
  let accentColor = "#e94560";
  
  const lowerTitle = pipelineTitle.toLowerCase();
  
  // Extract colors from agencySpec theme if available
  if (typeof agencySpec === 'object' && agencySpec !== null) {
    const spec = agencySpec as Record<string, unknown>;
    const theme = spec.theme as Record<string, unknown> | undefined;
    if (theme) {
      primaryColor = extractText(theme.primaryColor, primaryColor);
      secondaryColor = extractText(theme.secondaryColor, secondaryColor);
      accentColor = extractText(theme.accentColor || theme.brandColor, accentColor);
    }
  }
  
  // Fallback color scheme based on business type
  if (primaryColor === "#1a1a2e") {
    if (lowerTitle.includes("barber")) {
      primaryColor = "#0f0f0f";
      secondaryColor = "#1a1a1a";
      accentColor = "#b8860b"; // Gold
    } else if (lowerTitle.includes("salon") || lowerTitle.includes("spa")) {
      primaryColor = "#1a1a2e";
      secondaryColor = "#16213e";
      accentColor = "#e94560";
    } else if (lowerTitle.includes("restaurant") || lowerTitle.includes("cafe") || lowerTitle.includes("bistro") || lowerTitle.includes("diner")) {
      primaryColor = "#0f0f0f";
      secondaryColor = "#1a1a1a";
      accentColor = "#d4a574";
    } else if (lowerTitle.includes("agency")) {
      primaryColor = "#0a0a1a";
      secondaryColor = "#141428";
      accentColor = "#00d4ff";
    }
  }
  
  // Generate booking CTA
  let bookingHeadline = "Ready to book?";
  let bookingDescription = `Schedule your appointment today and experience the difference.`;
  let bookingButtonText = "Book Appointment";
  
  if (typeof bookingCTA === 'object' && bookingCTA !== null) {
    const bcta = bookingCTA as Record<string, unknown>;
    bookingHeadline = extractText(bcta.headline || bcta.title, bookingHeadline);
    bookingDescription = extractDescription(bcta.description || bcta.text, bookingDescription);
    bookingButtonText = extractText(bcta.buttonText || bcta.cta, bookingButtonText);
  }
  
  // Generate services list
  const servicesList = extractItems(services) || [
    { name: "Professional Service", description: "Expert care tailored to your needs" },
    { name: "Premium Quality", description: "Only the best for our customers" },
    { name: "Convenient Booking", description: "Easy online appointment scheduling" },
    { name: "5-Star Experience", description: "Rated excellent by our clients" }
  ];
  
  // Use menu items if available (for restaurants)
  if (menuItems.length > 0) {
    // If we have menu items and no services, use menu items as services
    if (servicesList.length === 0 || (servicesList.length === 1 && servicesList[0].name === "Professional Service")) {
      // Don't replace if services already has real data
      if (servicesList.length === 4 && servicesList[0].name === "Professional Service") {
        // These are fallbacks, replace with menu items
        servicesList.splice(0, servicesList.length, ...menuItems.slice(0, 4));
      }
    }
  }
  
  // Build HTML with rich data
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${seoDescription.replace(/"/g, '&quot;')}">
  <meta name="theme-color" content="${primaryColor}">
  <title>${brandName.replace(/"/g, '&quot;')}</title>
  <link rel="manifest" href="/manifest.json">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    :root {
      --primary: ${primaryColor};
      --secondary: ${secondaryColor};
      --accent: ${accentColor};
      --text: #ffffff;
      --text-dark: #1a1a2e;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.6;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
    }
    
    /* Hero Section */
    .hero {
      text-align: center;
      padding: 6rem 0 4rem 0;
    }
    
    .hero h1 {
      font-size: clamp(2.5rem, 5vw, 4rem);
      font-weight: 800;
      margin-bottom: 1.5rem;
      letter-spacing: -0.02em;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    
    .hero p {
      font-size: clamp(1rem, 2vw, 1.25rem);
      max-width: 600px;
      margin: 0 auto 2.5rem auto;
      opacity: 0.9;
      color: rgba(255,255,255,0.85);
    }
    
    .cta-button {
      display: inline-block;
      background: var(--accent);
      color: var(--text);
      padding: 1rem 2rem;
      border: none;
      border-radius: 50px;
      font-size: 1.1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      text-decoration: none;
    }
    
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.3);
      background: color-mix(in srgb, var(--accent), white 20%);
    }
    
    .cta-button:active {
      transform: translateY(0);
    }
    
    /* Services Section */
    .services {
      padding: 4rem 0;
      background: var(--secondary);
    }
    
    .services h2 {
      text-align: center;
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 3rem;
      position: relative;
    }
    
    .services h2::after {
      content: '';
      position: absolute;
      bottom: -10px;
      left: 50%;
      transform: translateX(-50%);
      width: 60px;
      height: 4px;
      background: var(--accent);
      border-radius: 2px;
    }
    
    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
    }
    
    .service-card {
      background: rgba(255,255,255,0.05);
      padding: 2rem;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.1);
      transition: all 0.3s ease;
      text-align: center;
    }
    
    .service-card:hover {
      transform: translateY(-5px);
      background: rgba(255,255,255,0.08);
      border-color: var(--accent);
    }
    
    .service-card h3 {
      font-size: 1.3rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
      color: var(--text);
    }
    
    .service-card p {
      color: rgba(255,255,255,0.7);
      font-size: 0.95rem;
    }
    
    /* Booking Section */
    .booking {
      padding: 4rem 0;
      text-align: center;
      background: linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%);
    }
    
    .booking h2 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }
    
    .booking p {
      max-width: 500px;
      margin: 0 auto 2rem auto;
      opacity: 0.85;
    }
    
    /* Footer */
    .footer {
      padding: 3rem 0 2rem 0;
      border-top: 1px solid rgba(255,255,255,0.1);
      background: rgba(0,0,0,0.2);
    }
    .footer-content {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
    }
    .footer-brand h3 {
      font-size: 1.3rem;
      margin-bottom: 0.5rem;
      color: var(--text);
    }
    .footer-brand p, .footer-contact p, .footer-hours p, .footer-social p {
      color: rgba(255,255,255,0.7);
      font-size: 0.9rem;
      margin: 0.25rem 0;
    }
    .footer-contact a, .footer-social a {
      color: var(--accent);
      text-decoration: none;
    }
    .footer-contact a:hover, .footer-social a:hover {
      text-decoration: underline;
    }
    .footer-hours h4, .footer-social h4 {
      color: var(--text);
      font-size: 1rem;
      margin-bottom: 0.5rem;
    }
    .footer-copyright {
      text-align: center;
      padding-top: 2rem;
      margin-top: 2rem;
      border-top: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.5);
      font-size: 0.85rem;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .hero {
        padding: 4rem 0 2rem 0;
      }
      .services, .booking {
        padding: 3rem 0;
      }
    }
    
    /* Install prompt for PWA */
    .install-prompt {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      background: var(--primary);
      color: var(--text);
      padding: 1rem 2rem;
      border-radius: 12px;
      border: 1px solid var(--accent);
      box-shadow: 0 8px 30px rgba(0,0,0,0.4);
      z-index: 1000;
      display: none;
      animation: slideUp 0.4s ease;
    }
    
    .install-prompt.visible {
      display: block;
    }
    
    .install-prompt button {
      background: var(--accent);
      color: var(--text);
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 0.5rem;
    }
    
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translate(-50%, 20px);
      }
      to {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    }
    
    /* Loading animation */
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .loading {
      animation: pulse 2s infinite;
    }
  </style>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
</head>
<body>
  <div class="container">
    <!-- Hero Section -->
    <section class="hero">
      <h1>${heroHeadline.replace(/"/g, '&quot;')}</h1>
      <p>${heroSubheadline.replace(/"/g, '&quot;')}</p>
      <a href="#booking" class="cta-button">${heroCTA.replace(/"/g, '&quot;')}</a>
    </section>
    
    <!-- Services Section -->
    <section class="services">
      <h2>Our Services</h2>
      <div class="services-grid">
        ${servicesList.map((service: any) => {
          const name = service.name || service.title || "Service";
          const description = service.description || service.details || "Professional service";
          return `<div class="service-card">
            <h3>${name}</h3>
            <p>${description}</p>
          </div>`;
        }).join('')}
      </div>
    </section>
    
    <!-- Booking Section -->
    <section class="booking" id="booking">
      <h2>${bookingHeadline.replace(/"/g, '&quot;')}</h2>
      <p>${bookingDescription.replace(/"/g, '&quot;')}</p>
      <a href="tel:${(contactInfo as any).phone || '+1-555-0123'}" class="cta-button">${bookingButtonText.replace(/"/g, '&quot;')}</a>
    </section>
    
    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-brand">
          <h3>${brandName.replace(/"/g, '&quot;')}</h3>
          <p>${(contactInfo as any).address || '123 Main Street'}</p>
        </div>
        <div class="footer-contact">
          <p><strong>Phone:</strong> <a href="tel:${(contactInfo as any).phone || '+1-555-0123'}">${(contactInfo as any).phone || '+1-555-0123'}</a></p>
          <p><strong>Email:</strong> <a href="mailto:${(contactInfo as any).email || 'contact@business.com'}">${(contactInfo as any).email || 'contact@business.com'}</a></p>
        </div>
        ${openingHours.length > 0 ? `
        <div class="footer-hours">
          <h4>Opening Hours</h4>
          ${openingHours.map((h: any) => `<p>${h.name}: ${h.description || h.price || ''}</p>`).join('')}
        </div>
        ` : ''}
        ${socialLinks.length > 0 ? `
        <div class="footer-social">
          <h4>Connect With Us</h4>
          ${socialLinks.map((s: any) => `<a href="${s.description || s.price || '#'}" target="_blank">${s.name}</a>`).join(' | ')}
        </div>
        ` : ''}
      </div>
      <div class="footer-copyright">
        <p>&copy; ${new Date().getFullYear()} ${brandName.replace(/"/g, '&quot;')}. All rights reserved.</p>
      </div>
    </footer>
  </div>
  
  <!-- Install Prompt -->
  <div class="install-prompt" id="installPrompt">
    <p><strong>Install App</strong><br>Add to home screen for offline access</p>
    <button id="installButton">Install Now</button>
  </div>
  
  <script>
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log(err));
      });
    }
    
    // PWA Install Prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      document.getElementById('installPrompt').classList.add('visible');
    });
    
    document.getElementById('installButton').addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
          document.getElementById('installPrompt').style.display = 'none';
        });
      }
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    });
  </script>
</body>
</html>`;
  
  // Build manifest with rich data
  const manifest = {
    name: brandName,
    short_name: brandName.substring(0, 12),
    start_url: "/",
    display: "standalone",
    background_color: primaryColor,
    theme_color: primaryColor,
    description: seoDescription,
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
  
  return {
    "index.html": html,
    "manifest.json": manifest,
    "context.json": safeContext,
    "sw.js": generateAgencyServiceWorker(pipelineTitle),
    "README.md": `# ${pipelineTitle}

A premium PWA landing page for ${businessType}.

## Features
- Modern, responsive design
- Hero section with CTA
- Services showcase
- Booking call-to-action
- Progressive Web App (PWA) ready

## Installation
Simply serve the static files from any HTTP server:

\`\`\`bash
npx serve .
\`\`\`

Or deploy to any static hosting service (Netlify, Vercel, Cloudflare Pages, etc.)

## Files
- index.html - Main landing page
- manifest.json - PWA manifest
- sw.js - Service worker for offline support
- context.json - Generated context data
`,
    "execution-summary.json": {
      generatedAt: new Date().toISOString(),
      pipelineTitle: pipelineTitle,
      brandName: brandName,
      businessType: businessType,
      sections: ["Hero", "Services", "Booking CTA", "Footer"],
      pwaReady: true,
      hasContactInfo: Object.keys(contactInfo).length > 0,
      hasOpeningHours: openingHours.length > 0,
      hasSocialLinks: socialLinks.length > 0
    }
  };
}

/**
 * Generate a service worker for agency PWA with caching
 */
function generateAgencyServiceWorker(appName: string): string {
  return `// Agency PWA Service Worker
const CACHE_NAME = '${appName}-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sw.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const pipelineId = body?.pipelineId || body?.pipeline_id;
    const initialInput = typeof body?.input === "string" ? body.input : (typeof body?.initial_input === "string" ? body.initial_input : "");
    const mode = body?.mode || "default";

    if (!pipelineId || typeof pipelineId !== "string" || !UUID_RE.test(pipelineId))
      return json({ error: "Invalid pipelineId" }, 400);
    if (initialInput.length > 5000) return json({ error: "input too long (max 5000 chars)" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: pipeline, error: pErr } = await admin
      .from("pipelines")
      .select("id, owner_id, title, steps")
      .eq("id", pipelineId)
      .maybeSingle();
    if (pErr || !pipeline) return json({ error: "Pipeline not found" }, 404);

    const steps = pipeline.steps as Array<{
      id: string;
      title?: string;
      name?: string;
      type?: string;
      prompt: string;
      expectedOutput?: string;
      inputKeys?: string[];
      outputKey?: string;
    }>;
    if (!Array.isArray(steps) || steps.length === 0) {
      return json({ error: "Pipeline has no steps" }, 400);
    }

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!roleRow;
    if (pipeline.owner_id !== userId && !isAdmin) return json({ error: "Forbidden" }, 403);

    // Set timeout limits for MVP synchronous execution
    const MAX_STEP_TIMEOUT = 45000; // 45s per step
    const MAX_TOTAL_TIMEOUT = 180000; // 180s total
    const executionStartTime = Date.now();

    // Create execution with running status (not queued)
    const { data: exec, error: eErr } = await admin
      .from("executions")
      .insert({
        pipeline_id: pipelineId,
        owner_id: userId,
        initial_input: initialInput,
        status: "running",
        logs: [],
      })
      .select()
      .single();
    if (eErr) {
      console.error("Insert execution failed:", eErr);
      return json({ error: "Failed to start execution" }, 500);
    }

    // Execute all steps synchronously - NO background IIFE
    const logs: Array<any> = [];
    const context: Record<string, unknown> = { input: initialInput };
    let artifacts: Record<string, unknown> = {};
    let failed = false;

    try {
      for (const step of steps) {
        // Check total timeout
        if (Date.now() - executionStartTime > MAX_TOTAL_TIMEOUT) {
          throw new Error(`Total execution timeout exceeded (${MAX_TOTAL_TIMEOUT}ms)`);
        }

        const startTime = Date.now();
        const logEntry = {
          stepId: step.id,
          stepName: step.title || step.name || "Unknown Step",
          outputKey: step.outputKey || "default_out",
          status: "running",
          promptUsed: step.prompt || "",
          data: null as unknown,
          summary: undefined as string | undefined,
          qualityScore: 0,
          warnings: [] as string[],
          durationMs: 0,
          error: undefined as string | undefined,
        };
        logs.push(logEntry);
        await admin.from("executions").update({ logs, updated_at: new Date().toISOString() }).eq("id", exec.id);

        try {
          const promptUsed = interpolate(step.prompt || "", context);
          const stepType = step.type || "ai_generate";
          logEntry.promptUsed = promptUsed;
          let stepData: unknown = null;
          let summary = "";

          // Check per-step timeout before AI calls
          if (Date.now() - startTime > MAX_STEP_TIMEOUT) {
            throw new Error(`Step timeout exceeded (${MAX_STEP_TIMEOUT}ms)`);
          }

          if (stepType === "ai_generate") {
            const instructions = step.expectedOutput === "json" 
              ? `${promptUsed}\n\nIMPORTANT: Return ONLY valid JSON.`
              : promptUsed;
            const out = await completePrompt(instructions, logEntry.stepName);
            if (step.expectedOutput === "json") {
              try {
                const jsonStr = out.replace(/^```json/m, "").replace(/```$/m, "").trim();
                stepData = JSON.parse(jsonStr);
                summary = "JSON generated successfully.";
              } catch(e) {
                stepData = out;
                summary = "Failed to parse JSON, returning raw text.";
                logEntry.warnings.push("JSON parse error");
              }
            } else {
              stepData = out;
            }
          } else if (stepType === "transform") {
            const out = await completePrompt(`Transform the following data based on the instructions.\nData: ${JSON.stringify(context)}\nInstructions: ${promptUsed}`);
            stepData = out;
          } else if (stepType === "validate") {
            const out = await completePrompt(`Validate the context against these rules. Reply with "OK" if valid, or a list of errors if invalid.\nContext: ${JSON.stringify(context)}\nRules: ${promptUsed}`);
            stepData = out;
            if (!out.toLowerCase().startsWith("ok")) {
              logEntry.warnings.push("Validation issues found");
            }
          } else if (stepType === "export") {
            if (isAgencyPipeline(pipeline.title, context)) {
              stepData = generateAgencyLandingExport(pipeline.title, context);
            } else {
              stepData = generateDefaultExport(pipeline.title, context);
            }
            artifacts = stepData as Record<string, unknown>;
            summary = "PWA package exported successfully.";
          } else if (stepType === "webhook") {
            stepData = "Webhook placeholder - disabled by default";
            logEntry.warnings.push("Webhook disabled");
          } else {
            stepData = `Unknown step type: ${stepType}`;
          }

          if (logEntry.outputKey) {
            context[logEntry.outputKey] = stepData;
          }

          logEntry.status = "completed";
          logEntry.data = stepData;
          logEntry.summary = summary || undefined;
          const qualityScore = logEntry.warnings.length > 0 ? 0.75 : 1.0;
          const gate = evaluateQualityGate(qualityScore, 0.8);
          if (!gate.passed) {
            logEntry.warnings.push(...gate.warnings);
          }
          logEntry.qualityScore = qualityScore;
          logEntry.durationMs = Date.now() - startTime;
        } catch (err: any) {
          console.error(`Step ${step.id} failed:`, err);
          logEntry.status = "failed";
          logEntry.error = err.message || "Step execution failed";
          logEntry.durationMs = Date.now() - startTime;
          failed = true;
          await admin
            .from("executions")
            .update({ logs, status: "failed", updated_at: new Date().toISOString() })
            .eq("id", exec.id);
          break;
        }
        await admin.from("executions").update({ logs, updated_at: new Date().toISOString() }).eq("id", exec.id);
      }
      
      // Get final execution state from DB
      const { data: finalExec } = await admin
        .from("executions")
        .select("*")
        .eq("id", exec.id)
        .single();

      if (!failed) {
        await admin
          .from("executions")
          .update({ 
            logs, 
            status: "completed", 
            pwa_assets: Object.keys(artifacts).length > 0 ? artifacts : null,
            updated_at: new Date().toISOString() 
          })
          .eq("id", exec.id);
      }

      // Return the completed/failed execution with full data
      const { data: resultExec } = await admin
        .from("executions")
        .select("*")
        .eq("id", exec.id)
        .single();

      return json(resultExec);
    } catch (err) {
      console.error("Execution loop failed:", err);
      await admin
        .from("executions")
        .update({
          logs,
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", exec.id);

      const { data: failedExec } = await admin
        .from("executions")
        .select("*")
        .eq("id", exec.id)
        .single();

      return json(failedExec || { error: "Execution failed" }, 500);
    }
  } catch (e) {
    console.error("execute-pipeline error:", e);
    return json({ error: "An internal error occurred" }, 500);
  }
});
