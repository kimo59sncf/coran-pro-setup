import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getState } from "@/lib/store";

// "/mushaf" acts as a layout for "/mushaf/$page". The bare path redirects to the
// last viewed page (default: page 1) so the nav tab always opens the book.
export const Route = createFileRoute("/mushaf")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/mushaf" || location.pathname === "/mushaf/") {
      const page = Math.min(604, Math.max(1, getState().lastPage || 1));
      throw redirect({ to: "/mushaf/$page", params: { page: String(page) } });
    }
  },
  component: () => <Outlet />,
});
