/**
 * Deterministic PRNG (mulberry32) so the mock dataset is identical on every
 * render — server and client generate the same data, keeping hydration stable.
 */
export function createRng(seed: number) {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    /** Float in [0, 1). */
    next,
    /** Integer in [min, max] inclusive. */
    int(min: number, max: number) {
      return min + Math.floor(next() * (max - min + 1));
    },
    /** Random element of a non-empty array. */
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(next() * items.length)];
    },
    /** Fisher–Yates shuffle (returns a new array). */
    shuffle<T>(items: readonly T[]): T[] {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

export type Rng = ReturnType<typeof createRng>;
