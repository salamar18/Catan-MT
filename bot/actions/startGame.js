/**
 * Creates a room against a bot with Ranked 1v1 rules 
 *
 * This function assumes the user is already logged in and that the
 * lobby page has loaded with the default game mode (Casual 1v1).
 * Sets up the game with a bot for 1v1 with ranked rules 
 *
 * @param {import('playwright').Page} page - The active Playwright page instance.
 */
async function startGame(page) {
    const roomButton = page.getByRole('link', { name: /rooms/i });
    await roomButton.click();
    console.log('Clicked Rooms tab');

    const createRoom = page.getByText(/create room/i);
    await createRoom.click();
    console.log('Clicked Create Room');

    const privateGameButton = page.getByRole('img', { name: /Private game/i });
    await privateGameButton.click();
    console.log('Clicked private game button');

    const hideBankCardsButton = page.getByRole('img', { name: /Hide bank cards/i });
    await hideBankCardsButton.click();
    console.log('Clicked hide bank cards button');

    const addBotButton = page.getByRole('img', { name: 'bot' }).first()
    await addBotButton.click();
    console.log('Clicked Add Bot');

    const pointsSlider = page.getByRole('slider').nth(0);
    await pointsSlider.focus();

    // move Points to Win right until it reaches 15
    for (let i = 0; i < 5; i++) {
      await pointsSlider.press('ArrowRight');
    }

    const discardSlider = page.getByRole('slider').nth(1);
    await discardSlider.focus();

    // move Card Discard Limit right until it reaches 9
    for (let i = 0; i < 2; i++) {
      await discardSlider.press('ArrowRight');
    }

    // Start the game
    const startGameButton = page.getByText('I\'m ReadyStart GameStart');
    await startGameButton.click();
    console.log('Clicked Start Game');
}
  module.exports = startGame;