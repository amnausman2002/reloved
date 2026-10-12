import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { isAdmin, userFromIdToken } from "@/lib/firebase/admin";
import { pendingQueue } from "@/lib/data/admin";
import AdminQueue from "./AdminQueue";
import AdminSignIn from "./AdminSignIn";

export const metadata = { title: "Queue | Reloved admin" };

// Path 4 in the PRD. Deliberately small: a working queue, not a dashboard.
//
// Server-rendered, so the listings and the sellers' phone numbers are fetched
// with the Admin SDK and never exposed to a browser that has no business
// seeing them. The page decides whether you are an admin before it renders a
// single row.
//
// A non-admin gets a 404 rather than "forbidden". There is no reason to tell
// anyone that an admin area exists here.

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Set by AdminSignIn after Firebase auth succeeds. Reading it here is what
  // lets the server know who is asking: a server component cannot see the
  // browser's Firebase session any other way.
  const token = (await cookies()).get("reloved_admin_token")?.value;
  const user = await userFromIdToken(token);

  if (!user) return <AdminSignIn />;
  if (!(await isAdmin(user.uid))) notFound();

  const queue = await pendingQueue();

  return (
    <main className="admin-page">
      <header className="admin-head">
        <h1 className="text-h1">Queue.</h1>
        <p className="admin-count">
          {queue.length === 0
            ? "Nothing waiting"
            : `${queue.length} waiting, oldest first`}
        </p>
      </header>

      <AdminQueue items={queue} />
    </main>
  );
}
