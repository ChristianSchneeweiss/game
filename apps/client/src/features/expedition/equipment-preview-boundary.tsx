import { Component, type ReactNode } from "react";

export class EquipmentPreviewBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p className="expedition-preview-fallback" role="status">
        3D preview unavailable. Your equipment and stats are still shown below.
      </p>
    ) : (
      this.props.children
    );
  }
}
