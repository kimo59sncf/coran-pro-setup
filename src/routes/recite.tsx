import { createFileRoute, redirect } from "@tanstack/react-router";

// The recitation coach has been merged into the memorization mushaf (/hifz).
export const Route = createFileRoute("/recite")({
  beforeLoad: () => { throw redirect({ to: "/hifz" }); },
});
