import { pgTable, serial, integer, text, uniqueIndex } from "drizzle-orm/pg-core";
import { classesTable } from "./classes";
import { modulesTable } from "./modules";
import { teachersTable } from "./teachers";

export const timetableEntriesTable = pgTable(
  "timetable_entries",
  {
    id: serial("id").primaryKey(),
    classId: integer("class_id")
      .notNull()
      .references(() => classesTable.id, { onDelete: "cascade" }),
    day: integer("day").notNull(),
    period: integer("period").notNull(),
    moduleId: integer("module_id").references(() => modulesTable.id, { onDelete: "set null" }),
    teacherId: integer("teacher_id").references(() => teachersTable.id, { onDelete: "set null" }),
    entryType: text("entry_type").notNull().default("module"),
  },
  (table) => [
    uniqueIndex("class_day_period_unique").on(table.classId, table.day, table.period),
  ]
);

export type TimetableEntry = typeof timetableEntriesTable.$inferSelect;
