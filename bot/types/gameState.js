/**
 * Copyright 2026, Sean Trautman Kenton 
 * Game state type definitions for Colonist.io / Catan.
 * Hierarchical structure: GameState → Board, Hand, Deck, Players, etc.
 */

// =============================================================================
// Resources & cards
// =============================================================================

/** @typedef {'wood' | 'brick' | 'sheep' | 'wheat' | 'ore'} ResourceType */

/**
 * Counts for each resource in a hand or bank.
 * @typedef {Object} ResourceCounts
 * @property {number} wood
 * @property {number} brick
 * @property {number} sheep
 * @property {number} wheat
 * @property {number} ore
 */

/**
 * Counts for each development card type in a hand.
 * @typedef {Object} DevelopmentCardCounts
 * @property {number} knight
 * @property {number} victory_point
 * @property {number} road_building
 * @property {number} year_of_plenty
 * @property {number} monopoly
 */

// =============================================================================
// Board
// =============================================================================

/** @typedef {'wood' | 'brick' | 'sheep' | 'wheat' | 'ore' | 'desert'} TerrainType */

/**
 * Single hex tile on the board.
 * @typedef {Object} HexTile
 * @property {string} id - Unique tile id (e.g. index or "x,y")
 * @property {TerrainType} terrain
 * @property {number | undefined} bips - Dice number 2-12 (undefined for desert)
 * @property {boolean} hasRobber - Robber is on this tile
 */

/**
 * Board edge (between two vertices); may have a road.
 * @typedef {Object} Edge
 * @property {string} id
 * @property {string | null} roadOwnerId - Player id who built the road, or null
 */

/**
 * Board vertex (intersection of three hexes); may have settlement or city.
 * @typedef {Object} Vertex
 * @property {string} id
 * @property {string | null} settlementOwnerId - Player id or null
 * @property {'settlement' | 'city' | null} buildingType
 */

/**
 * Port for bank trading (2:1 or 3:1).
 * @typedef {Object} Port
 * @property {string} id
 * @property {ResourceType | 'any'} resource - Specific resource for 2:1, or 'any' for 3:1
 */

/**
 * Any board element that can be a node in the board graph.
 * @typedef {HexTile | Edge | Vertex | Port} BoardNode
 */

/**
 * Board graph: adjacency list encoding positional relationships between tiles, edges, vertices, and ports.
 * Each node id maps to the node (one of the four types) and to the list of adjacent node ids.
 * @typedef {Object} BoardGraph
 * @property {Object.<string, BoardNode>} nodes - Node id to board element (HexTile, Edge, Vertex, or Port)
 * @property {Object.<string, string[]>} adjacency - Node id to array of adjacent node ids
 */

/**
 * The game board: hexes, edges, vertices, ports, and their graph.
 * @typedef {Object} Board
 * @property {HexTile[]} tiles
 * @property {Edge[]} edges
 * @property {Vertex[]} vertices
 * @property {Port[]} ports
 * @property {BoardGraph} graph - Adjacency list holding all four board element types as nodes
 */

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

/**
 * How many of each building type the current player can still build this turn.
 * @typedef {Object} Buildable
 * @property {number} road - Roads left to build
 * @property {number} settlement - Settlements left to build
 * @property {number} city - Cities left to build
 */

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

/**
 * Resource bank (remaining pieces in supply).
 * @typedef {Object} ResourceBank
 * @property {number} wood
 * @property {number} brick
 * @property {number} sheep
 * @property {number} wheat
 * @property {number} ore
 */

/**
 * Deck / bank state: dev cards and resource supply.
 * @typedef {Object} Deck
 * @property {DevelopmentDeck} developmentCards
 * @property {ResourceBank} bank - Resource supply
 */

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

/** @typedef {'initial_placement' | 'rolling' | 'playing' | 'discarding' | 'robbing'} GamePhase */

/**
 * Dice state for the current turn.
 * @typedef {Object} Dice
 * @property {number} first - First die 1-6
 * @property {number} second - Second die 1-6
 * @property {boolean} rolled - Whether dice have been rolled this turn
 */

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
 * @property {number} pointsToWin - e.g. 10 or 15
 */
