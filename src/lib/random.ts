/**
 * Seeded pseudo-random number generator.
 * Uses mulberry32 algorithm for reproducible randomness.
 */

/**
 * Hash a string to a 32-bit integer.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash >>> 0; // Ensure unsigned
}

/**
 * Create a seeded random number generator.
 * Returns a function that produces values in [0, 1).
 */
export function createSeededRandom(seed: string): () => number {
  let state = hashString(seed || String(Date.now()));

  // Mulberry32 PRNG
  return function random(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a random seed string.
 */
export function generateSeed(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Get a random integer in range [min, max] (inclusive).
 */
export function randomInt(min: number, max: number, random: () => number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * Pick a random element from an array.
 */
export function pickRandom<T>(array: T[], random: () => number): T {
  return array[Math.floor(random() * array.length)];
}

/**
 * Shuffle an array in place using Fisher-Yates algorithm.
 * Returns the same array for convenience.
 */
export function shuffleArray<T>(array: T[], random: () => number): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Return true with the given probability (0-1).
 */
export function chance(probability: number, random: () => number): boolean {
  return random() < probability;
}
