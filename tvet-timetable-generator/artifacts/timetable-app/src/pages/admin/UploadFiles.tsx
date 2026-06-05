import React, { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUploadChronogram, useUploadTeachers, getListModulesQueryKey, getListTeachersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadResult {
  imported: number;
  skipped: number;
  errors: string[];
  message: string;
}

function UploadCard({
  title,
  description,
  templateHeaders,
  accept,
  onUpload,
  isPending,
}: {
  title: string;
  description: string;
  templateHeaders: string;
  accept: string;
  onUpload: (file: File) => void;
  isPending: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    onUpload(file);
    e.target.value = "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-muted p-3">
          <p className="text-xs font-mono text-muted-foreground">CSV headers: {templateHeaders}</p>
        </div>

        <div
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          {isPending ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="w-8 h-8" />
              <p className="text-sm font-medium">Click to upload {accept.toUpperCase()} file</p>
              <p className="text-xs">or drag and drop</p>
            </div>
          )}
          <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function UploadFiles() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const chronogramMutation = useUploadChronogram({
    mutation: {
      onSuccess: (data: any) => {
        queryClient.invalidateQueries({ queryKey: getListModulesQueryKey() });
        toast({
          title: "Chronogram uploaded",
          description: data.message,
        });
      },
      onError: () => toast({ title: "Upload failed", variant: "destructive" }),
    },
  });

  const teachersMutation = useUploadTeachers({
    mutation: {
      onSuccess: (data: any) => {
        queryClient.invalidateQueries({ queryKey: getListTeachersQueryKey() });
        toast({
          title: "Teachers uploaded",
          description: data.message,
        });
      },
      onError: () => toast({ title: "Upload failed", variant: "destructive" }),
    },
  });

  const handleChronogramUpload = (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    chronogramMutation.mutate({ data: formData as any });
  };

  const handleTeachersUpload = (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    teachersMutation.mutate({ data: formData as any });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold">Upload Files</h2>
        <p className="text-muted-foreground text-sm mt-1">Import modules via chronogram CSV or bulk-import teachers</p>
      </div>

      <UploadCard
        title="Chronogram (Modules)"
        description="Upload the official Rwanda TVET chronogram CSV to import all modules, periods, and trades at once."
        templateHeaders="module_code, module_name, weekly_periods, is_specific, trade"
        accept=".csv,.json"
        onUpload={handleChronogramUpload}
        isPending={chronogramMutation.isPending}
      />

      <UploadCard
        title="Teachers"
        description="Upload a CSV file mapping teachers to their module codes."
        templateHeaders="teacher_name, teacher_code, module_codes (comma-separated)"
        accept=".csv,.json"
        onUpload={handleTeachersUpload}
        isPending={teachersMutation.isPending}
      />

      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <p className="font-medium">Upsert behavior</p>
              <p className="mt-1">
                Uploading a file will insert new records and update existing ones (matched by code). 
                Existing timetables are not automatically regenerated — go to <strong>Generate</strong> after uploading.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
