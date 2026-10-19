import { createFileRoute, notFound } from "@tanstack/react-router";
import { MushafReader } from "@/components/MushafReader";

export const Route = createFileRoute("/mushaf/$page")({
  beforeLoad: ({ params }) => {
    const n = Number(params.page);
    if (!Number.isInteger(n) || n < 1 || n > 604) throw notFound();
  },
  head: ({ params }) => ({
    meta: [
      { title: `Mushaf — Page ${params.page} — CoranProFree` },
      { name: "description", content: `Lire le Coran en mode livre (mushaf), page ${params.page}.` },
    ],
  }),
  component: MushafRoute,
});

function MushafRoute() {
  const page = Number(Route.useParams().page);
  return <MushafReader page={page} />;
}
