/* ══════════════════════════════════════════════════════════
   PWA install + service worker registration
   ──────────────────────────────────────────────────────────
   Exposes  window.PWA  for core.js (the install button + sheet):
     PWA.canInstall()   → boolean
     PWA.isStandalone() → boolean
     PWA.prompt()       → Promise<'accepted'|'dismissed'|'manual'>
     PWA.onChange(fn)   → subscribe to availability changes
   ══════════════════════════════════════════════════════════ */

(function () {
  let deferredPrompt = null;
  const listeners = new Set();

  /* matchMedia is not implemented everywhere (older WebViews, some embedded
     browsers). A throw here would abort this script and, with it, the rest of
     the app — so every call goes through a safe wrapper. */
  function mq(query) {
    try {
      return window.matchMedia?.(query) || { matches: false, addEventListener() {} };
    } catch {
      return { matches: false, addEventListener() {} };
    }
  }

  const isStandalone = () =>
    mq('(display-mode: standalone)').matches ||
    mq('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true;

  const isIOS = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const emit = () => listeners.forEach(fn => fn({ canInstall: !!deferredPrompt, isStandalone: isStandalone() }));

  /* ── capture the install prompt ── */
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    emit();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit();
  });

  mq('(display-mode: standalone)').addEventListener?.('change', emit);

  async function prompt() {
    if (!deferredPrompt) return 'manual';

    const event = deferredPrompt;
    deferredPrompt = null;
    emit();

    event.prompt();
    const { outcome } = await event.userChoice;
    return outcome; // 'accepted' | 'dismissed'
  }

  window.PWA = {
    canInstall: () => !!deferredPrompt,
    isStandalone,
    isIOS,
    prompt,
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };

  /* ── service worker ── */
  if (navigator.serviceWorker && typeof navigator.serviceWorker.register === 'function') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          // Surface a waiting worker so the app can offer an update.
          registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            if (!worker) return;
            worker.addEventListener('statechange', () => {
              if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                window.dispatchEvent(new CustomEvent('sw:updated', { detail: registration }));
              }
            });
          });
        })
        .catch(() => {
          /* Offline support is a bonus — never block the booking flow. */
        });
    });
  }
})();
