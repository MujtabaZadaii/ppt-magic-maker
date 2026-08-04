import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Slide Studio — HD PDF & Editable PPT Downloads" },
      {
        name: "description",
        content:
          "Download Genspark lecture decks as razor-sharp HD PDFs and fully editable PowerPoint files, or convert any PDF into an editable PPTX in your browser.",
      },
      { property: "og:title", content: "Slide Studio — HD PDF & Editable PPT" },
      {
        property: "og:description",
        content: "HD vector PDFs and editable PPTX decks, plus a browser PDF→PPT converter.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DECKS = [
  {
    title: "Contemporary Pakistan",
    subtitle: "Issues, Challenges & Prospects · 20 slides",
    pdf: "/downloads/contemporary-pakistan-hd.pdf",
    pptx: "/downloads/contemporary-pakistan-editable.pptx",
  },
  {
    title: "Geography of Pakistan",
    subtitle: "Physical & Human Geography · 22 slides",
    pdf: "/downloads/geography-of-pakistan-hd.pdf",
    pptx: "/downloads/geography-of-pakistan-editable.pptx",
  },
];

function Index() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");

  async function convert(file: File) {
    setBusy(true);
    setStatus("Reading PDF…");
    try {
      const pdfjs = await import("pdfjs-dist");
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const PptxGenJS = (await import("pptxgenjs")).default;

      const buf = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: buf }).promise;
      const pptx = new PptxGenJS();
      pptx.defineLayout({ name: "HD", width: 13.333, height: 7.5 });
      pptx.layout = "HD";

      for (let i = 1; i <= doc.numPages; i++) {
        setStatus(`Converting page ${i} of ${doc.numPages}…`);
        const page = await doc.getPage(i);
        const base = page.getViewport({ scale: 1 });
        const sx = 13.333 / base.width;
        const sy = 7.5 / base.height;

        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;

        const slide = pptx.addSlide();
        slide.addImage({
          data: canvas.toDataURL("image/jpeg", 0.92),
          x: 0,
          y: 0,
          w: 13.333,
          h: 7.5,
        });

        const content = await page.getTextContent();
        for (const item of content.items as Array<Record<string, unknown>>) {
          const str = String(item["str"] ?? "").trim();
          if (!str) continue;
          const tr = (item["transform"] as number[]) ?? [1, 0, 0, 1, 0, 0];
          const size = Math.hypot(tr[2] ?? 1, tr[3] ?? 1) || 12;
          const w = Number(item["width"]) * sx;
          const h = size * sy;
          slide.addText(str, {
            x: (tr[4] ?? 0) * sx,
            y: (base.height - (tr[5] ?? 0) - size) * sy,
            w: Math.max(w * 1.15, 0.2),
            h: Math.max(h * 1.6, 0.15),
            fontSize: Math.max(size * 0.72, 5),
            color: "111111",
            margin: 0,
            fill: { color: "FFFFFF", transparency: 100 },
            valign: "middle",
          });
        }
      }
      setStatus("Saving…");
      await pptx.writeFile({ fileName: file.name.replace(/\.pdf$/i, "") + "-editable.pptx" });
      setStatus("Done — your editable PPTX has downloaded.");
    } catch (e) {
      setStatus("Conversion failed: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Slide Studio</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          HD PDFs & fully editable PowerPoints
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Your Genspark decks, rebuilt slide-by-slide as native PowerPoint shapes and text — every
          word editable — plus razor-sharp vector PDFs.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {DECKS.map((d) => (
            <article key={d.title} className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-card-foreground">{d.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{d.subtitle}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={d.pdf}
                  download
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Download HD PDF
                </a>
                <a
                  href={d.pptx}
                  download
                  className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                >
                  Download editable PPTX
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-card-foreground">PDF → editable PPT</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload any PDF. Each page becomes a slide with the original design preserved and the
            text placed on top as editable PowerPoint text boxes.
          </p>
          <label className="mt-5 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-border px-6 py-10 text-sm text-muted-foreground hover:bg-accent">
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void convert(f);
              }}
            />
            {busy ? "Working…" : "Click to choose a PDF file"}
          </label>
          {status && <p className="mt-4 text-sm text-foreground">{status}</p>}
        </div>
      </section>
    </main>
  );
}
