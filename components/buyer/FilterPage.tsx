"use client";

import { useState, useEffect, useRef } from "react";

type Option = { value: string; label: string };

type Props = {
  title: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  /** Step back one level (to the All filters panel if opened from there). */
  onBack: () => void;
  /** Fully exit filtering and show results. */
  onClose: () => void;
  resultCount: number;
  searchable?: boolean;
  emptyMessage?: string;
  /** Single-select instead of multi-select. Hides the "Clear filters" button. */
  multiple?: boolean;
};

function BackIcon() {
  return (
    <svg width="24" height="14" viewBox="0 0 24 14" fill="none" aria-hidden="true">
      <path d="M23 7H1M1 7l5.5-6M1 7l5.5 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 12l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FilterPage({
  title,
  options,
  selected,
  onChange,
  onBack,
  onClose,
  resultCount,
  searchable = false,
  emptyMessage,
  multiple = true,
}: Props) {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchable]);

  const filtered =
    searchable && search.trim()
      ? options.filter((o) =>
          o.label.toLowerCase().includes(search.trim().toLowerCase())
        )
      : options;

  function toggle(value: string) {
    if (!multiple) {
      onChange([value]);
      return;
    }
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  }

  return (
    <div className="filter-page" role="dialog" aria-label={title}>
      <div className="filter-page-header">
        <div className="filter-page-header-left">
          <button
            type="button"
            className="filter-page-back"
            aria-label="Back"
            onClick={onBack}
          >
            <BackIcon />
          </button>
          <h2 className="filter-page-title">{title}</h2>
        </div>
        <button
          type="button"
          className="filter-page-close"
          aria-label="Close"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </div>

      {searchable && (
        <div className="filter-page-search">
          <span className="filter-page-search-icon">
            <SearchIcon />
          </span>
          <input
            ref={searchRef}
            type="text"
            className="filter-page-search-input"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      <div className="filter-page-body">
        {filtered.length > 0
          ? filtered.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className="filter-page-option"
                  onClick={() => toggle(option.value)}
                >
                  <span
                    className={`filter-page-checkbox${checked ? " checked" : ""}${!multiple ? " round" : ""}`}
                  >
                    {checked && <CheckIcon />}
                  </span>
                  <span>{option.label}</span>
                </button>
              );
            })
          : (
            <p className="filter-page-empty">
              {search.trim() ? "No results found" : emptyMessage ?? "No options available"}
            </p>
          )}
      </div>

      <div className="filter-page-footer">
        {multiple && (
          <button
            type="button"
            className="btn-secondary"
            disabled={selected.length === 0}
            onClick={() => onChange([])}
          >
            Clear filters
          </button>
        )}
        <button type="button" className="btn-primary" onClick={onClose}>
          See results ({resultCount})
        </button>
      </div>
    </div>
  );
}
