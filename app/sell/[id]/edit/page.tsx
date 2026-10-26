// Route wrapper. The real work is in EditFlow, which is a client component.
//
// Sits under /sell/[id]/edit, not under /seller/[id]/edit, deliberately: that
// other path is the seller's profile editor and already exists. "Editing a
// listing" belongs with /sell, same folder as the create flow and the form
// components it reuses.

import EditFlow from "@/app/sell/EditFlow";

export const metadata = {
  title: "Edit listing | Reloved",
};

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditFlow listingId={id} />;
}
