"use client";

import { useEffect } from "react";

export type FilterRow = {
  key: string;
  label: string;
  valueLabel: string;
};

type Props = {
  rows: FilterRow[];
  resultCount: number;
  onOpenRow: (key: string) => void;
  onClearAll: () => void;
  onClose: () => void;
  hasActiveFilters: boolean;
};

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FilterPanel({
  rows,
  resultCount,
  onOpenRow,
  onClearAll,
  onClose,
  hasActiveFilters,
}: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="filter-page" role="dialog" aria-label="All filters">
      <div className="filter-page-header">
        <h2 className="filter-page-title">All Filters</h2>
        <button
          type="button"
          className="filter-page-close"
          aria-label="Close"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </div>

      <div className="filter-page-body">
        {rows.map((row) => (
          <button
            key={row.key}
            type="button"
            className="filter-panel-row"
            onClick={() => onOpenRow(row.key)}
          >
            <span className="filter-panel-row-label">{row.label}</span>
            <span className="filter-panel-row-value">
              <span className="filter-panel-row-value-text">{row.valueLabel}</span>
              <ChevronIcon />
            </span>
          </button>
        ))}
      </div>

      <div className="filter-page-footer">
        <button
          type="button"
          className="btn-secondary"
          disabled={!hasActiveFilters}
          onClick={onClearAll}
        >
          Clear filters
        </button>
        <button type="button" className="btn-primary" onClick={onClose}>
          See results ({resultCount})
        </button>
      </div>
    </div>
  );
}
