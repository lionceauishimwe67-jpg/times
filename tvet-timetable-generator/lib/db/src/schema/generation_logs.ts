import { pgTable, serial, boolean, integer, text, timestamp } from "drizzle-orm/pg-core";

export const generationLogsTable = pgTable("generation_logs", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  success: boolean("success").notNull(),
  classesProcessed: integer("classes_processed").notNull().default(0),
  entriesCreated: integer("entries_created").notNull().default(0),
  errors: text("errors").array().notNull().default([]),
  message: text("message"),
});

export type GenerationLog = typeof generationLogsTable.$inferSelect;
