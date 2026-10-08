"use client";

import { useState, useMemo } from "react";
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

type MockListing = {
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

const MOCK_LISTINGS: MockListing[] = [
  {
    id: "1",
    title: "Printed lawn kurta, mustard",
    brand: "khaadi",
    category: "kurta",
    size: "M",
    condition: "very_good",
    askingPrice: 2500,
    city: "lahore",
    coverPhoto: "/photos/listings/IMG_6511.jpg",
  },
  {
    id: "2",
    title: "Block print sleeveless kurta",
    brand: "sapphire",
    category: "kurta",
    size: "S",
    condition: "brand_new_without_tags",
    askingPrice: 3200,
    city: "karachi",
    coverPhoto: "/photos/listings/IMG_6513.jpg",
  },
  {
    id: "3",
    title: "Floral button-up dress",
    brand: "other",
    brandOther: "Quiz",
    category: "dress",
    size: "M",
    condition: "brand_new_with_tags",
    askingPrice: 1800,
    city: "islamabad",
    coverPhoto: "/photos/listings/IMG_6516.jpg",
  },
  {
    id: "4",
    title: "Ribbed polo crop top, lilac",
    brand: "unknown",
    category: "top",
    size: "S",
    condition: "very_good",
    askingPrice: 900,
    city: "lahore",
    coverPhoto: "/photos/listings/IMG_6514.jpg",
  },
  {
    id: "5",
    title: "Cotton printed kurta",
    brand: "generation",
    category: "kurta",
    size: "L",
    condition: "fair",
    askingPrice: 2800,
    city: "faisalabad",
    coverPhoto: "/photos/listings/IMG_6512.jpg",
  },
  {
    id: "6",
    title: "Printed lawn kurta, multicolour",
    brand: "khaadi",
    category: "kurta",
    size: "M",
    condition: "brand_new_without_tags",
    askingPrice: 3500,
    city: "rawalpindi",
    coverPhoto: "/photos/listings/IMG_6511.jpg",
  },
  {
    id: "7",
    title: "Cropped collared top, pink",
    brand: "zara",
    category: "top",
    size: "XS",
    condition: "very_good",
    askingPrice: 1200,
    city: "karachi",
    coverPhoto: "/photos/listings/IMG_6515.jpg",
  },
  {
    id: "8",
    title: "Printed sleeveless dress",
    brand: "limelight",
    category: "dress",
    size: "S",
    condition: "brand_new_without_tags",
    askingPrice: 2200,
    city: "lahore",
    coverPhoto: "/photos/listings/IMG_6513.jpg",
  },
  {
    id: "9",
    title: "Ribbed collar top, lavender",
    brand: "hm",
    category: "top",
    size: "M",
    condition: "fair",
    askingPrice: 750,
    city: "islamabad",
    coverPhoto: "/photos/listings/IMG_6514.jpg",
  },
  {
    id: "10",
    title: "Embroidered lawn kurta",
    brand: "cross_stitch",
    category: "kurta",
    size: "L",
    condition: "brand_new_with_tags",
    askingPrice: 4000,
    city: "multan",
    coverPhoto: "/photos/listings/IMG_6512.jpg",
  },
  {
    id: "11",
    title: "Monochrome floral dress",
    brand: "other",
    brandOther: "Quiz",
    category: "dress",
    size: "S",
    condition: "very_good",
    askingPrice: 1500,
    city: "peshawar",
    coverPhoto: "/photos/listings/IMG_6519.jpg",
  },
  {
    id: "12",
    title: "Summer lawn kurta, printed",
    brand: "beechtree",
    category: "kurta",
    size: "M",
    condition: "brand_new_without_tags",
    askingPrice: 1900,
    city: "hyderabad",
    coverPhoto: "/photos/listings/IMG_6511.jpg",
  },
];

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
  test: (price: number) => boolean;
};

const PRICE_RANGES: PriceRange[] = [
  { value: "under_1000", label: "Under Rs 1,000", test: (p) => p < 1000 },
  { value: "1000_3000", label: "Rs 1,000 – 3,000", test: (p) => p >= 1000 && p <= 3000 },
  { value: "3000_5000", label: "Rs 3,000 – 5,000", test: (p) => p >= 3000 && p <= 5000 },
  { value: "5000_plus", label: "Rs 5,000+", test: (p) => p > 5000 },
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
    let results = MOCK_LISTINGS;
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
    setSortBy(DEFAULT_SORT);
    setSearch("");
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
          <h1 className="browse-heading">
            {selectedCategories.length === 1
              ? CATEGORY_LABELS[selectedCategories[0]]
              : "All items"}
          </h1>
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

        {filtered.length > 0 ? (
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
          onChange={(v) => setSelectedPriceRanges(v)}
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
