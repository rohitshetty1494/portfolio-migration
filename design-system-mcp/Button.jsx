import { useState } from "react";

// All literal values below come from design-system-mcp/tokens.json,
// components.button, sourced live from Figma CTA component node 4:3.
const base = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 16px", // spatial.spacing-sm spatial.spacing-md
  borderRadius: 8, // spatial.radius-md
  border: "none",
  fontFamily: "'DM Sans', sans-serif", // typography.button-font-family
  fontWeight: 500, // typography.button-font-weight (Medium)
  fontSize: 18, // typography.button-font-size
  lineHeight: "22px", // typography.button-line-height
  cursor: "pointer",
};

const variants = {
  primary: {
    backgroundColor: "#2563ebff", // semantics.button-bg-primary -> primitives.blue - 500
    color: "#ffffffff", // semantics.button-text-primary -> primitives.white
  },
  primaryHover: {
    backgroundColor: "#1d4ed8ff", // semantics.button-bg-primary-hover -> primitives.blue - 600
  },
  secondary: {
    backgroundColor: "#111827ff", // semantics.button-bg-secondary -> primitives.grey - 900
    color: "#ffffffff", // semantics.button-text-primary -> primitives.white
  },
  tertiary: {
    backgroundColor: "#eb7e25ff", // semantics.button-bg-tertiary -> primitives.teritiary
    color: "#ffffffff", // semantics.button-text-primary -> primitives.white
  },
};

export default function Button({ variant = "primary", children, ...props }) {
  const [isHovering, setIsHovering] = useState(false);

  const style = {
    ...base,
    ...variants[variant],
    ...(variant === "primary" && isHovering ? variants.primaryHover : {}),
  };

  return (
    <button
      style={style}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      {...props}
    >
      {children}
    </button>
  );
}
