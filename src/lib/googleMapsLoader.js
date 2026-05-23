// Singleton loader for the Google Maps JavaScript SDK.
// First call kicks off the script tag; subsequent calls reuse the same promise.
// Returns the resolved `google` namespace.

let loaderPromise = null;

export function loadGoogleMapsSdk(apiKey) {
  if (!apiKey) {
    return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'));
  }
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps SDK requires a browser'));
  }
  if (window.google?.maps?.StreetViewPanorama) {
    return Promise.resolve(window.google);
  }
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-gmaps-loader]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', () => reject(new Error('Google Maps SDK failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=quarterly&loading=async`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-gmaps-loader', '1');
    script.onload = () => {
      if (window.google?.maps) resolve(window.google);
      else reject(new Error('Google Maps SDK loaded but namespace missing'));
    };
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error('Google Maps SDK script failed to load'));
    };
    document.head.appendChild(script);
  });
  return loaderPromise;
}
