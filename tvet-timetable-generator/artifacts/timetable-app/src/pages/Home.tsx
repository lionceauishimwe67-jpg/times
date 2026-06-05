import React, { useState } from "react";
import { Link } from "wouter";
import { Printer, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  useListClasses, getListClassesQueryKey, 
  useListTeachers, getListTeachersQueryKey,
  useGetClassTimetable, getGetClassTimetableQueryKey,
  useGetTeacherTimetable, getGetTeacherTimetableQueryKey
} from "@workspace/api-client-react";
import TimetableGridDisplay from "../components/TimetableGridDisplay";

export default function Home() {
  const [viewType, setViewType] = useState<"class" | "teacher">("class");
  const [selectedId, setSelectedId] = useState<string>("");

  const { data: classes = [], isLoading: isLoadingClasses } = useListClasses({ query: { queryKey: getListClassesQueryKey() } });
  const { data: teachers = [], isLoading: isLoadingTeachers } = useListTeachers({ query: { queryKey: getListTeachersQueryKey() } });

  const numId = parseInt(selectedId);
  const classTimetableQuery = useGetClassTimetable(numId, { 
    query: { enabled: viewType === "class" && !isNaN(numId), queryKey: getGetClassTimetableQueryKey(numId) } 
  });
  const teacherTimetableQuery = useGetTeacherTimetable(numId, { 
    query: { enabled: viewType === "teacher" && !isNaN(numId), queryKey: getGetTeacherTimetableQueryKey(numId) } 
  });

  const isLoading = classTimetableQuery.isLoading || teacherTimetableQuery.isLoading;
  const timetableData = viewType === "class" ? classTimetableQuery.data : teacherTimetableQuery.data;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-muted/10">
      <header className="bg-primary text-primary-foreground py-4 px-6 shadow-md no-print flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">TVET Timetable Generator</h1>
          <p className="text-primary-foreground/80 text-sm">Rwanda Vocational Training Command Center</p>
        </div>
        <Link href="/admin" className="inline-flex items-center gap-2 bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground px-4 py-2 rounded-md transition-colors text-sm font-medium">
          <Settings className="w-4 h-4" /> Admin Panel
        </Link>
      </header>

      <main className="max-w-[1400px] mx-auto p-6 space-y-6">
        <div className="bg-card p-4 rounded-lg shadow-sm border flex flex-wrap gap-4 items-end no-print">
          <div className="space-y-2 flex-1 min-w-[200px]">
            <label className="text-sm font-medium">View Type</label>
            <Select value={viewType} onValueChange={(val: any) => { setViewType(val); setSelectedId(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select view type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="class">Class Timetable</SelectItem>
                <SelectItem value="teacher">Teacher Timetable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 flex-1 min-w-[300px]">
            <label className="text-sm font-medium">{viewType === "class" ? "Select Class" : "Select Teacher"}</label>
            <Select value={selectedId} onValueChange={setSelectedId} disabled={viewType === "class" ? isLoadingClasses : isLoadingTeachers}>
              <SelectTrigger>
                <SelectValue placeholder={viewType === "class" ? "Choose a class..." : "Choose a teacher..."} />
              </SelectTrigger>
              <SelectContent>
                {viewType === "class" ? (
                  classes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name} ({c.trade} L{c.level})</SelectItem>)
                ) : (
                  teachers.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name} ({t.code})</SelectItem>)
                )}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handlePrint} disabled={!timetableData} className="gap-2">
            <Printer className="w-4 h-4" /> Print Timetable
          </Button>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm border print-only-container">
          {isLoading ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">Loading timetable...</div>
          ) : timetableData ? (
            <div className="space-y-6">
              <div className="text-center pb-4 border-b">
                <h2 className="text-2xl font-bold">
                  {viewType === "class" ? (timetableData as any).className : (timetableData as any).teacherName} Timetable
                </h2>
                <p className="text-muted-foreground mt-1">
                  {viewType === "class" ? (timetableData as any).trade : `Teacher Code: ${(timetableData as any).teacherCode}`}
                </p>
              </div>
              <TimetableGridDisplay cells={timetableData.cells} isTeacher={viewType === "teacher"} />
            </div>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
              <p className="text-lg">No timetable selected</p>
              <p className="text-sm mt-2">Choose a class or teacher to view their weekly schedule</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
