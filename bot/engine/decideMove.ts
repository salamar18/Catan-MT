import type { Page } from 'playwright'
import type { GameState } from '../types/gameState'
import performAction from '../actions/performAction'
import readGameState from '../reader/readGameState'

/** Poll interval in ms while waiting for state changes. */
const POLL_MS = 500

/** Action to perform on the page; concrete shape TBD when strategy exists. */
export type BotAction = Record<string, unknown> | null

/**
 * Decide the next move (or no-op) for the current game state.
 */
export function decideMove(gameState: GameState): BotAction {
    void gameState
    // TODO: implement strategy
    return null
}

/**
 * Top-level game loop: read state, decide move, perform action, repeat until game ends.
 */
export async function play(page: Page): Promise<void> {
    while (true) {
        const gameState = await readGameState(page)
        if (gameState == null) {
            console.log('No game state found')
            return
        }
        if (gameState.winnerId != null) {
            console.log('Game over. Winner:', gameState.winnerId)
            return
        }

        const action = decideMove(gameState)
        if (action) {
            await performAction(page, action)
        }

        await new Promise((r) => setTimeout(r, POLL_MS))
    }
}
