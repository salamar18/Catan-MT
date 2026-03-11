/**
 * Clicks the "Start Game" button on the Colonist lobby screen.
 *
 * This function assumes the user is already logged in and that the
 * lobby page has loaded with the default game mode (Casual 1v1).
 * It waits for the "Start Game" button to become visible and then
 * triggers the click to begin matchmaking.
 *
 * @param {import('playwright').Page} page - The active Playwright page instance.
 */
async function startGame(page) {
    const startButton = page.getByRole('button', { name: /start game/i });
  
    await startButton.waitFor({ state: 'visible' });
    await startButton.click();
  
    console.log('Clicked Start Game');
  }
  
  module.exports = startGame;