/**
 * Seeded random number generation utilities.
 *
 * Uses the mulberry32 algorithm for deterministic pseudo-random numbers.
 * This allows maps to be regenerated from a seed string.
 */

/** Maximum value for 32-bit unsigned integer (2^32) */
const UINT32_MAX = 4294967296;

/**
 * Create a seeded random number generator using mulberry32 algorithm.
 * Returns a function that produces values in [0, 1).
 */
export function createSeededRandom(seed: string): () => number {
  let h = hashString(seed || String(Date.now()));

  return function mulberry32(): number {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_MAX;
  };
}

/**
 * Generate a random seed string
 */
export function generateSeed(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Hash a string to a number for seeding
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * Shuffle an array using Fisher-Yates with seeded random
 */
export function shuffleArray<T>(array: T[], random: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Pick a random element from an array
 */
export function pickRandom<T>(array: T[], random: () => number): T {
  return array[Math.floor(random() * array.length)];
}

/**
 * Generate a random integer in range [min, max] inclusive
 */
export function randomInt(min: number, max: number, random: () => number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}
