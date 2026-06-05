import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Upload,
  BookOpen,
  Users,
  GraduationCap,
  CalendarRange,
  ChevronRight,
  Home,
} from "lucide-react";

const navItems = [
  { href: "/admin/overview", icon: LayoutDashboard, label: "Overview" },
  { href: "/admin/upload", icon: Upload, label: "Upload Files" },
  { href: "/admin/classes", icon: GraduationCap, label: "Classes" },
  { href: "/admin/modules", icon: BookOpen, label: "Modules" },
  { href: "/admin/teachers", icon: Users, label: "Teachers" },
  { href: "/admin/generate", icon: CalendarRange, label: "Generate" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-primary-foreground py-3 px-6 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarRange className="w-6 h-6" />
          <div>
            <h1 className="text-xl font-bold leading-tight">TVET Timetable — Admin</h1>
            <p className="text-primary-foreground/70 text-xs">Rwanda Vocational Training Command Center</p>
          </div>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground text-sm transition-colors"
        >
          <Home className="w-4 h-4" /> Student View
        </Link>
      </header>

      <div className="flex flex-1">
        <aside className="w-56 bg-card border-r flex-shrink-0">
          <nav className="p-3 space-y-1">
            {navItems.map(({ href, icon: Icon, label }) => {
              const active = location === href || (href === "/admin/overview" && location === "/admin");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight className="w-3 h-3" />}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-6 overflow-auto bg-muted/10">{children}</main>
      </div>
    </div>
  );
}
