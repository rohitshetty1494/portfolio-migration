import { useState } from "react";
import Button from "./Button.jsx";

// All literal values below come from design-system-mcp/tokens.json.
// No typography tokens exist for form fields, so font-family/size/weight
// on labels/inputs are intentionally left unset (browser default) rather
// than guessed. Button typography comes from tokens.typography (see Button.jsx).
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
  buttonRow: {
    display: "flex",
    flexDirection: "column",
    gap: 8, // spatial.spacing-sm
  },
};

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

      <div style={styles.buttonRow}>
        <Button type="submit" variant="primary">
          Primary
        </Button>
        <Button type="button" variant="secondary">
          Primary
        </Button>
        <Button type="button" variant="tertiary">
          Primary
        </Button>
      </div>
    </form>
  );
}
