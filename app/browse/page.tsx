"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Nav from "@/components/ui/Nav";
import BrowseCard from "@/components/buyer/BrowseCard";
import FilterChip from "@/components/ui/FilterChip";
import FilterPage from "@/components/buyer/FilterPage";
import FilterPanel, { type FilterRow } from "@/components/buyer/FilterPanel";
import type { Brand, Category, ConditionValue, City } from "@/lib/constants";
import {
  BRANDS,
  CATEGORIES,
  CONDITIONS,
  CLOTHING_SIZES,
  CITIES,
  SIZE_OPTIONS,
} from "@/lib/constants";
import { fetchLiveListings, cachedLiveListings } from "@/lib/fetchBrowse";

/** One card in the grid. Matches BrowseListing from the route, which is where
 *  every one of these now comes from. */
type GridListing = {
  id: string;
  title: string;
  brand: Brand;
  brandOther?: string;
  category: Category;
  size: string | null;
  condition: ConditionValue;
  askingPrice: number;
  city: City;
  coverPhoto: string;
};


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
};

const BRAND_SPECIAL: Record<string, string> = {
  hm: "H&M",
  maria_b: "Maria B.",
  pull_and_bear: "Pull & Bear",
  marks_and_spencer: "Marks & Spencer",
  forever_21: "Forever 21",
};

function formatBrandName(brand: string): string {
  if (BRAND_SPECIAL[brand]) return BRAND_SPECIAL[brand];
  return brand
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({
  value: c,
  label: CATEGORY_LABELS[c],
}));

const BRAND_OPTIONS = BRANDS.filter(
  (b): b is Exclude<Brand, "unknown" | "other"> =>
    b !== "unknown" && b !== "other"
)
  .map((b) => ({ value: b, label: formatBrandName(b) }))
  .sort((a, b) => a.label.localeCompare(b.label));

const CONDITION_OPTIONS = CONDITIONS.map((c) => ({
  value: c.value,
  label: c.label,
}));

const CITY_OPTIONS: { value: City; label: string }[] = CITIES.filter(
  (c) => c.value !== "other"
).map((c) => ({
  value: c.value,
  label: c.label,
}));

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];
const DEFAULT_SORT = "newest";

type PriceRange = {
  value: string;
  label: string;
  /** Lower bound of the range, used to work out which ranges a maxPrice link covers. */
  min: number;
  test: (price: number) => boolean;
};

const PRICE_RANGES: PriceRange[] = [
  { value: "under_1000", label: "Under Rs 1,000", min: 0, test: (p) => p < 1000 },
  { value: "1000_3000", label: "Rs 1,000 to 3,000", min: 1000, test: (p) => p >= 1000 && p <= 3000 },
  { value: "3000_5000", label: "Rs 3,000 to 5,000", min: 3000, test: (p) => p >= 3000 && p <= 5000 },
  { value: "5000_plus", label: "Rs 5,000+", min: 5000, test: (p) => p > 5000 },
];

type FilterKey = "sort" | "category" | "brand" | "size" | "condition" | "price" | "city";

function FilterIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 4h14M4 9h10M6 14h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      style={{ marginLeft: "4px", flexShrink: 0 }}
    >
      <path
        d="M3 4.5l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function summarize(selected: string[], labels: Map<string, string>): string {
  if (selected.length === 0) return "All";
  return selected.map((v) => labels.get(v) ?? v).join(", ");
}

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseContent />
    </Suspense>
  );
}

function BrowseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<Brand[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<ConditionValue[]>([]);
  const [selectedCities, setSelectedCities] = useState<City[]>([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>(DEFAULT_SORT);
  // Set only when price ranges come from a ?maxPrice= link, so the heading can
  // show "Under PKR X" instead of a generic label. Cleared on any manual price edit.
  const [maxPriceLabel, setMaxPriceLabel] = useState<string | null>(null);

  const initializedFromUrl = useRef(false);
  /** True once the filters in the link have been applied to state. Nothing may
   *  write the URL before that, or it writes over the link it was given. */
  const [urlApplied, setUrlApplied] = useState(false);

  // Every live listing, newest first, from Firestore. The sample array that
  // used to sit underneath these was deleted on 14 Oct: the grid shows what is
  // actually for sale, and an empty grid is an honest answer.
  //
  // Starts from whatever this tab already fetched, so a filter tap (which
  // rewrites the URL and remounts this page) never blanks them out.
  const [allListings, setAllListings] = useState<GridListing[]>(
    () => cachedLiveListings() ?? [],
  );
  const [loadingLive, setLoadingLive] = useState(() => cachedLiveListings() === null);

  useEffect(() => {
    let alive = true;
    void fetchLiveListings().then((listings) => {
      if (!alive) return;
      setAllListings(listings);
      setLoadingLive(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Read the landing page's links once on mount: ?q=, ?category=, ?brand=,
  // ?maxPrice= and ?city=. Values that are not real enum members are ignored
  // rather than applied, so a bad link shows everything instead of nothing.
  useEffect(() => {
    if (initializedFromUrl.current) return;
    initializedFromUrl.current = true;

    const q = searchParams.get("q");
    if (q) setSearch(q);

    const categoryParam = searchParams.get("category");
    if (categoryParam && (CATEGORIES as readonly string[]).includes(categoryParam)) {
      setSelectedCategories([categoryParam as Category]);
    }

    const brandParam = searchParams.get("brand");
    if (brandParam && (BRANDS as readonly string[]).includes(brandParam)) {
      setSelectedBrands([brandParam as Brand]);
    }

    const cityParam = searchParams.get("city");
    if (cityParam && CITIES.some((c) => c.value === cityParam)) {
      setSelectedCities([cityParam as City]);
    }

    const maxPriceParam = searchParams.get("maxPrice");
    if (maxPriceParam) {
      const n = Number(maxPriceParam);
      if (Number.isFinite(n) && n > 0) {
        const ranges = PRICE_RANGES.filter((r) => r.min < n).map((r) => r.value);
        if (ranges.length > 0) {
          setSelectedPriceRanges(ranges);
          setMaxPriceLabel(`Under PKR ${n.toLocaleString("en")}`);
        }
      }
    }

    // Only now may the URL be written back. See the effect below.
    setUrlApplied(true);
  }, [searchParams]);

  // Keep the URL in sync with whatever the user has selected, so the page can
  // be shared with filters intact.
  //
  // FIXED: this used to skip its first pass using a ref, to avoid writing an
  // empty URL before the read above had applied. React runs every effect twice
  // in development, which used up that skip on the duplicate pass, so the real
  // first pass ran with no filters selected yet and replaced the URL with a
  // bare /browse. A link from the homepage to /browse?category=kurta lost its
  // category before anything could read it, and the page showed everything.
  //
  // Waiting on state set by the read effect instead of on a ref is immune to
  // that: the write cannot run until the read has actually committed.
  useEffect(() => {
    if (!urlApplied) return;
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (selectedCategories.length) params.set("category", selectedCategories.join(","));
    if (selectedBrands.length) params.set("brand", selectedBrands.join(","));
    if (selectedSizes.length) params.set("size", selectedSizes.join(","));
    if (selectedConditions.length) params.set("condition", selectedConditions.join(","));
    if (selectedCities.length) params.set("city", selectedCities.join(","));
    if (selectedPriceRanges.length) params.set("price", selectedPriceRanges.join(","));
    if (sortBy !== DEFAULT_SORT) params.set("sort", sortBy);
    const qs = params.toString();
    router.replace(qs ? `/browse?${qs}` : "/browse", { scroll: false });
  }, [
    search,
    selectedCategories,
    selectedBrands,
    selectedSizes,
    selectedConditions,
    selectedCities,
    selectedPriceRanges,
    sortBy,
    router,
    urlApplied,
  ]);

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedBrands.length > 0 ||
    selectedSizes.length > 0 ||
    selectedConditions.length > 0 ||
    selectedCities.length > 0 ||
    selectedPriceRanges.length > 0;

  const activePriceTests = useMemo(
    () => PRICE_RANGES.filter((r) => selectedPriceRanges.includes(r.value)),
    [selectedPriceRanges]
  );

  const filtered = useMemo(() => {
    let results = allListings;
    if (selectedCategories.length > 0)
      results = results.filter((l) => selectedCategories.includes(l.category));
    if (selectedBrands.length > 0)
      results = results.filter((l) => selectedBrands.includes(l.brand));
    if (selectedSizes.length > 0)
      results = results.filter((l) => l.size !== null && selectedSizes.includes(l.size));
    if (selectedConditions.length > 0)
      results = results.filter((l) => selectedConditions.includes(l.condition));
    if (selectedCities.length > 0)
      results = results.filter((l) => selectedCities.includes(l.city));
    if (activePriceTests.length > 0)
      results = results.filter((l) =>
        activePriceTests.some((range) => range.test(l.askingPrice))
      );
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.brand.toLowerCase().includes(q) ||
          (l.brandOther && l.brandOther.toLowerCase().includes(q))
      );
    }
    if (sortBy === "price_asc") {
      results = [...results].sort((a, b) => a.askingPrice - b.askingPrice);
    } else if (sortBy === "price_desc") {
      results = [...results].sort((a, b) => b.askingPrice - a.askingPrice);
    }
    return results;
  }, [
    allListings,
    search,
    selectedCategories,
    selectedBrands,
    selectedSizes,
    selectedConditions,
    selectedCities,
    activePriceTests,
    sortBy,
  ]);

  function clearFilters() {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setSelectedSizes([]);
    setSelectedConditions([]);
    setSelectedCities([]);
    setSelectedPriceRanges([]);
    setMaxPriceLabel(null);
    setSortBy(DEFAULT_SORT);
    setSearch("");
  }

  function handlePriceChange(values: string[]) {
    setSelectedPriceRanges(values);
    setMaxPriceLabel(null);
  }

  function handleNavSearch(query: string) {
    setSearch(query);
  }

  const sizeOptions = useMemo(() => {
    const sizes =
      selectedCategories.length === 1
        ? SIZE_OPTIONS[selectedCategories[0]]
        : CLOTHING_SIZES;
    if (!sizes) return [];
    return Array.from(sizes).map((s) => ({ value: s, label: s }));
  }, [selectedCategories]);

  function handleCategoriesChange(values: string[]) {
    setSelectedCategories(values as Category[]);
    setSelectedSizes([]);
  }

  const categoryLabelMap = new Map(CATEGORY_OPTIONS.map((o) => [o.value, o.label]));
  const brandLabelMap = new Map(BRAND_OPTIONS.map((o) => [o.value, o.label]));
  const conditionLabelMap = new Map(CONDITION_OPTIONS.map((o) => [o.value, o.label]));
  const cityLabelMap = new Map(CITY_OPTIONS.map((o) => [o.value, o.label]));
  const priceLabelMap = new Map(PRICE_RANGES.map((r) => [r.value, r.label]));
  const sortLabelMap = new Map(SORT_OPTIONS.map((o) => [o.value, o.label]));

  const panelRows: FilterRow[] = [
    { key: "sort", label: "Sort by", valueLabel: sortLabelMap.get(sortBy) ?? "Newest" },
    { key: "category", label: "Category", valueLabel: summarize(selectedCategories, categoryLabelMap) },
    { key: "size", label: "Size", valueLabel: summarize(selectedSizes, new Map(sizeOptions.map((o) => [o.value, o.label]))) },
    { key: "brand", label: "Brand", valueLabel: summarize(selectedBrands, brandLabelMap) },
    { key: "condition", label: "Condition", valueLabel: summarize(selectedConditions, conditionLabelMap) },
    { key: "price", label: "Price", valueLabel: summarize(selectedPriceRanges, priceLabelMap) },
    { key: "city", label: "City", valueLabel: summarize(selectedCities, cityLabelMap) },
  ];

  function openFromPanel(key: string) {
    setOpenFilter(key as FilterKey);
  }

  // Steps back up one level: to the All Filters panel if that's how this
  // filter was opened, or straight to the browse grid if it wasn't.
  function backFromSubFilter() {
    setOpenFilter(null);
  }

  // Fully exits filtering (closes the sub-filter and the panel beneath it,
  // if any) and shows the results.
  function closeAllFilters() {
    setOpenFilter(null);
    setPanelOpen(false);
  }

  // Priority matches how a single landing-page link maps to one filter at a
  // time: a typed search beats everything, then a single category or brand,
  // then a price link, then the default.
  function pageHeading(): string {
    if (search.trim()) return search.trim();
    if (selectedCategories.length === 1) return CATEGORY_LABELS[selectedCategories[0]];
    if (selectedBrands.length === 1) return formatBrandName(selectedBrands[0]);
    if (maxPriceLabel && selectedPriceRanges.length > 0) return maxPriceLabel;
    return "All items";
  }

  return (
    <>
      <Nav onSearch={handleNavSearch} />
      <main
        className="container"
        style={{
          paddingTop: "var(--space-4)",
          paddingBottom: "var(--space-8)",
        }}
      >

        <div className="browse-header">
          <h1 className="browse-heading">{pageHeading()}</h1>
          <div className="browse-header-right">
            <span className="browse-count">
              {filtered.length} {filtered.length === 1 ? "item" : "items"}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                className="clear-filters-btn"
                onClick={clearFilters}
              >
                Clear filters
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="browse-filters">
          <div className="chip-row">
            <button
              type="button"
              className={`filter-icon-btn${hasActiveFilters ? " active" : ""}`}
              aria-label="Filters"
              onClick={() => setPanelOpen(true)}
            >
              <FilterIcon />
            </button>
            <FilterChip
              active={selectedCategories.length > 0}
              onClick={() => setOpenFilter("category")}
            >
              {selectedCategories.length === 1
                ? CATEGORY_LABELS[selectedCategories[0]]
                : selectedCategories.length > 1
                  ? `Category (${selectedCategories.length})`
                  : "Category"}
              <ChevronDown />
            </FilterChip>
            <FilterChip
              active={selectedBrands.length > 0}
              onClick={() => setOpenFilter("brand")}
            >
              {selectedBrands.length === 1
                ? formatBrandName(selectedBrands[0])
                : selectedBrands.length > 1
                  ? `Brand (${selectedBrands.length})`
                  : "Brand"}
              <ChevronDown />
            </FilterChip>
            <FilterChip
              active={selectedSizes.length > 0}
              onClick={() => setOpenFilter("size")}
            >
              {selectedSizes.length === 1
                ? selectedSizes[0]
                : selectedSizes.length > 1
                  ? `Size (${selectedSizes.length})`
                  : "Size"}
              <ChevronDown />
            </FilterChip>
            <FilterChip
              active={selectedConditions.length > 0}
              onClick={() => setOpenFilter("condition")}
            >
              {selectedConditions.length === 1
                ? conditionLabelMap.get(selectedConditions[0]) ?? "Condition"
                : selectedConditions.length > 1
                  ? `Condition (${selectedConditions.length})`
                  : "Condition"}
              <ChevronDown />
            </FilterChip>
            <FilterChip
              active={selectedCities.length > 0}
              onClick={() => setOpenFilter("city")}
            >
              {selectedCities.length === 1
                ? cityLabelMap.get(selectedCities[0]) ?? "City"
                : selectedCities.length > 1
                  ? `City (${selectedCities.length})`
                  : "City"}
              <ChevronDown />
            </FilterChip>
          </div>
        </div>

        {loadingLive && filtered.length === 0 ? (
          // Only while there is nothing to show yet. Once the sample items are
          // on screen, swapping them for skeletons would be a step backwards.
          <div className="browse-grid" aria-busy="true" aria-label="Loading listings">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i}>
                <div className="skeleton skeleton-card-photo" />
                <div className="skeleton-lines">
                  <div className="skeleton skeleton-line skeleton-line-brand" />
                  <div className="skeleton skeleton-line skeleton-line-title" />
                  <div className="skeleton skeleton-line skeleton-line-price" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="browse-grid">
            {filtered.map((listing) => (
              <BrowseCard
                key={listing.id}
                id={listing.id}
                title={listing.title}
                brand={listing.brand}
                brandOther={listing.brandOther}
                category={listing.category}
                askingPrice={listing.askingPrice}
                coverPhoto={listing.coverPhoto}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-illustration">
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="17"
                  cy="17"
                  r="12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M26 26l10 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="empty-state-heading">Nothing here yet</p>
            <p className="empty-state-body">
              Try changing your filters or searching for something else.
            </p>
            {hasActiveFilters && (
              <div className="empty-state-cta">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={clearFilters}
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="browse-footer">
        <div className="browse-footer-inner">
          <nav aria-label="Footer" className="browse-footer-links">
            <a href="#" className="browse-footer-link">How it works</a>
            <span className="browse-footer-dot" aria-hidden="true">·</span>
            <a href="#" className="browse-footer-link">Instagram</a>
            <span className="browse-footer-dot" aria-hidden="true">·</span>
            <a href="#" className="browse-footer-link">Contact</a>
          </nav>
          <p className="browse-footer-copyright">© Reloved 2026</p>
        </div>
      </footer>

      {panelOpen && (
        <FilterPanel
          rows={panelRows}
          resultCount={filtered.length}
          onOpenRow={openFromPanel}
          onClearAll={clearFilters}
          onClose={closeAllFilters}
          hasActiveFilters={hasActiveFilters}
        />
      )}

      {openFilter === "sort" && (
        <FilterPage
          title="Sort by"
          options={SORT_OPTIONS}
          selected={[sortBy]}
          onChange={(v) => setSortBy(v[0] ?? DEFAULT_SORT)}
          onBack={backFromSubFilter}
          onClose={closeAllFilters}
          resultCount={filtered.length}
          multiple={false}
        />
      )}
      {openFilter === "category" && (
        <FilterPage
          title="Category"
          options={CATEGORY_OPTIONS}
          selected={selectedCategories}
          onChange={handleCategoriesChange}
          onBack={backFromSubFilter}
          onClose={closeAllFilters}
          resultCount={filtered.length}
        />
      )}
      {openFilter === "brand" && (
        <FilterPage
          title="Brand"
          options={BRAND_OPTIONS}
          selected={selectedBrands}
          onChange={(v) => setSelectedBrands(v as Brand[])}
          onBack={backFromSubFilter}
          onClose={closeAllFilters}
          resultCount={filtered.length}
          searchable
        />
      )}
      {openFilter === "size" && (
        <FilterPage
          title="Size"
          options={sizeOptions}
          selected={selectedSizes}
          onChange={(v) => setSelectedSizes(v)}
          onBack={backFromSubFilter}
          onClose={closeAllFilters}
          resultCount={filtered.length}
          emptyMessage="This category has no sizes"
        />
      )}
      {openFilter === "condition" && (
        <FilterPage
          title="Condition"
          options={CONDITION_OPTIONS}
          selected={selectedConditions}
          onChange={(v) => setSelectedConditions(v as ConditionValue[])}
          onBack={backFromSubFilter}
          onClose={closeAllFilters}
          resultCount={filtered.length}
        />
      )}
      {openFilter === "price" && (
        <FilterPage
          title="Price"
          options={PRICE_RANGES}
          selected={selectedPriceRanges}
          onChange={handlePriceChange}
          onBack={backFromSubFilter}
          onClose={closeAllFilters}
          resultCount={filtered.length}
        />
      )}
      {openFilter === "city" && (
        <FilterPage
          title="City"
          options={CITY_OPTIONS}
          selected={selectedCities}
          onChange={(v) => setSelectedCities(v as City[])}
          onBack={backFromSubFilter}
          onClose={closeAllFilters}
          resultCount={filtered.length}
          searchable
        />
      )}

    </>
  );
}
