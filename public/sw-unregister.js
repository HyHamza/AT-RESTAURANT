// Unregister all old/broken service workers
(async function unregisterOldServiceWorkers() {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log('[SW Cleanup] Found', registrations.length, 'service worker(s)');
      
      for (const registration of registrations) {
        const scriptURL = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL;
        console.log('[SW Cleanup] Unregistering:', scriptURL);
        await registration.unregister();
      }
      
      // Clear all caches
      const cacheNames = await caches.keys();
      console.log('[SW Cleanup] Found', cacheNames.length, 'cache(s)');
      
      for (const cacheName of cacheNames) {
        console.log('[SW Cleanup] Deleting cache:', cacheName);
        await caches.delete(cacheName);
      }
      
      console.log('[SW Cleanup] Complete - Reload page to register fresh service workers');
      alert('Service workers cleaned up. Click OK to reload.');
      window.location.reload();
    } catch (error) {
      console.error('[SW Cleanup] Error:', error);
      alert('Cleanup failed: ' + error.message);
    }
  } else {
    alert('Service workers not supported in this browser');
  }
})();
