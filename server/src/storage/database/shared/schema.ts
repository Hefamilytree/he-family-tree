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

// 文化传承内容表（家风家训、家族荣誉、功德贡献、迁徙轨迹、家族事记、人物事记）
export const cultural_heritage = pgTable(
  "cultural_heritage",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    family_id: varchar("family_id", { length: 36 }).notNull().references(() => families.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 50 }).notNull(), // family_motto, honor, merit, migration, family_history, person_history, afterword, editorial_note
    title: varchar("title", { length: 200 }).notNull(),
    content: text("content"),
    sort_order: integer("sort_order").default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("cultural_heritage_family_id_idx").on(table.family_id),
    index("cultural_heritage_category_idx").on(table.category),
  ]
);

// 和睦亲族活动表（活动组织、祭祖、成人礼、立贤、敬老、助学、纾困）
export const harmony_activities = pgTable(
  "harmony_activities",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    family_id: varchar("family_id", { length: 36 }).notNull().references(() => families.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 50 }).notNull(), // activity, ancestor_worship, coming_of_age, talent, elderly_care, education, relief
    title: varchar("title", { length: 200 }).notNull(),
    content: text("content"),
    event_date: varchar("event_date", { length: 50 }),
    location: varchar("location", { length: 200 }),
    sort_order: integer("sort_order").default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("harmony_activities_family_id_idx").on(table.family_id),
    index("harmony_activities_category_idx").on(table.category),
  ]
);

// 发展经济信息表（通讯录、附件宗亲、企业家圈、供需信息、产品展示）
export const economic_development = pgTable(
  "economic_development",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    family_id: varchar("family_id", { length: 36 }).notNull().references(() => families.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 50 }).notNull(), // contact, relative, entrepreneur, supply_demand, product
    title: varchar("title", { length: 200 }).notNull(),
    content: text("content"),
    contact_name: varchar("contact_name", { length: 100 }),
    contact_phone: varchar("contact_phone", { length: 50 }),
    member_id: varchar("member_id", { length: 36 }),
    sort_order: integer("sort_order").default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("economic_development_family_id_idx").on(table.family_id),
    index("economic_development_category_idx").on(table.category),
  ]
);
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
    generation_title: varchar("generation_title", { length: 100 }),
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

// 用户表
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    username: varchar("username", { length: 100 }).notNull().unique(),
    password_hash: varchar("password_hash", { length: 255 }).notNull(),
    role: varchar("role", { length: 20 }).notNull().default("member"),
    family_id: varchar("family_id", { length: 36 }).references(() => families.id, { onDelete: "set null" }),
    nickname: varchar("nickname", { length: 100 }),
    avatar_url: text("avatar_url"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("users_username_idx").on(table.username),
    index("users_family_id_idx").on(table.family_id),
  ]
);

// 评论表
export const comments = pgTable(
  "comments",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    target_type: varchar("target_type", { length: 50 }).notNull(),
    target_id: varchar("target_id", { length: 36 }).notNull(),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("comments_target_idx").on(table.target_type, table.target_id),
  ]
);

// 报名表
export const registrations = pgTable(
  "registrations",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    activity_id: varchar("activity_id", { length: 36 }).notNull().references(() => harmony_activities.id, { onDelete: "cascade" }),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    member_name: varchar("member_name", { length: 100 }),
    phone: varchar("phone", { length: 50 }),
    note: text("note"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("registrations_activity_id_idx").on(table.activity_id),
  ]
);

// 配偶表
export const spouses = pgTable(
  "spouses",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    member_id: varchar("member_id", { length: 36 }).notNull().references(() => members.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("alive"),
    birth_date: varchar("birth_date", { length: 20 }),
    death_date: varchar("death_date", { length: 20 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("spouses_member_id_idx").on(table.member_id),
  ]
);
