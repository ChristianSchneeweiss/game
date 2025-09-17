import seedrandom from "seedrandom";

export const randomInArray = <T>(
  array: T[],
  rng: seedrandom.PRNG
): T | null => {
  if (array.length === 0) {
    console.error("No random element found");
    return null;
  }
  const res = array[Math.round(rng() * (array.length - 1))];
  if (!res) {
    console.error("No random element found");
    return array[0]!;
  }
  return res;
};

export const uniqueRandomFromArray = <T>(
  array: T[],
  count: number,
  rng: seedrandom.PRNG
): T[] => {
  const set = new Set(array);
  while (set.size > count) {
    const randomElement = randomInArray(array, rng);
    if (!randomElement) throw new Error("No random element found");
    set.delete(randomElement);
  }
  return Array.from(set);
};
