"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/constants";

const CATEGORY_LABELS: Record<string, string> = {
  kurta: "Kurta",
  pret: "Pret",
  co_ord_set: "Co-ord set",
  dupatta: "Dupatta",
  dress: "Dress",
  top: "Top",
  bottoms: "Bottoms",
  jeans: "Jeans",
  skirt: "Skirt",
  jacket: "Jacket",
  sportswear: "Sportswear",
  shoes: "Shoes",
  bag: "Bag",
};

function MenuSearchIcon() {
  return (
    <svg width="22" height="18" viewBox="0 0 22 18" fill="none" aria-hidden="true">
      <path d="M1 2h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M1 9h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M1 16h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="9" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M19 12.5l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

type Props = {
  onSearch?: (query: string) => void;
};

export default function Nav({ onSearch }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (drawerOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchValue.trim();
    if (!q) return;
    setDrawerOpen(false);
    if (onSearch) {
      onSearch(q);
    } else {
      router.push(`/browse?q=${encodeURIComponent(q)}`);
    }
  }

  function handleCategoryClick(cat: string) {
    setDrawerOpen(false);
    router.push(`/browse?category=${cat}`);
  }

  return (
    <>
      <nav className="nav">
        <div className="nav-left">
          <Link href="/" className="nav-wordmark">reloved.</Link>
        </div>
        <div className="nav-right">
          <button
            type="button"
            className="nav-icon"
            aria-label="Menu and search"
            onClick={() => setDrawerOpen(true)}
          >
            <MenuSearchIcon />
          </button>
        </div>
      </nav>

      {drawerOpen && (
        <div className="menu-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">
              <span className="nav-wordmark">reloved.</span>
              <button
                type="button"
                className="menu-close"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>

            <form className="menu-search" onSubmit={handleSearch}>
              <span className="menu-search-icon">
                <SearchIcon />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="menu-search-input"
                placeholder="Search by brand, style..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </form>

            <nav className="menu-nav">
              <button
                type="button"
                className="menu-nav-item"
                onClick={() => { setDrawerOpen(false); router.push("/browse"); }}
              >
                <span>Browse all</span>
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className="menu-nav-item"
                  onClick={() => handleCategoryClick(cat)}
                >
                  <span>{CATEGORY_LABELS[cat]}</span>
                  <ChevronIcon />
                </button>
              ))}
            </nav>

            <div className="menu-footer">
              <Link
                href="/sell"
                className="menu-nav-item"
                onClick={() => setDrawerOpen(false)}
              >
                <span>Sell an item</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
