import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Printer, Loader2, Trash2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface TextField {
  id: string;
  pageIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
  originalText: string;
  editedText: string;
  fontSize: number;
  pdfX: number;
  pdfY: number;
  pdfWidth: number;
  pdfHeight: number;
  fontName: string;
  isBold: boolean;
}

interface PdfEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  filename: string;
  onDelete?: () => void;
}

const SCALE = 1.5;

export default function PdfEditor({ open, onOpenChange, fileUrl, filename, onDelete }: PdfEditorProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [textFields, setTextFields] = useState<TextField[]>([]);
  const [editMode, setEditMode] = useState(false);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pageDataRef = useRef<Map<number, { viewport: any; page: any }>>(new Map());

  const resetState = useCallback(() => {
    setPdfDoc(null);
    setTextFields([]);
    setEditMode(false);
    setPageCount(0);
    setError(null);
    canvasRefs.current.clear();
    pageDataRef.current.clear();
  }, []);

  const loadPdf = useCallback(async () => {
    if (!fileUrl || !open) return;
    resetState();
    setLoading(true);
    try {
      const loadingTask = pdfjsLib.getDocument(fileUrl);
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setPageCount(doc.numPages);
    } catch (err: any) {
      console.error("PDF load error:", err);
      if (err?.status === 404 || err?.message?.includes("404")) {
        setError("This file needs to be re-uploaded. The original file is no longer available. Please delete this entry and upload the file again.");
      } else {
        setError("Failed to load PDF. The file may be corrupted or unsupported.");
      }
    } finally {
      setLoading(false);
    }
  }, [fileUrl, open, resetState]);

  useEffect(() => {
    if (open && fileUrl) {
      loadPdf();
    }
    if (!open) {
      resetState();
    }
  }, [open, fileUrl, loadPdf, resetState]);

  useEffect(() => {
    if (!pdfDoc) return;
    const renderPages = async () => {
      const detectedFields: TextField[] = [];

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: SCALE });
        const canvas = canvasRefs.current.get(i);
        if (!canvas) continue;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport }).promise;

        pageDataRef.current.set(i, { viewport, page });

        try {
          const textContent = await page.getTextContent();
          const styles = (textContent as any).styles || {};
          const items = textContent.items as any[];
          const fontNames = new Set<string>();
          items.forEach((it: any) => { if (it.fontName) fontNames.add(it.fontName); });
          console.log(`[PDF Editor] Page ${i} fonts:`, Array.from(fontNames));

          for (const item of items) {
            if (!item.str || item.str.trim() === "") continue;

            const fontName = item.fontName || "";
            const style = styles[fontName] || {};
            const isBold = /bold|negrita|fett|gras/i.test(fontName) || 
                           (style.fontWeight && style.fontWeight >= 700) ||
                           /[\-,]B(?:old|d)?[,\+\-]|[\-_]Bd[,\-]?|Heavy|Black|Demi[Bb]old|\.B\b/i.test(fontName) ||
                           /^[A-Z]{6}\+.*?[-,]B(?:old)?/i.test(fontName) ||
                           /^[A-Z]{6}\+.*Bold/i.test(fontName) ||
                           /[_\-]Bold[_\-]?/i.test(fontName) ||
                           /Bd[A-Z]|BdIt|\.b\b/i.test(fontName) ||
                           (style.fontFamily && /bold/i.test(style.fontFamily));

            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
            const pdfFontSize = Math.sqrt(item.transform[0] * item.transform[0] + item.transform[1] * item.transform[1]);
            const scaledFontSize = pdfFontSize * SCALE;
            const angle = Math.atan2(item.transform[1], item.transform[0]);

            if (Math.abs(angle) > 0.1) continue;

            const left = tx[4];
            const top = tx[5] - scaledFontSize;
            const width = item.width * SCALE;
            const height = scaledFontSize * 1.3;

            const pdfX = item.transform[4];
            const pdfY = item.transform[5];
            const pdfWidth = item.width;
            const pdfHeight = pdfFontSize;

            detectedFields.push({
              id: `field-${i}-${detectedFields.length}-${Math.random().toString(36).slice(2, 6)}`,
              pageIndex: i,
              left,
              top,
              width: Math.max(width, 30),
              height,
              originalText: item.str,
              editedText: item.str,
              fontSize: pdfFontSize,
              pdfX,
              pdfY,
              pdfWidth,
              pdfHeight,
              fontName,
              isBold,
            });
          }
        } catch (err) {
          console.error(`Error extracting text from page ${i}:`, err);
        }
      }

      setTextFields(detectedFields);
    };
    renderPages();
  }, [pdfDoc]);

  const handleEnterEditMode = () => {
    setTextFields((prev) =>
      prev.map((f) => ({ ...f, editedText: "" }))
    );
    setEditMode(true);
  };

  const updateTextField = (id: string, newText: string) => {
    setTextFields((prev) => prev.map((f) => (f.id === id ? { ...f, editedText: newText } : f)));
  };

  const getModifiedFields = () => textFields.filter((f) => f.editedText !== f.originalText);

  const handlePrint = async () => {
    if (!pdfDoc) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let pagesHtml = "";
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const canvas = canvasRefs.current.get(i);
      if (!canvas) continue;

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) continue;

      ctx.drawImage(canvas, 0, 0);

      const pageBoldEdits = getModifiedFields().filter((f) => f.pageIndex === i);
      pageBoldEdits.forEach((field) => {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(field.left, field.top, field.width + 20, field.height);
        const scaledSize = field.fontSize * SCALE;
        ctx.font = `bold ${scaledSize}px sans-serif`;
        ctx.fillStyle = "#000000";
        ctx.fillText(field.editedText, field.left, field.top + scaledSize);
      });

      const dataUrl = tempCanvas.toDataURL("image/png");
      pagesHtml += `<div style="page-break-after: always; margin: 0; padding: 0;"><img src="${dataUrl}" style="width: 100%; height: auto;" /></div>`;
    }

    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>${filename}</title>
      <style>
        @media print { body { margin: 0; } @page { margin: 0.5in; } }
        body { margin: 0; padding: 0; }
        div:last-child { page-break-after: auto !important; }
      </style></head><body>${pagesHtml}</body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleSavePdf = async () => {
    if (!pdfDoc) return;
    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const existingPdfBytes = await fetch(fileUrl).then((r) => r.arrayBuffer());
      const pdfLibDoc = await PDFDocument.load(existingPdfBytes);
      const font = await pdfLibDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfLibDoc.getPages();

      const modifiedBoldFields = getModifiedFields();
      for (const field of modifiedBoldFields) {
        const pageIdx = field.pageIndex - 1;
        if (pageIdx < 0 || pageIdx >= pages.length) continue;
        const page = pages[pageIdx];

        const rectY = field.pdfY - field.pdfHeight * 0.3;
        page.drawRectangle({
          x: field.pdfX - 1,
          y: rectY,
          width: field.pdfWidth + 10,
          height: field.pdfHeight * 1.4,
          color: rgb(1, 1, 1),
        });

        page.drawText(field.editedText, {
          x: field.pdfX,
          y: field.pdfY,
          size: field.fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      }

      const modifiedPdfBytes = await pdfLibDoc.save();
      const blob = new Blob([modifiedPdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename.replace(/\.pdf$/i, "") + " (edited).pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error saving PDF:", err);
    }
  };

  const fieldCount = textFields.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg truncate pr-8">{filename}</DialogTitle>
          <DialogDescription>
            View, print, or download this PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 justify-between items-center">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print-pdf">
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleSavePdf} data-testid="button-save-pdf">
              <Download className="h-4 w-4 mr-1" />
              Download PDF
            </Button>
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onDelete}
                data-testid="button-delete-lease"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Lease
              </Button>
            )}
          </div>
        </div>

        <div
          ref={pagesContainerRef}
          className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900 rounded-md"
          style={{ minHeight: "400px" }}
        >
          {loading && (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full min-h-[400px] text-destructive">
              <p>{error}</p>
            </div>
          )}
          {!loading && !error && pdfDoc && (
            <div className="flex flex-col items-center gap-4 p-4">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => (
                <div
                  key={pageNum}
                  className="relative bg-white shadow-md"
                  data-testid={`pdf-page-${pageNum}`}
                >
                  <canvas
                    ref={(el) => {
                      if (el) canvasRefs.current.set(pageNum, el);
                    }}
                  />
                  {editMode &&
                    textFields
                      .filter((f) => f.pageIndex === pageNum)
                      .map((field) => (
                        <div
                          key={field.id}
                          className="absolute"
                          style={{
                            left: `${field.left}px`,
                            top: `${field.top}px`,
                            width: `${field.width + 20}px`,
                            height: `${field.height}px`,
                          }}
                        >
                          <input
                            type="text"
                            value={field.editedText}
                            onChange={(e) => updateTextField(field.id, e.target.value)}
                            placeholder={field.originalText}
                            className={`w-full h-full border-0 outline-none text-black px-0 border-b-2 ${field.isBold ? "font-bold bg-yellow-50/90 border-blue-400" : "bg-blue-50/70 border-blue-300"}`}
                            style={{
                              fontSize: `${field.fontSize * SCALE}px`,
                              lineHeight: `${field.height}px`,
                              caretColor: "#2563eb",
                            }}
                            data-testid={`input-text-field-${field.id}`}
                          />
                        </div>
                      ))}
                  <div className="absolute bottom-1 right-2 text-xs text-gray-400 select-none">
                    Page {pageNum} of {pageCount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
