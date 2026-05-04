const { chromium } = require('playwright');
const startGame = require('../dist/actions/startGame');
const readGameState = require('../dist/reader/readGameState');

/** @param {string} url */
function isBrowserInternalUrl(url) {
  return url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url === 'about:blank';
}

/**
 * Prefer an existing colonist.io tab; skip internal browser pages so we can open a fresh page.
 * @param {import('playwright').BrowserContext} context
 * @returns {import('playwright').Page | undefined}
 */
function pickColonistPage(context) {
  const pages = context.pages();
  const colonist = pages.find((p) => {
    try {
      return p.url().includes('colonist.io');
    } catch {
      return false;
    }
  });
  if (colonist) return colonist;

  const first = pages[0];
  if (!first) return undefined;
  let url = '';
  try {
    url = first.url();
  } catch {
    return undefined;
  }
  if (isBrowserInternalUrl(url)) return undefined;
  return first;
}

/**
 * After lobby actions, the match may open in another tab.
 * @param {import('playwright').BrowserContext} context
 * @param {import('playwright').Page} preferredPage
 * @returns {Promise<import('playwright').Page>}
 */
async function resolveColonistGamePage(context, preferredPage) {
  const ordered = [];
  for (const p of [preferredPage, ...context.pages()]) {
    if (p && !ordered.includes(p)) ordered.push(p);
  }
  for (const p of ordered) {
    try {
      const u = p.url();
      if (!u.includes('colonist.io')) continue;
      await p.waitForSelector('#ui-game', { state: 'attached', timeout: 15_000 });
      return p;
    } catch {
      // try next tab
    }
  }
  return preferredPage;
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');

  const context = browser.contexts()[0];
  let page = pickColonistPage(context) ?? await context.newPage();

  await page.goto('https://colonist.io');
  console.log('[bot] after goto:', page.url());

  await startGame(page);

  page = await resolveColonistGamePage(context, page);
  console.log('[bot] game page (board reads use this tab):', page.url());

  const gameState = await readGameState(page);
  console.log('Initial game state scaffold:', JSON.stringify(gameState, null, 2));

  const pollRaw = process.env.GAME_STATE_POLL_MS;
  const pollMs = pollRaw === undefined || pollRaw === '' ? 2500 : Number(pollRaw);
  if (Number.isFinite(pollMs) && pollMs > 0) {
    setInterval(() => {
      if (page.isClosed()) return;
      readGameState(page).catch((e) => console.error('[readGameState poll]', e));
    }, pollMs);
    console.log(`[bot] GAME_STATE_POLL_MS=${pollMs} → log updates every ${pollMs}ms until you close the browser tab or stop the script`);
  }

  await page.pause();
})();
