import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGenerateTimetables, useDeleteAllTimetables, useListLogs, useGetStats,
  getListLogsQueryKey, getGetStatsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CalendarRange, Trash2, Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function GenerateTimetables() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [lastResult, setLastResult] = useState<any>(null);

  const { data: stats } = useGetStats();
  const { data: logs = [] } = useListLogs();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListLogsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
  };

  const generateMutation = useGenerateTimetables({
    mutation: {
      onSuccess: (data: any) => {
        invalidate();
        setLastResult(data);
        toast({
          title: data.success ? "Timetables generated" : "Generation completed with errors",
          description: data.message,
          variant: data.success ? "default" : "destructive",
        });
      },
      onError: () => toast({ title: "Generation failed", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteAllTimetables({
    mutation: {
      onSuccess: () => {
        invalidate();
        setLastResult(null);
        toast({ title: "All timetables cleared" });
      },
      onError: () => toast({ title: "Failed to clear timetables", variant: "destructive" }),
    },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold">Generate Timetables</h2>
        <p className="text-muted-foreground text-sm mt-1">Run the conflict-free scheduling algorithm across all classes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-primary" />
            Scheduling Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md bg-muted p-3">
              <p className="text-muted-foreground text-xs mb-1">Classes with timetables</p>
              <p className="text-xl font-bold text-primary">{stats?.classesWithTimetables ?? "—"}</p>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-muted-foreground text-xs mb-1">Total entries scheduled</p>
              <p className="text-xl font-bold text-primary">{stats?.totalEntries ?? "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
          <CardDescription>
            Generating will first delete all existing timetable entries, then run the scheduler. 
            All specific modules are scheduled in blocks (2–3 periods) before general modules.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || deleteMutation.isPending}
            className="gap-2"
          >
            {generateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : (
              <><CalendarRange className="w-4 h-4" /> Generate All Timetables</>
            )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={generateMutation.isPending || deleteMutation.isPending} className="gap-2">
                <Trash2 className="w-4 h-4" /> Clear All Timetables
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all timetables?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {stats?.totalEntries ?? 0} scheduled timetable entries across all classes. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive hover:bg-destructive/90">
                  {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Clear All"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {lastResult && (
        <Card className={lastResult.success ? "border-green-200 bg-green-50 dark:bg-green-950/20" : "border-red-200 bg-red-50 dark:bg-red-950/20"}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {lastResult.success ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
              Last Generation Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{lastResult.message}</p>
            <div className="flex gap-4 text-muted-foreground">
              <span>Classes: {lastResult.classesProcessed}</span>
              <span>Entries: {lastResult.entriesCreated}</span>
            </div>
            {lastResult.errors?.length > 0 && (
              <div className="space-y-1">
                <p className="font-medium text-amber-700">Warnings:</p>
                {lastResult.errors.map((e: string, i: number) => (
                  <p key={i} className="text-xs text-amber-700 font-mono bg-amber-100 dark:bg-amber-900/30 p-1 rounded">{e}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(logs as any[]).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generation History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(logs as any[]).slice(0, 10).map((log: any) => (
                <div key={log.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={log.success ? "default" : "destructive"}>{log.success ? "Success" : "Failed"}</Badge>
                    <span className="text-muted-foreground">{log.entriesCreated} entries — {log.classesProcessed} classes</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
