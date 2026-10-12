"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const RECENT_SEARCHES_KEY = "reloved_recent_searches";
const MAX_RECENT = 10;

const TRENDING_SEARCHES = ["khaadi dress", "crop top", "wide leg pants"];

const MENU_ITEMS: { label: string; href: string }[] = [
  { label: "New in", href: "/browse?sort=newest" },
  { label: "Pret", href: "/browse?category=pret" },
  { label: "Kurtas", href: "/browse?category=kurta" },
  { label: "Tops", href: "/browse?category=top" },
  { label: "Bottoms", href: "/browse?category=bottoms" },
  { label: "Dresses", href: "/browse?category=dress" },
];

const UTILITY_ITEMS: { label: string; href: string }[] = [
  { label: "Sell an item", href: "/sell" },
  { label: "How it works", href: "/how-it-works" },
  { label: "About us", href: "/about" },
];

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

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 12l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ForwardArrowIcon() {
  return (
    <svg width="24" height="14" viewBox="0 0 24 14" fill="none" aria-hidden="true">
      <path d="M1 7h22M23 7l-5.5-6M23 7l-5.5 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === "string");
  } catch {
    // localStorage unavailable or corrupt
  }
  return [];
}

function saveRecentSearches(searches: string[]) {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches.slice(0, MAX_RECENT)));
  } catch {
    // localStorage unavailable
  }
}

function addRecentSearch(query: string) {
  const existing = getRecentSearches();
  const filtered = existing.filter((s) => s.toLowerCase() !== query.toLowerCase());
  saveRecentSearches([query, ...filtered]);
}

type Props = {
  onSearch?: (query: string) => void;
  transparent?: boolean;
};

export default function Nav({ onSearch, transparent = false }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!transparent) return;
    function handleScroll() {
      setScrolled(window.scrollY > 4);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [transparent]);

  useEffect(() => {
    if (drawerOpen) {
      setRecentSearches(getRecentSearches());
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setSearchFocused(false);
      setSearchValue("");
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const handleSearch = useCallback((query: string) => {
    const q = query.trim();
    if (!q) return;
    addRecentSearch(q);
    setDrawerOpen(false);
    if (onSearch) {
      onSearch(q);
    } else {
      router.push(`/browse?q=${encodeURIComponent(q)}`);
    }
  }, [onSearch, router]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSearch(searchValue);
  }

  function handleSearchFocus() {
    setSearchFocused(true);
  }

  function handleCloseDrawer() {
    if (searchFocused) {
      setSearchFocused(false);
      setSearchValue("");
      searchInputRef.current?.blur();
    } else {
      setDrawerOpen(false);
    }
  }

  function handleWordmarkClick() {
    setDrawerOpen(false);
    router.push("/");
  }

  function handleClearRecent() {
    setRecentSearches([]);
    saveRecentSearches([]);
  }

  function handleMenuItemClick(href: string) {
    setDrawerOpen(false);
    router.push(href);
  }

  return (
    <>
      <nav className={`nav${transparent && !scrolled ? " nav-transparent" : ""}`}>
        <div className="nav-left">
          <Link href="/" className="nav-wordmark">reloved.</Link>
        </div>
        <div className="nav-right">
          <Link href="/sell" className="nav-sell">Sell</Link>
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
        <div className="menu-overlay">
          <div className="menu-panel">
            <div className={`menu-header${searchFocused ? " menu-header-borderless" : ""}`}>
              {searchFocused ? (
                <span className="menu-heading text-h2">Search</span>
              ) : (
                <button
                  type="button"
                  className="nav-wordmark menu-wordmark-btn"
                  onClick={handleWordmarkClick}
                >
                  reloved.
                </button>
              )}
              <button
                type="button"
                className="menu-close"
                aria-label={searchFocused ? "Back to menu" : "Close menu"}
                onClick={handleCloseDrawer}
              >
                <CloseIcon />
              </button>
            </div>

            <form className="menu-search" onSubmit={handleSearchSubmit}>
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
                onFocus={handleSearchFocus}
              />
              {searchFocused && searchValue.trim() && (
                <button
                  type="submit"
                  className="menu-search-submit"
                  aria-label="Go to results"
                >
                  <ForwardArrowIcon />
                </button>
              )}
            </form>

            {!searchFocused ? (
              <nav className="menu-list">
                {MENU_ITEMS.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    className="menu-list-item"
                    onClick={() => handleMenuItemClick(item.href)}
                  >
                    {item.label}
                  </button>
                ))}
                <div className="menu-list-divider" />
                {UTILITY_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="menu-list-item"
                    onClick={() => setDrawerOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            ) : (
              <div className="menu-search-body">
                {recentSearches.length > 0 && (
                  <div className="menu-search-section">
                    <div className="menu-search-section-header">
                      <span className="menu-search-section-label">Recent</span>
                      <button
                        type="button"
                        className="menu-search-clear"
                        onClick={handleClearRecent}
                      >
                        Clear
                      </button>
                    </div>
                    <ul className="menu-search-list">
                      {recentSearches.map((query) => (
                        <li key={query} className="menu-search-item">
                          <button
                            type="button"
                            className="menu-search-item-btn"
                            onClick={() => handleSearch(query)}
                          >
                            {query}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="menu-search-section">
                  <div className="menu-search-section-header">
                    <span className="menu-search-section-label">Trending</span>
                  </div>
                  <ul className="menu-search-list">
                    {TRENDING_SEARCHES.map((query) => (
                      <li key={query} className="menu-search-item">
                        <button
                          type="button"
                          className="menu-search-item-btn"
                          onClick={() => handleSearch(query)}
                        >
                          {query}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
