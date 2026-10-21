import { createFileRoute } from "@tanstack/react-router";
import { MemorizeMushaf } from "@/components/MemorizeMushaf";

export const Route = createFileRoute("/hifz")({
  head: () => ({
    meta: [
      { title: "Mémorisation (Mushaf) — CoranProFree" },
      { name: "description", content: "Récitez de mémoire : les versets sont floutés et se révèlent un à un, synchronisés avec la récitation audio." },
    ],
  }),
  component: MemorizeMushaf,
});
