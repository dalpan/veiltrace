// Landing page script. One job: a "Cek Pesan" app installed from the old address (the site root) opens here in standalone
// mode; send it to the app, which now lives at /app/. No network, no storage.
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
  window.location.replace('app/');
}
