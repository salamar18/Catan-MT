import type { Page } from 'playwright'
import { defaultGameStateLogPath, writeGameStateLog } from '../logger/gameStateLog'
import { deriveGameState } from './wsGameState'
import type { GameState } from '../types/gameState'

/**
 * Derive current GameState from the WS cache and overwrite logs/game-state.log.
 * Safe to call from event-driven WS handlers (no page DOM reads).
 */
function flushGameStateLog(): GameState | null {
    const state = deriveGameState()
    if (!state) return null

    writeGameStateLog(state, undefined, {})
    console.log(
        `[readGameState] log → ${defaultGameStateLogPath()} ` +
        `(${state.board.tiles.length} land hexes` +
        `${state.resourcesInferenceFresh ? '' : ', inference=STALE'})`,
    )
    return state
}

async function readGameState(_page: Page): Promise<GameState | null> {
    return flushGameStateLog()
}

// CJS consumers: require(...).flushGameStateLog()
;(readGameState as typeof readGameState & { flushGameStateLog: typeof flushGameStateLog }).flushGameStateLog =
    flushGameStateLog

export = readGameState
