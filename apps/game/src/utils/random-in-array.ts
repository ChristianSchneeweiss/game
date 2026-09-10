import type seedrandom from "seedrandom";

export const randomInArray = <T>(
  array: readonly T[],
  rng: seedrandom.PRNG,
): T | null => {
  if (array.length === 0) {
    return null;
  }
  return array[Math.floor(rng() * array.length)]!;
};

export const uniqueRandomFromArray = <T>(
  array: readonly T[],
  count: number,
  rng: seedrandom.PRNG,
): T[] => {
  if (count < 0 || (count !== Infinity && !Number.isSafeInteger(count))) {
    throw new RangeError(
      "Selection count must be a nonnegative integer or Infinity",
    );
  }
  const pool = [...new Set(array)];
  if (count >= pool.length) return pool;
  if (count === 0) return [];
  // Remove uniformly from the remaining pool, retaining the input order of
  // survivors. Each draw removes exactly one entry, so the loop is bounded.
  while (pool.length > count) pool.splice(Math.floor(rng() * pool.length), 1);
  return pool;
};
