import { useState, useEffect } from 'react';

export const useVersionCheck = () => {
  const [hasNewVersion, setHasNewVersion] = useState(false);

  const checkVersion = async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) return;

      const data = await res.json();
      const storedVersion = localStorage.getItem('cmms_app_version');

      if (!storedVersion) {
        localStorage.setItem('cmms_app_version', String(data.version));
      } else if (String(data.version) !== storedVersion) {
        setHasNewVersion(true);
      }
    } catch {}
  };

  const updateApp = () => {
    if ('caches' in window) {
      caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
    }
    localStorage.removeItem('cmms_app_version');
    window.location.reload();
  };

  useEffect(() => {
    checkVersion();
    const interval = setInterval(checkVersion, 3 * 60 * 1000); // 3 minutos
    const onFocus = () => checkVersion();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return { hasNewVersion, updateApp };
};
