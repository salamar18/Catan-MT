import type { Page } from 'playwright'
import { defaultGameStateLogPath, writeGameStateLog } from '../logger/gameStateLog'
import { deriveGameState } from './wsGameState'
import type { GameState } from '../types/gameState'

async function readGameState(_page: Page): Promise<GameState | null> {
    const state = deriveGameState()
    if (!state) return null

    writeGameStateLog(state, undefined, {})
    console.log(`[readGameState] log → ${defaultGameStateLogPath()} (${state.board.tiles.length} land hexes)`)

    return state
}

export = readGameState
