import { useState, useRef } from "react";
import { formatDate } from "@/lib/date-utils";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Search, Download, Image, File, FileSpreadsheet, FileIcon, Upload, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { File as FileType, Entity } from "@shared/schema";
import DocEditor from "@/components/doc-editor";
import PdfEditor from "@/components/pdf-editor";

function getFileDownloadUrl(fileId: string): string {
  const token = localStorage.getItem("adminToken");
  return `/api/admin/files/${fileId}/download${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

export default function AdminFiles() {
  const [searchQuery, setSearchQuery] = useState("");
  const [docViewerFile, setDocViewerFile] = useState<{ id: string; filename: string } | null>(null);
  const [docViewerHtml, setDocViewerHtml] = useState("");
  const [docViewerLoading, setDocViewerLoading] = useState(false);
  const [pdfEditorFile, setPdfEditorFile] = useState<{ url: string; filename: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: files, isLoading } = useQuery<FileType[]>({
    queryKey: ["/api/admin/files"],
  });

  const { data: entities } = useQuery<Entity[]>({
    queryKey: ["/api/admin/entities"],
  });

  const entityMap = entities?.reduce((acc, e) => {
    acc[e.id] = e.name;
    return acc;
  }, {} as Record<string, string>) || {};

  const filteredFiles = files?.filter((file) =>
    file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.ownerType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (file.ownerId && entityMap[file.ownerId]?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <FileIcon className="h-5 w-5" />;
    if (mimeType.startsWith("image/")) return <Image className="h-5 w-5 text-purple-600" />;
    if (mimeType.includes("pdf")) return <FileText className="h-5 w-5 text-red-600" />;
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    return <File className="h-5 w-5 text-blue-600" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getOwnerName = (file: FileType) => {
    if (file.ownerType === "entity" && file.ownerId && entityMap[file.ownerId]) {
      return entityMap[file.ownerId];
    }
    if (file.ownerId) return file.ownerId.slice(0, 8);
    return "N/A";
  };

  const handleDownload = (file: FileType) => {
    window.open(getFileDownloadUrl(file.id), '_blank');
  };

  const isWordFile = (file: FileType) => {
    return file.mimeType?.includes("word") || file.mimeType?.includes("document") ||
      file.filename.endsWith(".docx") || file.filename.endsWith(".doc");
  };

  const isPdfFile = (file: FileType) => {
    return file.mimeType?.includes("pdf") || file.filename.endsWith(".pdf");
  };

  const openDocViewer = async (fileId: string, filename: string) => {
    setDocViewerFile({ id: fileId, filename });
    setDocViewerHtml("");
    setDocViewerLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`/api/admin/files/${fileId}/html${token ? `?token=${encodeURIComponent(token)}` : ""}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load document");
      const data = await res.json();
      setDocViewerHtml(data.html);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not load document", variant: "destructive" });
      setDocViewerFile(null);
    } finally {
      setDocViewerLoading(false);
    }
  };

  const openFile = (file: FileType) => {
    if (isWordFile(file)) {
      openDocViewer(file.id, file.filename);
    } else if (isPdfFile(file)) {
      setPdfEditorFile({ url: getFileDownloadUrl(file.id), filename: file.filename });
    } else {
      handleDownload(file);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("ownerType", "general");
      formData.append("ownerId", "admin");
      const res = await fetch("/api/admin/files/upload", {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Upload failed");
      toast({ title: "Uploaded", description: `${file.name} uploaded successfully.` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/files"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">File Manager</h1>
          <p className="text-muted-foreground">Manage uploaded documents and files</p>
        </div>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
            data-testid="input-file-upload"
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} data-testid="button-upload-file">
            {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload File
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Files</CardTitle>
          <CardDescription>
            {files?.length || 0} files uploaded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredFiles && filteredFiles.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFiles.map((file) => (
                    <TableRow key={file.id} data-testid={`row-file-${file.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            {getFileIcon(file.mimeType)}
                          </div>
                          <div>
                            <p className="font-medium truncate max-w-[200px]" data-testid={`text-filename-${file.id}`}>{file.filename}</p>
                            <p className="text-xs text-muted-foreground">{file.mimeType || "Unknown"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {file.ownerType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" data-testid={`text-owner-${file.id}`}>
                        {getOwnerName(file)}
                      </TableCell>
                      <TableCell className="text-sm">{formatFileSize(file.size)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {file.createdAt ? formatDate(file.createdAt) : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {(isWordFile(file) || isPdfFile(file)) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openFile(file)}
                              data-testid={`button-open-${file.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(file)}
                            data-testid={`button-download-${file.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No files uploaded</p>
              <p className="text-sm">Files will appear here when uploaded.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <DocEditor
        open={!!docViewerFile}
        onOpenChange={(open) => { if (!open) setDocViewerFile(null); }}
        html={docViewerHtml}
        filename={docViewerFile?.filename || "Document"}
        loading={docViewerLoading}
        fileId={docViewerFile?.id}
      />

      <PdfEditor
        open={!!pdfEditorFile}
        onOpenChange={(open) => { if (!open) setPdfEditorFile(null); }}
        fileUrl={pdfEditorFile?.url || ""}
        filename={pdfEditorFile?.filename || ""}
      />
    </div>
  );
}
