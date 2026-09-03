import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, integer, text, serial, index } from "drizzle-orm/pg-core";

export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 家族信息表
export const families = pgTable(
  "families",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    surname: varchar("surname", { length: 50 }).notNull(),
    family_name: varchar("family_name", { length: 100 }).notNull(),
    hall_name: varchar("hall_name", { length: 100 }),
    motto: text("motto"),
    description: text("description"),
    origin: text("origin"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("families_surname_idx").on(table.surname),
  ]
);

// 家族成员表
export const members = pgTable(
  "members",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    family_id: varchar("family_id", { length: 36 }).notNull().references(() => families.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    gender: varchar("gender", { length: 10 }).notNull().default("male"),
    birth_date: varchar("birth_date", { length: 20 }),
    death_date: varchar("death_date", { length: 20 }),
    parent_id: varchar("parent_id", { length: 36 }),
    spouse_name: varchar("spouse_name", { length: 100 }),
    generation: integer("generation").notNull().default(1),
    bio: text("bio"),
    avatar_url: text("avatar_url"),
    is_alive: varchar("is_alive", { length: 10 }).notNull().default("yes"),
    birth_place: varchar("birth_place", { length: 200 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("members_family_id_idx").on(table.family_id),
    index("members_parent_id_idx").on(table.parent_id),
    index("members_generation_idx").on(table.generation),
  ]
);
