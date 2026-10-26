"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthUser, signOutUser } from "@/lib/useAuthUser";
import SellChooser, { type SellMode } from "@/components/seller/SellChooser";

const RECENT_SEARCHES_KEY = "reloved_recent_searches";
const MAX_RECENT = 10;

const TRENDING_SEARCHES = ["khaadi dress", "crop top", "wide leg pants"];

const MENU_ITEMS: { label: string; href: string }[] = [
  { label: "New in", href: "/browse?sort=newest" },
  { label: "Tops", href: "/browse?category=top" },
  { label: "Bottoms", href: "/browse?category=bottoms" },
  { label: "Kurtas", href: "/browse?category=kurta" },
  { label: "Pret", href: "/browse?category=pret" },
  { label: "Dresses", href: "/browse?category=dress" },
];

/** The homepage's Buy / Sell toggle, which is the only explanation of how
 *  Reloved works that exists. There is no /how-it-works page, and a menu item
 *  pointing at one was a 404. */
const HOW_IT_WORKS_HREF = "/#how-it-works";

function MenuSearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M32,64a8,8,0,0,1,8-8H216a8,8,0,0,1,0,16H40A8,8,0,0,1,32,64Zm8,72h72a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16Zm88,48H40a8,8,0,0,0,0,16h88a8,8,0,0,0,0-16Zm109.66,13.66a8,8,0,0,1-11.32,0L206,177.36A40,40,0,1,1,217.36,166l20.3,20.3A8,8,0,0,1,237.66,197.66ZM184,168a24,24,0,1,0-24-24A24,24,0,0,0,184,168Z" />
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
  /** Hide the Sell link. Used on /sell, where she is already in the flow and
   *  the link would only point at the page she is standing on. */
  hideSell?: boolean;
  /** Called before the wordmark or the menu takes her off this page. Return
   *  false to cancel, and show your own confirmation instead.
   *
   *  SHARED COMPONENT. Both props are additive and default to the behaviour
   *  every other page already gets, so nothing else changes. For Bismah. */
  onBeforeLeave?: () => boolean;
};

export default function Nav({
  onSearch,
  transparent = false,
  hideSell = false,
  onBeforeLeave,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Sell, in the nav or the menu, opens the One item / Many items chooser
  // rather than going straight to /sell (26 Oct).
  const [sellOpen, setSellOpen] = useState(false);
  const closeSell = useCallback(() => setSellOpen(false), []);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Signed out until Firebase says otherwise. While `loading` is true we show
  // the signed-out rows, so the menu never flashes "My profile" at a visitor
  // who has no account.
  const { user } = useAuthUser();

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

  function closeAfterNav() {
    setDrawerOpen(false);
  }

  /** The menu's "Sell an item" opens the same chooser as Sell in the nav. */
  function handleMenuSell() {
    setDrawerOpen(false);
    setSellOpen(true);
  }

  /** /sell?mode=... skips the sell flow's own "What are you selling?" sheet,
   *  since she has just answered it. On /sell itself a client navigation would
   *  only change the query and keep the flow she already has, so that case is
   *  a full load, behind the same leave check as the rest of the nav. */
  function handleSellChoice(mode: SellMode) {
    setSellOpen(false);
    if (onBeforeLeave && !onBeforeLeave()) return;
    const href = `/sell?mode=${mode}`;
    if (window.location.pathname === "/sell") window.location.assign(href);
    else router.push(href);
  }

  async function handleSignOut() {
    await signOutUser();
    setDrawerOpen(false);
    // Home rather than staying put: half the pages she could be standing on
    // only make sense as the person who was signed in.
    router.push("/");
  }

  return (
    <>
      <nav className={`nav${transparent && !scrolled ? " nav-transparent" : ""}`}>
        <div className="nav-left">
          {/* Both of these are guarded rather than the individual menu items,
              because the menu's only purpose is to go somewhere else. Asking
              once, here, beats asking again at every destination inside it. */}
          <Link
            href="/"
            className="nav-wordmark"
            onClick={(event) => {
              if (onBeforeLeave && !onBeforeLeave()) event.preventDefault();
            }}
          >
            reloved.
          </Link>
        </div>
        <div className="nav-right">
          {!hideSell && (
            <button
              type="button"
              className="nav-sell"
              aria-haspopup="dialog"
              aria-expanded={sellOpen}
              onClick={() => setSellOpen(true)}
            >
              Sell
            </button>
          )}
          <button
            type="button"
            className="nav-icon"
            aria-label="Menu and search"
            onClick={() => {
              if (onBeforeLeave && !onBeforeLeave()) return;
              setDrawerOpen(true);
            }}
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

                {/* Utility rows. Sell first, because it is the only thing in
                    this menu she might have come here to do; then who she is;
                    then how any of it works. Signed out, the middle row is the
                    two ways into an account. */}
                <button type="button" className="menu-list-item" onClick={handleMenuSell}>
                  Sell an item
                </button>

                {user ? (
                  <Link
                    href={`/seller/${user.uid}`}
                    className="menu-list-item"
                    onClick={closeAfterNav}
                  >
                    My profile
                  </Link>
                ) : (
                  // One row, two destinations. A single "Sign up | Log in" link
                  // would make her guess which half she tapped.
                  <div className="menu-list-pair">
                    <Link
                      href="/account"
                      className="menu-list-item menu-list-item-inline"
                      onClick={closeAfterNav}
                    >
                      Sign up
                    </Link>
                    <span className="menu-list-sep" aria-hidden="true">
                      |
                    </span>
                    <Link
                      href="/account?mode=login"
                      className="menu-list-item menu-list-item-inline"
                      onClick={closeAfterNav}
                    >
                      Log in
                    </Link>
                  </div>
                )}

                <Link
                  href={HOW_IT_WORKS_HREF}
                  className="menu-list-item"
                  onClick={closeAfterNav}
                >
                  How it works
                </Link>

                {user && (
                  <button
                    type="button"
                    className="menu-list-item menu-list-item-quiet"
                    onClick={() => void handleSignOut()}
                  >
                    Log out
                  </button>
                )}
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
      <SellChooser open={sellOpen} onClose={closeSell} onChoose={handleSellChoice} />
    </>
  );
}
