import { createFileRoute } from "@tanstack/react-router";
import { MallEditor } from "@/components/MallEditor";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mall Map Editor" },
      { name: "description", content: "Edit store labels on a 2-floor interactive mall map." },
      { property: "og:title", content: "Mall Map Editor" },
      { property: "og:description", content: "Edit store labels on a 2-floor interactive mall map." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MallEditor,
});
