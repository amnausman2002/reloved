import Image from "next/image";
import Link from "next/link";
import type { Brand, Category } from "@/lib/constants";
import { BRAND_LABELS } from "@/lib/constants";

type Props = {
  id: string;
  title: string;
  brand: Brand;
  brandOther?: string;
  category: Category;
  askingPrice: number;
  coverPhoto: string;
};

function brandLabel(brand: Brand, brandOther?: string): string | null {
  if (brand === "unknown") return null;
  if (brand === "other") return brandOther ?? null;
  return BRAND_LABELS[brand] ?? brand.replace(/_/g, " ");
}

function formatPrice(price: number): string {
  return `Rs ${price.toLocaleString("en")}`;
}

export default function BrowseCard({
  id,
  title,
  brand,
  brandOther,
  askingPrice,
  coverPhoto,
}: Props) {
  const displayBrand = brandLabel(brand, brandOther);

  return (
    <Link href={`/item/${id}`} className="browse-card">
      <div className="browse-card-photo">
        <Image
          src={coverPhoto}
          alt={title}
          width={400}
          height={533}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        />
      </div>
      <div className="browse-card-info">
        {displayBrand && (
          <span className="browse-card-brand">{displayBrand}</span>
        )}
        <span className="browse-card-title">{title}</span>
        <span className="browse-card-price">{formatPrice(askingPrice)}</span>
      </div>
    </Link>
  );
}
