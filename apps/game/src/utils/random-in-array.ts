import type seedrandom from "seedrandom";

export const randomInArray = <T>(array: T[], rng: seedrandom.PRNG): T => {
  const res = array[Math.floor(rng() * (array.length - 1))];
  if (!res) throw new Error("No random element found");
  return res;
};
