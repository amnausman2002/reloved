import styles from "../waitlist.module.css";

// Off screen and out of the tab order, so only a bot filling every field it
// can find will put anything in it. The server quietly drops those signups.
export default function Honeypot({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className={styles.honeypot} aria-hidden="true">
      <label>
        Company
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  );
}
