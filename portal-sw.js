/* Web Faery portal: the phone-alert service worker (Nov 14 2026).
   It does two things only: shows an alert when the server sends one, and opens the portal when she taps it.
   No caching, no offline copy, nothing is stored. The alert's words come from the server and carry no customer details.
   iOS 18.4 and later show Declarative Web Push messages by themselves; iOS 16.4 to 18.3, Android and desktop browsers
   come through here, reading the same message. Every push MUST show something (iOS cancels a phone that doesn't). */
'use strict';
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });

self.addEventListener('push', (event) => {
  let n = null;
  try { const d = event.data ? event.data.json() : null; n = d && d.notification && typeof d.notification === 'object' ? d.notification : null; } catch (e) { n = null; }
  const text = (v, max, fallback) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fallback);
  const title = text(n && n.title, 60, 'Web Faery');
  const body = text(n && n.body, 140, 'Open your schedule');
  let url = self.location.origin + '/portal.html#bookings';
  if (n && typeof n.navigate === 'string' && n.navigate.indexOf(self.location.origin + '/') === 0) url = n.navigate;
  event.waitUntil(self.registration.showNotification(title, { body: body, icon: 'apple-touch-icon.png', data: { url: url } }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && typeof event.notification.data.url === 'string' ? event.notification.data.url : self.location.origin + '/portal.html';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if (c.url.indexOf(self.location.origin + '/portal.html') === 0 && 'focus' in c) {
        return c.focus().then((f) => { try { if (f && 'navigate' in f) return f.navigate(url); } catch (e) { /* fine */ } return f; });
      }
    }
    return self.clients.openWindow(url);
  }));
});
