/**
 * Copyright 2026, Sean Trautman Kenton
 * Game state type definitions for Colonist.io / Catan.
 * Hierarchical structure: GameState → Board, Hand, Deck, Players, etc.
 */

// =============================================================================
// Resources & cards
// =============================================================================

/** @typedef {'wood' | 'brick' | 'sheep' | 'wheat' | 'ore'} ResourceType */
export type ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore'

/**
 * Counts for each resource in a hand or bank.
 * @typedef {Object} ResourceCounts
 * @property {number} wood
 * @property {number} brick
 * @property {number} sheep
 * @property {number} wheat
 * @property {number} ore
 */
export interface ResourceCounts {
    wood: number
    brick: number
    sheep: number
    wheat: number
    ore: number
}

/**
 * Counts for each development card type in a hand.
 * @typedef {Object} DevelopmentCardCounts
 * @property {number} knight
 * @property {number} victory_point
 * @property {number} road_building
 * @property {number} year_of_plenty
 * @property {number} monopoly
 */
export interface DevelopmentCardCounts {
    knight: number
    victory_point: number
    road_building: number
    year_of_plenty: number
    monopoly: number
}

// =============================================================================
// Board
// =============================================================================

/** @typedef {'wood' | 'brick' | 'sheep' | 'wheat' | 'ore' | 'desert'} TerrainType */
export type TerrainType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore' | 'desert'

/**
 * Single hex tile on the board.
 * @typedef {Object} HexTile
 * @property {string} id - Unique tile id (e.g. index or "x,y")
 * @property {TerrainType} terrain
 * @property {number | undefined} bips - Dice number 2-12 (undefined for desert)
 * @property {boolean} hasRobber - Robber is on this tile
 */
export interface HexTile {
    /** Unique tile id (e.g. index or "x,y") */
    id: string
    terrain: TerrainType
    /** Dice number 2-12 (undefined for desert) */
    bips?: number
    /** Robber is on this tile */
    hasRobber: boolean
}

/**
 * Board edge (between two vertices); may have a road.
 * @typedef {Object} Edge
 * @property {string} id
 * @property {string | null} roadOwnerId - Player id who built the road, or null
 */
export interface Edge {
    id: string
    /** Player id who built the road, or null */
    roadOwnerId: string | null
}

/**
 * Board vertex (intersection of three hexes); may have settlement or city.
 * @typedef {Object} Vertex
 * @property {string} id
 * @property {string | null} settlementOwnerId - Player id or null
 * @property {'settlement' | 'city' | null} buildingType
 */
export interface Vertex {
    id: string
    /** Player id or null */
    settlementOwnerId: string | null
    buildingType: 'settlement' | 'city' | null
}

/**
 * Port for bank trading (2:1 or 3:1).
 * @typedef {Object} Port
 * @property {string} id
 * @property {ResourceType | 'any'} resource - Specific resource for 2:1, or 'any' for 3:1
 */
export interface Port {
    id: string
    /** Specific resource for 2:1, or 'any' for 3:1 */
    resource: ResourceType | 'any'
}

/**
 * Any board element that can be a node in the board graph.
 * @typedef {HexTile | Edge | Vertex | Port} BoardNode
 */
export type BoardNode = HexTile | Edge | Vertex | Port

/**
 * Board graph: adjacency list encoding positional relationships between tiles, edges, vertices, and ports.
 * Each node id maps to the node (one of the four types) and to the list of adjacent node ids.
 * @typedef {Object} BoardGraph
 * @property {Object.<string, BoardNode>} nodes - Node id to board element (HexTile, Edge, Vertex, or Port)
 * @property {Object.<string, string[]>} adjacency - Node id to array of adjacent node ids
 */
export interface BoardGraph {
    /** Node id to board element (HexTile, Edge, Vertex, or Port) */
    nodes: Record<string, BoardNode>
    /** Node id to array of adjacent node ids */
    adjacency: Record<string, string[]>
}

/**
 * The game board: hexes, edges, vertices, ports, and their graph.
 * @typedef {Object} Board
 * @property {HexTile[]} tiles
 * @property {Edge[]} edges
 * @property {Vertex[]} vertices
 * @property {Port[]} ports
 * @property {BoardGraph} graph - Adjacency list holding all four board element types as nodes
 */
export interface Board {
    tiles: HexTile[]
    edges: Edge[]
    vertices: Vertex[]
    ports: Port[]
    /** Adjacency list holding all four board element types as nodes */
    graph: BoardGraph
}

// =============================================================================
// Hand (player's cards and build state)
// =============================================================================

/**
 * Player's resource and development card holdings.
 * @typedef {Object} Hand
 * @property {ResourceCounts} resources - Current resource counts
 * @property {DevelopmentCardCounts} developmentCards - Counts per dev card type
 * @property {number} knightsPlayed - For largest army
 * @property {number} victoryPoints - From VP dev cards (often on player, not hand)
 */
export interface Hand {
    /** Current resource counts */
    resources: ResourceCounts
    /** Counts per dev card type */
    developmentCards: DevelopmentCardCounts
    /** For largest army */
    knightsPlayed: number
    /** From VP dev cards (often on player, not hand) */
    victoryPoints: number
}

/**
 * How many of each building type the current player can still build this turn.
 * @typedef {Object} Buildable
 * @property {number} road - Roads left to build
 * @property {number} settlement - Settlements left to build
 * @property {number} city - Cities left to build
 */
export interface Buildable {
    /** Roads left to build */
    road: number
    /** Settlements left to build */
    settlement: number
    /** Cities left to build */
    city: number
}

// =============================================================================
// Deck / bank
// =============================================================================

/**
 * Remaining development cards in the deck (counts per type).
 * @typedef {Object} DevelopmentDeck
 * @property {number} knight
 * @property {number} victory_point
 * @property {number} road_building
 * @property {number} year_of_plenty
 * @property {number} monopoly
 */
export interface DevelopmentDeck {
    knight: number
    victory_point: number
    road_building: number
    year_of_plenty: number
    monopoly: number
}

/**
 * Resource bank (remaining pieces in supply).
 * @typedef {Object} ResourceBank
 * @property {number} wood
 * @property {number} brick
 * @property {number} sheep
 * @property {number} wheat
 * @property {number} ore
 */
export interface ResourceBank {
    wood: number
    brick: number
    sheep: number
    wheat: number
    ore: number
}

/**
 * Deck / bank state: dev cards and resource supply.
 * @typedef {Object} Deck
 * @property {DevelopmentDeck} developmentCards
 * @property {ResourceBank} bank - Resource supply
 */
export interface Deck {
    developmentCards: DevelopmentDeck
    /** Resource supply */
    bank: ResourceBank
}

// =============================================================================
// Players & turn
// =============================================================================

/**
 * One player in the game.
 * @typedef {Object} Player
 * @property {string} id - Unique player id
 * @property {string} name
 * @property {string} color - e.g. 'red', 'blue'
 * @property {number} victoryPoints - Total VP (settlements, cities, VP cards, etc.)
 * @property {number} knightCount - For largest army
 * @property {boolean} hasLongestRoad
 * @property {boolean} hasLargestArmy
 * @property {Hand} hand
 */
export interface Player {
    /** Unique player id */
    id: string
    name: string
    /** e.g. 'red', 'blue' */
    color: string
    /** Total VP (settlements, cities, VP cards, etc.) */
    victoryPoints: number
    /** For largest army */
    knightCount: number
    hasLongestRoad: boolean
    hasLargestArmy: boolean
    hand: Hand
}

/** @typedef {'initial_placement' | 'rolling' | 'playing' | 'discarding' | 'robbing'} GamePhase */
export type GamePhase = 'initial_placement' | 'rolling' | 'playing' | 'discarding' | 'robbing'

/**
 * Dice state for the current turn.
 * @typedef {Object} Dice
 * @property {number} first - First die 1-6
 * @property {number} second - Second die 1-6
 * @property {boolean} rolled - Whether dice have been rolled this turn
 */
export interface Dice {
    /** First die 1-6 */
    first: number
    /** Second die 1-6 */
    second: number
    /** Whether dice have been rolled this turn */
    rolled: boolean
}

// =============================================================================
// Top-level game state
// =============================================================================

/**
 * Full game state at a point in time.
 * @typedef {Object} GameState
 * @property {Board} board
 * @property {Player[]} players
 * @property {string} currentPlayerId - Whose turn it is
 * @property {GamePhase} phase
 * @property {Dice} dice
 * @property {Deck} deck
 * @property {Hand} myHand - Current user's hand (convenience; may also use players[id].hand)
 * @property {Buildable} buildable - What current player can build
 * @property {string | null} winnerId - Set when game ends
 * @property {number} pointsToWin - e.g. 15
 */
export interface GameState {
    board: Board
    players: Player[]
    /** Whose turn it is */
    currentPlayerId: string
    phase: GamePhase
    dice: Dice
    deck: Deck
    /** Current user's hand (convenience; may also use players[id].hand) */
    myHand: Hand
    /** What current player can build */
    buildable: Buildable
    /** Set when game ends */
    winnerId: string | null
    /** e.g. 15 */
    pointsToWin: number
}
