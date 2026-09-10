import { BaseEffect } from "./base-effect";

export class StunEffect extends BaseEffect {
  preventsAction = true;
  constructor(duration: number) {
    super("STUN", duration);
  }

  getDescription(): string {
    return "Can not act this turn";
  }
}
