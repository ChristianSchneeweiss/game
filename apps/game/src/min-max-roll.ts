export const minMaxRoll = (min: number, max: number, roll: number) => {
  const delta = max - min;
  const perRoll = delta / 20;
  return min + roll * perRoll;
};
