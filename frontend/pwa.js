// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(registration) {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('New service worker found...');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New content is available; please refresh.');
              showUpdateNotification();
            }
          });
        });
      })
      .catch(function(error) {
        console.log('ServiceWorker registration failed: ', error);
      });
  });

  // Listen for claiming of service worker
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

// Show update notification
function showUpdateNotification() {
  if (confirm('A new version of BookHub is available. Reload to update?')) {
    window.location.reload();
  }
}

// Install prompt
let deferredPrompt;
const installButton = document.getElementById('installButton');

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  // Show install button if it exists
  if (installButton) {
    installButton.style.display = 'block';
    installButton.addEventListener('click', installApp);
  }
  // Show custom install prompt
  showInstallPromotion();
});

function showInstallPromotion() {
  const installPromotion = document.createElement('div');
  installPromotion.id = 'installPromotion';
  installPromotion.innerHTML = `
    <div style="position: fixed; bottom: 20px; left: 20px; right: 20px; background: #3498db; color: white; padding: 15px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong>📱 Install BookHub App</strong>
        <p style="margin: 5px 0 0 0; font-size: 0.9em;">Get the full app experience</p>
      </div>
      <div>
        <button onclick="installApp()" style="background: white; color: #3498db; border: none; padding: 8px 16px; border-radius: 5px; font-weight: bold; cursor: pointer;">Install</button>
        <button onclick="dismissInstall()" style="background: transparent; color: white; border: none; margin-left: 10px; cursor: pointer;">✕</button>
      </div>
    </div>
  `;
  document.body.appendChild(installPromotion);
}

async function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      // Hide the install promotion
      dismissInstall();
    }
    deferredPrompt = null;
  }
}

function dismissInstall() {
  const promotion = document.getElementById('installPromotion');
  if (promotion) {
    promotion.remove();
  }
}

// Check if app is running in standalone mode
function isRunningStandalone() {
  return (window.matchMedia('(display-mode: standalone)').matches) || 
         (window.navigator.standalone) || 
         (document.referrer.includes('android-app://'));
}

// Add standalone specific styles if running as app
if (isRunningStandalone()) {
  document.documentElement.classList.add('standalone');
  
  // Add safe area insets for notch phones
  const style = document.createElement('style');
  style.textContent = `
    .standalone body {
      padding-top: env(safe-area-inset-top);
      padding-bottom: env(safe-area-inset-bottom);
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
    }
  `;
  document.head.appendChild(style);
}
