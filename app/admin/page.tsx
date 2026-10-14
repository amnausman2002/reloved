import { cookies } from "next/headers";
import { isAdmin, userFromIdToken } from "@/lib/firebase/admin";
import { pendingQueue, recentAccounts } from "@/lib/data/admin";
import AdminTabs from "./AdminTabs";
import AdminSignIn from "./AdminSignIn";

export const metadata = { title: "Queue | Reloved admin" };

// Path 4 in the PRD. Deliberately small: a working queue, not a dashboard.
//
// Server-rendered, so the listings and the sellers' phone numbers are fetched
// with the Admin SDK and never exposed to a browser that has no business
// seeing them. The page decides whether you are an admin before it renders a
// single row.
//
// A signed-in non-admin gets the sign-in screen back, not a 404.
//
// CHANGED 12 Oct: this used to be notFound(), on the reasoning that there was
// no point advertising an admin area. That reasoning was already broken, since
// anyone signed out can see this sign-in page, and it had a real cost: a
// seller who wandered to /admin, or any of us carrying a seller's session,
// hit a dead 404 with no way to sign in as anyone else until the cookie
// expired an hour later.
//
// Nothing is weaker for it. /api/admin/moderate still answers 404 to a
// non-admin, and the queue below is only ever built after isAdmin passes.

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Set by AdminSignIn after Firebase auth succeeds. Reading it here is what
  // lets the server know who is asking: a server component cannot see the
  // browser's Firebase session any other way.
  const token = (await cookies()).get("reloved_admin_token")?.value;
  const user = await userFromIdToken(token);

  if (!user) return <AdminSignIn />;
  if (!(await isAdmin(user.uid))) {
    return <AdminSignIn wrongAccount={user.email ?? "That account"} />;
  }

  // Both lists in one render. They are two halves of the same job: a listing
  // is not trustworthy until its seller's number has answered on WhatsApp.
  const [queue, accounts] = await Promise.all([pendingQueue(), recentAccounts()]);

  const waitingAccounts = accounts.filter((a) => a.phone !== null && !a.phone_verified).length;
  const waiting = queue.length + waitingAccounts;

  return (
    <main className="admin-page">
      <header className="admin-head">
        <h1 className="text-h1">Queue.</h1>
        <p className="admin-count">
          {waiting === 0 ? "Nothing waiting" : `${waiting} waiting`}
        </p>
      </header>

      <AdminTabs queue={queue} accounts={accounts} />
    </main>
  );
}
