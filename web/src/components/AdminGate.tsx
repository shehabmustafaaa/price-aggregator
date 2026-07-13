import { Link } from "@/i18n/navigation";

/** Shown on admin pages when the visitor isn't a logged-in admin. */
export default function AdminGate() {
  return (
    <div className="max-w-md mx-auto rounded-xl border border-gray-800 bg-gray-900 p-6 text-center">
      <p className="text-red-400 font-medium mb-2">Admins only</p>
      <p className="text-sm text-gray-400 mb-4">
        Sign in with an admin account to access this page.
      </p>
      <Link
        href="/account"
        className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
      >
        Go to sign in
      </Link>
    </div>
  );
}
