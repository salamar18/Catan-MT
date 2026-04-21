/**
 * @typedef {import('../types/gameState').GameState} GameState
 */

const readGameState = require('../reader/readGameState');
const performAction = require('../actions/performAction');

/** Poll interval in ms while waiting for state changes. */
const POLL_MS = 500;

/**
 * Decide the next move (or no-op) for the current game state.
 * @param {GameState} gameState - Current game state.
 * @returns {object | null} Action to perform, or null if none.
 */
function decideMove(gameState) {
  // TODO: implement strategy
  return null;
}

/**
 * Top-level game loop: read state, decide move, perform action, repeat until game ends.
 * @param {import('playwright').Page} page - The active Playwright page instance.
 */
async function play(page) {
  for (let gameState = await readGameState(page);
      !gameState || gameState.winnerId == null;
      gameState = await readGameState(page)) {

    const action = decideMove(gameState);
    if (action) {
      await performAction(page, action);
    }

    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  if (!gameState) {
    console.log('No game state found');
  }
  else {
    console.log('Game over. Winner:', gameState.winnerId);
  }
}

module.exports = { play, decideMove };
