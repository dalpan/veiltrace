// Landing page script. No network.
// 1. A "Cek Pesan" app installed from the old address (the site root) opens here in standalone mode; send it to /app/.
// 2. EN/ID switch. English until the visitor chooses; the choice is kept in localStorage under the same key the app uses,
//    so it carries over to /app/. Without storage (private mode, site data off) it lasts for this page only.
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
  window.location.replace('app/');
}

const LANG_KEY = 'veiltrace-lang';
const TITLES = {
  en: 'VeilTrace · Uncover the manipulation behind the page',
  id: 'VeilTrace · Ungkap manipulasi di balik halaman dan pesan',
};

function storedLang() {
  try {
    return localStorage.getItem(LANG_KEY) === 'id' ? 'id' : 'en';
  } catch {
    return 'en';
  }
}

function setLang(lang, remember) {
  document.documentElement.lang = lang;
  document.title = TITLES[lang];
  for (const l of ['en', 'id']) document.getElementById(`lang-${l}`).setAttribute('aria-pressed', String(l === lang));
  for (const img of document.querySelectorAll('img[data-alt-en]')) img.alt = img.dataset[lang === 'id' ? 'altId' : 'altEn'];
  if (remember) {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // Storage blocked: the choice lasts for this page only.
    }
  }
}

setLang(storedLang(), false);
for (const l of ['en', 'id']) document.getElementById(`lang-${l}`).addEventListener('click', () => setLang(l, true));
