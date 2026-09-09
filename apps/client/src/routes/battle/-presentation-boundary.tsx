import { Component, type ReactNode } from "react";

/** The lazy module itself can fail before its WebGL boundary mounts. */
export class PresentationBoundary extends Component<
  { children: ReactNode; onFallback: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div role="alert" className="p-8">
        <p>The 3D presentation could not load.</p>
        <button className="rpg-badge" onClick={this.props.onFallback}>
          Continue with Cards
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
