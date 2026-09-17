import { useState } from "react";

// All literal values below come from design-system-mcp/tokens.json.
// No typography tokens exist in the token file, so font-family/size/weight
// are intentionally left unset (browser default) rather than guessed.
const styles = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16, // spatial.spacing-md
    padding: 24, // spatial.spacing-lg
    borderRadius: 8, // spatial.radius-md
  },
  label: {
    color: "#111827ff", // semantics.text-heading -> primitives.grey - 900
    marginBottom: 4, // spatial.spacing-xs
  },
  input: {
    padding: 8, // spatial.spacing-sm
    borderRadius: 8, // spatial.radius-md
    color: "#111827ff", // semantics.text-heading -> primitives.grey - 900 (no input-text token exists)
    backgroundColor: "#ffffffff", // primitives.white (no input-bg token exists)
  },
  button: {
    padding: 8, // spatial.spacing-sm
    borderRadius: 8, // spatial.radius-md
    backgroundColor: "#2563ebff", // semantics.button-bg-primary -> primitives.blue - 500
    color: "#ffffffff", // semantics.button-text-primary -> primitives.white
    border: "none",
  },
  buttonHover: {
    backgroundColor: "#1d4ed8ff", // semantics.button-bg-primary-hover -> primitives.blue - 600
  },
};

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isHovering, setIsHovering] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <form style={styles.form} onSubmit={handleSubmit}>
      <div>
        <label style={styles.label} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          required
        />
      </div>

      <div>
        <label style={styles.label} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          required
        />
      </div>

      <button
        type="submit"
        style={{
          ...styles.button,
          ...(isHovering ? styles.buttonHover : {}),
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        Log In
      </button>
    </form>
  );
}
