import { BaseEffect } from "./base-effect";

export class StunEffect extends BaseEffect {
  constructor(duration: number) {
    super("STUN", duration);
  }

  getDescription(): string {
    return "Can not act this turn";
  }
}
