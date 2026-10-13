"use client";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/ui/Nav";
import PrimaryButton from "@/components/ui/PrimaryButton";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { CITIES } from "@/lib/constants";
import type { City } from "@/lib/constants";
import { getSeller } from "@/lib/sample-data";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { preparePhoto } from "@/lib/photos";

function BackIcon() {
  return (
    <svg width="24" height="14" viewBox="0 0 24 14" fill="none" aria-hidden="true">
      <path d="M23 7H1M1 7l5.5-6M1 7l5.5 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PencilSmallIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M227.32,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H216a8,8,0,0,0,0-16H115.32l112-112A16,16,0,0,0,227.32,73.37ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.69,147.32,64l24-24L216,84.69Z" />
    </svg>
  );
}

function initials(name: string): string {
  return name.trim().charAt(0).toLowerCase() || "?";
}

export default function EditSellerProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const seller = getSeller(id);
  const currentUser = useCurrentUser();
  const isOwner = Boolean(currentUser && seller && currentUser.id === seller.id);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [form, setForm] = useState(() => ({
    displayName: seller?.displayName ?? "",
    bio: seller?.bio ?? "",
    city: (seller?.city ?? CITIES[0].value) as City,
    phone: "+923001234567",
  }));
  const [phoneVerified, setPhoneVerified] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!seller || !isOwner) {
    return (
      <>
        <Nav />
        <main className="container" style={{ paddingTop: "var(--space-6)" }}>
          <p className="text-body">
            {seller ? "You can only edit your own profile." : "Seller not found."}
          </p>
        </main>
      </>
    );
  }

  const sellerId = seller.id;

  async function handleAvatarPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setAvatarBusy(true);
    const prepared = await preparePhoto(file);
    setAvatarUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(prepared.file);
    });
    setAvatarBusy(false);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!form.displayName.trim()) found.displayName = "Give yourself a name.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    router.push(`/seller/${sellerId}`);
  }

  return (
    <>
      <Nav />
      <main className="container" style={{ paddingBottom: "var(--space-8)" }}>
        <div className="profile-edit-heading">
          <Link href={`/seller/${seller.id}`} className="profile-edit-back" aria-label="Back">
            <BackIcon />
          </Link>
          <h2 className="profile-edit-title">Edit profile</h2>
        </div>

        <form
          id="edit-profile-form"
          className="profile-edit-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="avatar-name-row">
            <div
              className="avatar-edit-wrap"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label={avatarBusy ? "Preparing photo" : "Change profile photo"}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
            >
              <div className="avatar-edit-preview" aria-hidden="true">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" />
                ) : (
                  initials(form.displayName)
                )}
              </div>
              <span className="avatar-edit-badge" aria-hidden="true">
                <PencilSmallIcon />
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatarPick}
            />
            <div className="avatar-name-field" data-error={Boolean(errors.displayName)}>
              <Input
                label="Name"
                value={form.displayName}
                onChange={(event) => setForm((f) => ({ ...f, displayName: event.target.value }))}
                error={errors.displayName}
              />
            </div>
          </div>

          <div>
            <Textarea
              label="Bio (optional)"
              value={form.bio}
              onChange={(event) => setForm((f) => ({ ...f, bio: event.target.value }))}
            />
          </div>

          <div>
            <label className="input-label" htmlFor="profile-city">
              City
            </label>
            <select
              id="profile-city"
              className="select-input"
              value={form.city}
              onChange={(event) => setForm((f) => ({ ...f, city: event.target.value as City }))}
            >
              {CITIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Input
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={(event) => {
                setForm((f) => ({ ...f, phone: event.target.value }));
                setPhoneVerified(false);
              }}
              hint={phoneVerified ? undefined : "We'll text you a code to verify this number before it's saved."}
            />
          </div>

          <PrimaryButton type="submit">Save</PrimaryButton>
        </form>
      </main>
    </>
  );
}
