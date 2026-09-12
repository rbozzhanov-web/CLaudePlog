import * as pdfjsLib from 'pdfjs-dist';

import { ExtractedPage } from './types';

// The native app runs pdf.js inside a hidden WebView because Hermes can't execute it directly
// (dynamic worker import); a browser has no such problem — pdfjs-dist just runs in the page, with
// its worker loaded from a plain URL instead of a WebView message bridge. The worker file itself
// still has to be a separately fetchable script (Workers load by URL, not by bundler import), so
// it's vendored as a static file at public/pdfjs/pdf.worker.min.mjs rather than imported in code —
// copied from node_modules/pdfjs-dist/build/pdf.worker.min.mjs, re-copy if pdfjs-dist is upgraded.
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

/**
 * Reads every page of a PDF into positioned text chunks, matching exactly what the native app's
 * WebView harness (src/lib/pdfImport/extractText.ts in the iOS repo) produces, so the same
 * parseRoster/rules pipeline works unchanged on both platforms.
 */
export async function extractPdfPages(file: Blob): Promise<ExtractedPage[]> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const pages: ExtractedPage[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    const items = content.items.map((item) => {
      const textItem = item as { str: string; transform: number[]; width: number };
      return {
        str: textItem.str,
        x: textItem.transform[4],
        // pdf.js text coordinates are bottom-up (PDF space); normalize to top-down so ascending
        // y is reading order for the app's tokenizer.
        y: viewport.height - textItem.transform[5],
        width: textItem.width,
      };
    });

    pages.push({ items, width: viewport.width, height: viewport.height });
  }

  return pages;
}
