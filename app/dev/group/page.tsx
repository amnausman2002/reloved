import { notFound } from "next/navigation";
import GroupTester from "./GroupTester";

// Development only. Never linked, and returns 404 if it ever reaches production.
export default function DevGroupPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <GroupTester />;
}
