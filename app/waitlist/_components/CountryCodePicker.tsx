"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchCountries, type Country } from "../countries";
import styles from "../waitlist.module.css";

// The country code in front of the WhatsApp field. Shows +92 until she picks
// another. Opening it gives a search box: digits find a code ("44"), letters
// find a country. Arrow keys move through the list, Enter picks, Escape
// closes.

type Props = {
  value: Country;
  onChange: (country: Country) => void;
  /** Where focus goes once she has picked: the number field itself. */
  onPicked: () => void;
};

export default function CountryCodePicker({ value, onChange, onPicked }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const results = searchCountries(query);

  // Closes on a tap anywhere else on the page.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keeps the highlighted row in view while she arrows through.
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function openList() {
    setQuery("");
    setActive(0);
    setOpen(true);
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }

  function pick(country: Country) {
    onChange(country);
    setOpen(false);
    onPicked();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (results[active]) pick(results[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    }
  }

  return (
    <div ref={rootRef} className={styles.codePicker}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.codeButton}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Country code: ${value.name}, +${value.code}. Change`}
        onClick={() => (open ? close(false) : openList())}
      >
        +{value.code}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className={styles.codePopover}>
          <input
            className={styles.codeSearch}
            type="text"
            inputMode="tel"
            autoComplete="off"
            autoFocus
            placeholder="Search by code, like 44"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
            aria-label="Search country codes"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
          <ul ref={listRef} id={listId} role="listbox" className={styles.codeList} aria-label="Country codes">
            {results.map((country, i) => (
              <li
                key={`${country.name}-${country.code}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={country.name === value.name}
                className={[styles.codeOption, i === active && styles.codeOptionActive].filter(Boolean).join(" ")}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(country)}
              >
                <span>{country.name}</span>
                <span className={styles.codeOptionCode}>+{country.code}</span>
              </li>
            ))}
            {results.length === 0 && <li className={styles.codeEmpty}>Nothing matches that. Try a code, like 44.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
