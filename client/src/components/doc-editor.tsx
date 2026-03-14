import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Undo2, Redo2, Download, Printer, Minus, Palette,
  FileText, Loader2, Save, Indent, Outdent, Subscript, Superscript, Link2, Unlink2,
  Table, RemoveFormatting, Pilcrow, Heading1, Heading2, Heading3, HighlighterIcon
} from "lucide-react";

interface DocEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  filename: string;
  loading?: boolean;
  fileId?: string;
  onSave?: (html: string) => void;
}

const FONT_FAMILIES = [
  { value: "Arial", label: "Arial" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Georgia", label: "Georgia" },
  { value: "Verdana", label: "Verdana" },
  { value: "Courier New", label: "Courier New" },
  { value: "Trebuchet MS", label: "Trebuchet MS" },
  { value: "Tahoma", label: "Tahoma" },
  { value: "Calibri", label: "Calibri" },
  { value: "Garamond", label: "Garamond" },
];

const FONT_SIZES = [
  "8", "9", "10", "11", "12", "14", "16", "18", "20", "24", "28", "32", "36", "48", "72"
];

const COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#cccccc",
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1", "#a855f7",
  "#1e3a5f", "#7c2d12", "#14532d", "#713f12", "#4c1d95",
];

const HIGHLIGHT_COLORS = [
  "transparent", "#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8",
  "#fed7aa", "#e9d5ff", "#fecaca", "#d1fae5", "#dbeafe",
];

function ToolbarButton({ 
  icon: Icon, 
  label, 
  onClick, 
  active = false,
  disabled = false 
}: { 
  icon: any; 
  label: string; 
  onClick: () => void; 
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onClick(); }}
            disabled={disabled}
            className={`p-1.5 rounded transition-colors ${
              active 
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" 
                : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
            data-testid={`button-doc-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <Icon className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function DocEditor({ open, onOpenChange, html, filename, loading, fileId, onSave }: DocEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [fontSize, setFontSize] = useState("12");
  const [fontFamily, setFontFamily] = useState("Arial");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && html && editorRef.current) {
      editorRef.current.innerHTML = html;
      setTimeout(() => {
        if (!editorRef.current) return;
        const redFields = editorRef.current.querySelectorAll('[data-red-field="true"]');
        redFields.forEach((el) => {
          const htmlEl = el as HTMLElement;
          htmlEl.contentEditable = "true";
          htmlEl.style.color = "#DC2626";
          htmlEl.style.backgroundColor = "#FEF2F2";
          htmlEl.style.border = "1px dashed #F87171";
          htmlEl.style.borderRadius = "3px";
          htmlEl.style.padding = "1px 4px";
          htmlEl.style.minWidth = "40px";
          htmlEl.style.display = "inline-block";
          htmlEl.style.outline = "none";
          htmlEl.style.cursor = "text";
          htmlEl.addEventListener("focus", () => {
            htmlEl.style.backgroundColor = "#FEE2E2";
            htmlEl.style.border = "2px solid #EF4444";
            htmlEl.style.boxShadow = "0 0 0 2px rgba(239,68,68,0.2)";
          });
          htmlEl.addEventListener("blur", () => {
            htmlEl.style.backgroundColor = "#FEF2F2";
            htmlEl.style.border = "1px dashed #F87171";
            htmlEl.style.boxShadow = "none";
          });
        });
      }, 100);
    }
  }, [open, html]);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateActiveFormats();
  }, []);

  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    if (document.queryCommandState("bold")) formats.add("bold");
    if (document.queryCommandState("italic")) formats.add("italic");
    if (document.queryCommandState("underline")) formats.add("underline");
    if (document.queryCommandState("strikeThrough")) formats.add("strikeThrough");
    if (document.queryCommandState("justifyLeft")) formats.add("justifyLeft");
    if (document.queryCommandState("justifyCenter")) formats.add("justifyCenter");
    if (document.queryCommandState("justifyRight")) formats.add("justifyRight");
    if (document.queryCommandState("justifyFull")) formats.add("justifyFull");
    if (document.queryCommandState("insertUnorderedList")) formats.add("insertUnorderedList");
    if (document.queryCommandState("insertOrderedList")) formats.add("insertOrderedList");
    if (document.queryCommandState("subscript")) formats.add("subscript");
    if (document.queryCommandState("superscript")) formats.add("superscript");
    setActiveFormats(formats);

    const currentSize = document.queryCommandValue("fontSize");
    if (currentSize) {
      const sizeMap: Record<string, string> = { "1": "8", "2": "10", "3": "12", "4": "14", "5": "18", "6": "24", "7": "36" };
      setFontSize(sizeMap[currentSize] || "12");
    }
    const currentFont = document.queryCommandValue("fontName")?.replace(/['"]/g, "");
    if (currentFont) setFontFamily(currentFont);
  }, []);

  const handleFontSizeChange = useCallback((size: string) => {
    setFontSize(size);
    const sizeMap: Record<string, string> = { "8": "1", "9": "1", "10": "2", "11": "3", "12": "3", "14": "4", "16": "5", "18": "5", "20": "5", "24": "6", "28": "6", "32": "7", "36": "7", "48": "7", "72": "7" };
    execCommand("fontSize", sizeMap[size] || "3");

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const fontEl = container.nodeType === 3 ? container.parentElement : container as HTMLElement;
      if (fontEl && fontEl.tagName === "FONT") {
        fontEl.removeAttribute("size");
        fontEl.style.fontSize = size + "pt";
      }
    }
  }, [execCommand]);

  const handleFontFamilyChange = useCallback((font: string) => {
    setFontFamily(font);
    execCommand("fontName", font);
  }, [execCommand]);

  const handleTextColor = useCallback((color: string) => {
    execCommand("foreColor", color);
    setShowColorPicker(false);
  }, [execCommand]);

  const handleHighlight = useCallback((color: string) => {
    if (color === "transparent") {
      execCommand("removeFormat");
    } else {
      execCommand("hiliteColor", color);
    }
    setShowHighlightPicker(false);
  }, [execCommand]);

  const insertLink = useCallback(() => {
    const url = prompt("Enter URL:");
    if (url) execCommand("createLink", url);
  }, [execCommand]);

  const insertTable = useCallback(() => {
    const rows = prompt("Number of rows:", "3");
    const cols = prompt("Number of columns:", "3");
    if (rows && cols) {
      const r = parseInt(rows), c = parseInt(cols);
      if (r > 0 && c > 0) {
        let tableHtml = '<table style="border-collapse:collapse;width:100%;margin:8px 0"><tbody>';
        for (let i = 0; i < r; i++) {
          tableHtml += "<tr>";
          for (let j = 0; j < c; j++) {
            tableHtml += '<td style="border:1px solid #ccc;padding:6px 10px;min-width:60px">&nbsp;</td>';
          }
          tableHtml += "</tr>";
        }
        tableHtml += "</tbody></table>";
        execCommand("insertHTML", tableHtml);
      }
    }
  }, [execCommand]);

  const handlePrint = useCallback(() => {
    if (!editorRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>${filename}</title>
      <style>
        @page { margin: 1in; size: letter; }
        body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6; color: #000; margin: 0; padding: 0; }
        p { margin: 0.4em 0; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #999; padding: 6px 10px; }
        h1 { font-size: 20pt; margin: 0.6em 0 0.3em; }
        h2 { font-size: 16pt; margin: 0.5em 0 0.3em; }
        h3 { font-size: 13pt; margin: 0.4em 0 0.2em; }
        ul, ol { margin: 0.4em 0; padding-left: 2em; }
        img { max-width: 100%; }
        [data-red-field] { color: #000 !important; background: none !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>${editorRef.current.innerHTML}</body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  }, [filename]);

  const handleDownloadHtml = useCallback(() => {
    if (!editorRef.current) return;
    const content = `<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>${filename}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 8.5in; margin: 0 auto; padding: 1in; font-size: 12pt; line-height: 1.6; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #ccc; padding: 6px 10px; }
      </style>
    </head><body>${editorRef.current.innerHTML}</body></html>`;
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.replace(/\.(docx?|pdf)$/i, "") + ".html";
    a.click();
    URL.revokeObjectURL(url);
  }, [filename]);

  const handleSave = useCallback(async () => {
    if (!editorRef.current || !onSave) return;
    setIsSaving(true);
    try {
      onSave(editorRef.current.innerHTML);
      toast({ title: "Saved", description: "Document changes saved successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [onSave, toast]);

  const handleFormatBlock = useCallback((tag: string) => {
    execCommand("formatBlock", tag);
  }, [execCommand]);

  const clearFormatting = useCallback(() => {
    execCommand("removeFormat");
  }, [execCommand]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "b": e.preventDefault(); execCommand("bold"); break;
        case "i": e.preventDefault(); execCommand("italic"); break;
        case "u": e.preventDefault(); execCommand("underline"); break;
        case "z": e.preventDefault(); execCommand("undo"); break;
        case "y": e.preventDefault(); execCommand("redo"); break;
        case "s": e.preventDefault(); if (onSave) handleSave(); break;
      }
    }
  }, [execCommand, onSave, handleSave]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] w-[95vw] max-h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-blue-600" />
            {filename}
          </DialogTitle>
        </DialogHeader>

        <div className="border-y bg-gray-50 dark:bg-gray-900 px-2 py-1">
          <div className="flex items-center gap-1 flex-wrap">
            <ToolbarButton icon={Undo2} label="Undo" onClick={() => execCommand("undo")} />
            <ToolbarButton icon={Redo2} label="Redo" onClick={() => execCommand("redo")} />

            <Separator orientation="vertical" className="h-6 mx-1" />

            <Select value={fontFamily} onValueChange={handleFontFamilyChange}>
              <SelectTrigger className="h-7 w-[130px] text-xs" data-testid="select-font-family">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map(f => (
                  <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={fontSize} onValueChange={handleFontSizeChange}>
              <SelectTrigger className="h-7 w-[60px] text-xs" data-testid="select-font-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_SIZES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <ToolbarButton icon={Bold} label="Bold" onClick={() => execCommand("bold")} active={activeFormats.has("bold")} />
            <ToolbarButton icon={Italic} label="Italic" onClick={() => execCommand("italic")} active={activeFormats.has("italic")} />
            <ToolbarButton icon={Underline} label="Underline" onClick={() => execCommand("underline")} active={activeFormats.has("underline")} />
            <ToolbarButton icon={Strikethrough} label="Strikethrough" onClick={() => execCommand("strikeThrough")} active={activeFormats.has("strikeThrough")} />
            <ToolbarButton icon={Subscript} label="Subscript" onClick={() => execCommand("subscript")} active={activeFormats.has("subscript")} />
            <ToolbarButton icon={Superscript} label="Superscript" onClick={() => execCommand("superscript")} active={activeFormats.has("superscript")} />

            <Separator orientation="vertical" className="h-6 mx-1" />

            <div className="relative">
              <ToolbarButton icon={Palette} label="Text Color" onClick={() => { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false); }} />
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1" data-testid="color-picker">
                  {COLORS.map(c => (
                    <button key={c} type="button" className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform" style={{ backgroundColor: c }}
                      onMouseDown={(e) => { e.preventDefault(); handleTextColor(c); }} data-testid={`color-${c}`} />
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <ToolbarButton icon={HighlighterIcon} label="Highlight" onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); }} />
              {showHighlightPicker && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1" data-testid="highlight-picker">
                  {HIGHLIGHT_COLORS.map(c => (
                    <button key={c} type="button" className={`w-6 h-6 rounded border hover:scale-110 transition-transform ${c === "transparent" ? "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" : "border-gray-200 dark:border-gray-600"}`}
                      style={c !== "transparent" ? { backgroundColor: c } : undefined}
                      onMouseDown={(e) => { e.preventDefault(); handleHighlight(c); }} data-testid={`highlight-${c}`}>
                      {c === "transparent" && <span className="text-xs text-gray-500">✕</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <ToolbarButton icon={AlignLeft} label="Align Left" onClick={() => execCommand("justifyLeft")} active={activeFormats.has("justifyLeft")} />
            <ToolbarButton icon={AlignCenter} label="Align Center" onClick={() => execCommand("justifyCenter")} active={activeFormats.has("justifyCenter")} />
            <ToolbarButton icon={AlignRight} label="Align Right" onClick={() => execCommand("justifyRight")} active={activeFormats.has("justifyRight")} />
            <ToolbarButton icon={AlignJustify} label="Justify" onClick={() => execCommand("justifyFull")} active={activeFormats.has("justifyFull")} />

            <Separator orientation="vertical" className="h-6 mx-1" />

            <ToolbarButton icon={List} label="Bullet List" onClick={() => execCommand("insertUnorderedList")} active={activeFormats.has("insertUnorderedList")} />
            <ToolbarButton icon={ListOrdered} label="Numbered List" onClick={() => execCommand("insertOrderedList")} active={activeFormats.has("insertOrderedList")} />
            <ToolbarButton icon={Indent} label="Indent" onClick={() => execCommand("indent")} />
            <ToolbarButton icon={Outdent} label="Outdent" onClick={() => execCommand("outdent")} />

            <Separator orientation="vertical" className="h-6 mx-1" />

            <ToolbarButton icon={Heading1} label="Heading 1" onClick={() => handleFormatBlock("h1")} />
            <ToolbarButton icon={Heading2} label="Heading 2" onClick={() => handleFormatBlock("h2")} />
            <ToolbarButton icon={Heading3} label="Heading 3" onClick={() => handleFormatBlock("h3")} />
            <ToolbarButton icon={Pilcrow} label="Paragraph" onClick={() => handleFormatBlock("p")} />
          </div>

          <div className="flex items-center gap-1 mt-1 flex-wrap">
            <ToolbarButton icon={Link2} label="Insert Link" onClick={insertLink} />
            <ToolbarButton icon={Unlink2} label="Remove Link" onClick={() => execCommand("unlink")} />
            <ToolbarButton icon={Table} label="Insert Table" onClick={insertTable} />
            <ToolbarButton icon={Minus} label="Horizontal Rule" onClick={() => execCommand("insertHorizontalRule")} />
            <ToolbarButton icon={RemoveFormatting} label="Clear Formatting" onClick={clearFormatting} />

            <div className="flex-1" />

            {onSave && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={isSaving} data-testid="button-save-doc">
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handlePrint} data-testid="button-print-doc">
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleDownloadHtml} data-testid="button-download-doc">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-200 dark:bg-gray-800 p-4 min-h-0" onClick={() => { setShowColorPicker(false); setShowHighlightPicker(false); }}>
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-950 shadow-lg mx-auto" style={{ maxWidth: "8.5in", minHeight: "11in", padding: "1in" }}>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="outline-none min-h-[9in] doc-editor-content"
                style={{ fontFamily: "Arial, sans-serif", fontSize: "12pt", lineHeight: "1.6", color: "#000" }}
                onSelect={updateActiveFormats}
                onKeyUp={updateActiveFormats}
                onMouseUp={updateActiveFormats}
                onKeyDown={handleKeyDown}
                data-testid="doc-editor-content"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
