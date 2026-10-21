// Synthetic but structurally realistic large pages for latency measurement (no third-party content).
export interface PerfPage {
  id: string;
  description: string;
  html: string;
  /** Expected verdict: each page embeds at most one lure so detection is exercised at scale. */
  expectPositive: boolean;
}

const wrap = (body: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>.side{float:left;width:220px}.c{margin-left:240px}</style></head><body>${body}</body></html>`;

const lorem = (i: number): string =>
  `Paragraph ${i}: the committee reviewed the proposal and agreed to publish the revised schedule after the holiday period, pending budget approval.`;

export function perfPages(): PerfPage[] {
  const nav = `<header><nav>${Array.from({ length: 60 }, (_, i) => `<a href="#">Section ${i}</a>`).join(' ')}</nav></header>`;
  const news = wrap(`${nav}<main><article><h1>Long read</h1>${Array.from({ length: 120 }, (_, i) => `<p>${lorem(i)}</p>`).join('')}</article>
    <section class="comments">${Array.from({ length: 400 }, (_, i) => `<div class="comment" id="c${i}"><p><b>user${i}</b></p><p>${i === 333
      ? 'Mods: to verify you are human press Win + R, then Ctrl + V and press Enter.'
      : `I think point ${i % 7} is the most important part of this article.`}</p></div>`).join('')}</section></main><footer><p>footer</p></footer>`);
  const docs = wrap(`<aside class="side"><ul>${Array.from({ length: 800 }, (_, i) => `<li><a href="#">API method ${i}</a></li>`).join('')}</ul></aside>
    <main class="c"><article><h1>Reference</h1>${Array.from({ length: 150 }, (_, i) => `<h2>method${i}()</h2><p>${lorem(i)}</p><pre><code>client.method${i}({ id: ${i}, retries: 3 })</code></pre><button class="copy">Copy</button>`).join('')}</article></main>`);
  const forum = wrap(`${nav}<main>${Array.from({ length: 1500 }, (_, i) => `<div class="reply" id="r${i}"><p><b>member${i}</b> wrote:</p><p>${lorem(i)}</p><p>Thanks for sharing!</p></div>`).join('')}</main>`);
  const shop = wrap(`${nav}<main><div class="grid">${Array.from({ length: 2500 }, (_, i) => `<div class="card"><img alt="Product ${i}" width="80" height="80" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><h3>Product ${i}</h3><p>Rp ${(i * 1375) % 900000}</p><span>Only ${i % 5} left</span><button>Buy</button></div>`).join('')}</div></main>`);
  const table = wrap(`<main><table>${Array.from({ length: 3000 }, (_, i) => `<tr><td>${i}</td><td>Row label ${i}</td><td>${(i * 31) % 997}</td><td>ok</td></tr>`).join('')}</table></main>`);
  return [
    { id: 'news-400-comments', description: 'News article + 400 comments (one malicious)', html: news, expectPositive: true },
    { id: 'docs-800-nav-150-code', description: 'API docs: 800-link sidebar, 150 code blocks with copy buttons', html: docs, expectPositive: false },
    { id: 'forum-1500-posts', description: 'Forum thread, 1,500 posts', html: forum, expectPositive: false },
    { id: 'shop-2500-cards', description: 'E-commerce grid, 2,500 product cards', html: shop, expectPositive: false },
    { id: 'table-3000-rows', description: 'Data table, 3,000 rows × 4 cells', html: table, expectPositive: false },
  ];
}
