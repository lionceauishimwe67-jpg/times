import React from "react";
import { Link } from "wouter";
import { useGetStats, useListLogs } from "@workspace/api-client-react";
import { BookOpen, GraduationCap, Users, CalendarRange, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Overview() {
  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: logs = [] } = useListLogs();

  const statCards = [
    { label: "Classes", value: stats?.totalClasses ?? 0, icon: GraduationCap, href: "/admin/classes" },
    { label: "Modules", value: stats?.totalModules ?? 0, icon: BookOpen, href: "/admin/modules" },
    { label: "Teachers", value: stats?.totalTeachers ?? 0, icon: Users, href: "/admin/teachers" },
    { label: "Timetable Entries", value: stats?.totalEntries ?? 0, icon: CalendarRange, href: "/admin/generate" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold">Dashboard Overview</h2>
        <p className="text-muted-foreground text-sm mt-1">Manage your school's scheduling data</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {statsLoading ? "…" : value}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timetable Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm">{stats.classesWithTimetables} class(es) have generated timetables</span>
            </div>
            {stats.classesWithoutTimetables > 0 && (
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span className="text-sm">{stats.classesWithoutTimetables} class(es) still need timetables</span>
                <Link href="/admin/generate">
                  <Button size="sm" variant="outline">Generate Now</Button>
                </Link>
              </div>
            )}
            {stats.lastGeneratedAt && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Last generated: {new Date(stats.lastGeneratedAt).toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Generation Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logs.slice(0, 5).map((log: any) => (
                <div key={log.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={log.success ? "default" : "destructive"}>
                      {log.success ? "Success" : "Failed"}
                    </Badge>
                    <span className="text-muted-foreground">{log.message}</span>
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
