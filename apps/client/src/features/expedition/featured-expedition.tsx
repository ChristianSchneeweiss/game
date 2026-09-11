import { Link } from "@tanstack/react-router";
import "./expedition.css";

export function FeaturedExpedition() {
  return (
    <Link
      className="expedition-feature"
      to="/dungeons/prepare"
      search={{ key: "trial-of-the-nature", party: undefined }}
    >
      <span>
        <small>Featured expedition · Five waves · Level 5–6</small>
        <strong>Answer the old forest.</strong>
        <span>Prepare your party for the Trial of the Nature.</span>
      </span>
      <span className="expedition-button">Prepare expedition →</span>
    </Link>
  );
}
