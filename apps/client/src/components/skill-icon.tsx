import { skillIconUrl } from "../lib/skill-icons";
import "./skill-icon.css";

/** Decorative artwork; the adjacent skill name or control supplies its accessible name. */
export function SkillIcon({
  type,
  size = 32,
  eager = false,
  className = "",
}: {
  type?: string;
  size?: number;
  eager?: boolean;
  className?: string;
}) {
  return (
    <img
      className={`skill-icon ${className}`}
      src={skillIconUrl(type)}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      alt=""
      aria-hidden="true"
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={(event) => {
        const fallback = skillIconUrl();
        if (!event.currentTarget.src.endsWith(fallback))
          event.currentTarget.src = fallback;
      }}
    />
  );
}
