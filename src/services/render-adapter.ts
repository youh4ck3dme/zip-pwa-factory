import { StepOutput } from "../types/pipeline";

export function renderPWAArtifacts(artifacts: Record<string, unknown>): {
  manifest: string;
  serviceWorker: string;
  html: string;
  assets: Record<string, string>;
} {
  const manifest = artifacts.manifest ? JSON.stringify(artifacts.manifest, null, 2) : generateDefaultManifest();
  const serviceWorker = artifacts.serviceWorkerCode || generateDefaultServiceWorker();
  const html = generatePWAHTML(artifacts);
  const assets = {
    "manifest.json": manifest,
    "sw.js": serviceWorker,
    "index.html": html,
    ...(artifacts.icons ? { "icon.png": artifacts.icons } : {}),
  };
  
  return { manifest, serviceWorker, html, assets };
}

function generateDefaultManifest(): string {
  return JSON.stringify({
    "name": "My PWA",
    "short_name": "PWA",
    "start_url": "/",
    "display": "standalone",
    "theme_color": "#ffffff",
    "background_color": "#ffffff",
    "description": "A Progressive Web App",
    "icons": [
      {
        "src": "/icon.png",
        "sizes": "192x192",
        "type": "image/png"
      }
    ]
  }, null, 2);
}

function generateDefaultServiceWorker(): string {
  return `// Default Service Worker for PWA
const CACHE_NAME = 'pwa-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
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

function generatePWAHTML(artifacts: Record<string, unknown>): string {
  const manifest = artifacts.manifest || JSON.parse(generateDefaultManifest());
  const title = manifest?.name || "PWA";
  const themeColor = manifest?.theme_color || "#ffffff";
  const backgroundColor = manifest?.background_color || "#ffffff";
  const display = manifest?.display || "standalone";
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="theme-color" content="${themeColor}">
  <meta name="background-color" content="${backgroundColor}">
  <meta name="description" content="${manifest?.description || 'A Progressive Web App'}">
  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/icon.png">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      background-color: ${backgroundColor};
      color: ${themeColor === '#ffffff' || themeColor === '#fff' ? '#000000' : '#ffffff'};
      min-height: 100vh;
    }
    
    #app {
      padding: 2rem;
      text-align: center;
      max-width: 800px;
      margin: 0 auto;
    }
    
    h1 {
      margin: 0 0 1rem 0;
      font-size: 2.5rem;
      font-weight: 600;
    }
    
    p {
      font-size: 1.1rem;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    
    .install-prompt {
      margin-top: 2rem;
      padding: 1.5rem;
      background: rgba(0, 0, 0, 0.05);
      border-radius: 12px;
      border: 1px solid rgba(0, 0, 0, 0.1);
    }
    
    .install-prompt h2 {
      font-size: 1.25rem;
      margin-bottom: 0.5rem;
    }
    
    .install-prompt p {
      margin-bottom: 1rem;
      font-size: 1rem;
    }
    
    #installButton {
      background: ${themeColor};
      color: ${themeColor === '#ffffff' || themeColor === '#fff' ? '#000000' : '#ffffff'};
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    
    #installButton:hover {
      opacity: 0.9;
    }
    
    .offline-indicator {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      background: #ff4444;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      display: none;
    }
    
    .offline-indicator.visible {
      display: block;
    }
  </style>
</head>
<body>
  <div id="app">
    <h1>${title}</h1>
    <p>Welcome to your Progressive Web App! This app works offline and can be installed on your device.</p>
    
    <div class="install-prompt" id="installPrompt" style="display: none;">
      <h2>Install App</h2>
      <p>Install this app for offline access and a better experience.</p>
      <button id="installButton">Install</button>
    </div>
    
    <div class="offline-indicator" id="offlineIndicator">
      You are offline. Some features may be limited.
    </div>
  </div>
  
  <script>
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => {
            console.log('Service Worker registered:', reg);
            
            // Check for updates
            reg.onupdatefound = () => {
              console.log('Service Worker update found');
            };
          })
          .catch(err => {
            console.log('Service Worker registration failed: ', err);
          });
      });
    }
    
    // Install prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      document.getElementById('installPrompt').style.display = 'block';
    });
    
    document.getElementById('installButton').addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
            document.getElementById('installPrompt').style.display = 'none';
          }
          deferredPrompt = null;
        });
      }
    });
    
    // Offline detection
    window.addEventListener('offline', () => {
      document.getElementById('offlineIndicator').classList.add('visible');
    });
    
    window.addEventListener('online', () => {
      document.getElementById('offlineIndicator').classList.remove('visible');
    });
    
    // Check initial online status
    if (!navigator.onLine) {
      document.getElementById('offlineIndicator').classList.add('visible');
    }
  </script>
</body>
</html>`;
}

// Generate a complete PWA package as a ZIP-compatible structure
export function generatePWAPackage(artifacts: Record<string, unknown>): {
  files: Record<string, string>;
  manifest: unknown;
  serviceWorker: string;
  html: string;
} {
  const { manifest, serviceWorker, html, assets } = renderPWAArtifacts(artifacts);
  
  return {
    files: assets,
    manifest: JSON.parse(manifest),
    serviceWorker,
    html
  };
}
