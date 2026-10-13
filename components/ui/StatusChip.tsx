import { LISTING_STATUS_LABELS } from "@/lib/constants";
import type { ListingStatus } from "@/lib/constants";

// .status-chip from components.html, one variant per listing status. Small
// labels only, never a large fill: `sold` is the only solid one.
//
// `ownerView` swaps two labels for the seller managing her own listing:
// rejected becomes a neutral amber "Needs attention" (`.status-needs-attention`)
// and pending becomes a neutral grey "Under review" (`.status-under-review`).
// Buyers and admins always see the plain status.
export default function StatusChip({
  status,
  ownerView = false,
}: {
  status: ListingStatus;
  ownerView?: boolean;
}) {
  if (ownerView && status === "rejected") {
    return <span className="status-chip status-needs-attention">Needs attention</span>;
  }
  if (ownerView && status === "pending") {
    return <span className="status-chip status-under-review">Under review</span>;
  }
  return (
    <span className={`status-chip status-${status}`}>
      {LISTING_STATUS_LABELS[status]}
    </span>
  );
}
