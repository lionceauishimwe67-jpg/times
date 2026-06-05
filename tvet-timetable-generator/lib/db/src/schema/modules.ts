import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const modulesTable = pgTable("modules", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  weeklyPeriods: integer("weekly_periods").notNull(),
  isSpecific: boolean("is_specific").notNull().default(false),
  trade: text("trade").notNull(),
});

export const insertModuleSchema = createInsertSchema(modulesTable).omit({ id: true });
export type InsertModule = z.infer<typeof insertModuleSchema>;
export type Module = typeof modulesTable.$inferSelect;
