const { chromium } = require('playwright');
const startGame = require('../dist/actions/startGame');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');

  const context = browser.contexts()[0];
  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  await page.goto('https://colonist.io');

  await startGame(page);

  await page.pause();
})();