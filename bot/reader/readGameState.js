/**
 * Read current game state from the page (e.g. DOM or game API).
 * @param {import('playwright').Page} page - The active Playwright page instance.
 * @returns {Promise<import('../types/gameState').GameState | null>} Current game state, or null if not in a game / not ready.
 */
async function readGameState(page) {
  // TODO: implement
  const gameState = {
    board: {
      tiles: [],
      edges: [],
      vertices: [],
      ports: [],
      graph: {}
    }
  };
  return gameState;
}

module.exports = readGameState;
