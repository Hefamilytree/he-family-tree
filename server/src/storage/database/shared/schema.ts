import { pgTable, serial, timestamp, uuid, varchar, integer, text, index, foreignKey, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const kinContacts = pgTable("kin_contacts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 64 }).notNull(),
	phone: varchar({ length: 32 }),
	residence: varchar({ length: 255 }),
	generation: integer(),
	generationTitle: varchar("generation_title", { length: 32 }),
	bio: text(),
	source: varchar({ length: 16 }).default('manual').notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const familyApplications = pgTable("family_applications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	familyId: varchar("family_id", { length: 36 }),
	applicantId: varchar("applicant_id", { length: 36 }),
	name: varchar({ length: 64 }).notNull(),
	generation: varchar({ length: 64 }),
	generationTitle: varchar("generation_title", { length: 32 }),
	phone: varchar({ length: 32 }),
	residence: varchar({ length: 255 }),
	message: text(),
	status: varchar({ length: 16 }).default('pending').notNull(),
	reviewedBy: varchar("reviewed_by", { length: 36 }),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const families = pgTable("families", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	surname: varchar({ length: 50 }).notNull(),
	familyName: varchar("family_name", { length: 100 }).notNull(),
	hallName: varchar("hall_name", { length: 100 }),
	motto: text(),
	description: text(),
	origin: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("families_surname_idx").using("btree", table.surname.asc().nullsLast().op("text_ops")),
]);

export const members = pgTable("members", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	familyId: varchar("family_id", { length: 36 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	courtesyName: varchar("courtesy_name", { length: 100 }), // 字（表字）
	gender: varchar({ length: 10 }).default('male').notNull(),
	birthDate: varchar("birth_date", { length: 20 }),
	birthTime: varchar("birth_time", { length: 20 }), // 出生时辰
	deathDate: varchar("death_date", { length: 20 }),
	phone: varchar({ length: 32 }), // 联系方式
	parentId: varchar("parent_id", { length: 36 }),
	spouseName: varchar("spouse_name", { length: 100 }),
	generation: integer().default(1).notNull(),
	bio: text(),
	avatarUrl: text("avatar_url"),
	isAlive: varchar("is_alive", { length: 10 }).default('yes').notNull(),
	birthPlace: varchar("birth_place", { length: 200 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	burialPlace: varchar("burial_place", { length: 200 }).default('葬地不详'),
	generationTitle: varchar("generation_title", { length: 100 }),
}, (table) => [
	index("members_family_id_idx").using("btree", table.familyId.asc().nullsLast().op("text_ops")),
	index("members_generation_idx").using("btree", table.generation.asc().nullsLast().op("int4_ops")),
	index("members_parent_id_idx").using("btree", table.parentId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.familyId],
			foreignColumns: [families.id],
			name: "members_family_id_fkey"
		}).onDelete("cascade"),
]);

export const harmonyActivities = pgTable("harmony_activities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	familyId: varchar("family_id", { length: 36 }).notNull(),
	category: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 200 }).notNull(),
	content: text(),
	eventDate: varchar("event_date", { length: 50 }),
	location: varchar({ length: 200 }),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	birthdayPerson: varchar("birthday_person", { length: 100 }),
}, (table) => [
	index("harmony_activities_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("harmony_activities_family_id_idx").using("btree", table.familyId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.familyId],
			foreignColumns: [families.id],
			name: "harmony_activities_family_id_fkey"
		}).onDelete("cascade"),
]);

export const culturalHeritage = pgTable("cultural_heritage", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	familyId: varchar("family_id", { length: 36 }).notNull(),
	category: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 200 }).notNull(),
	content: text(),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("cultural_heritage_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("cultural_heritage_family_id_idx").using("btree", table.familyId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.familyId],
			foreignColumns: [families.id],
			name: "cultural_heritage_family_id_fkey"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	username: varchar({ length: 100 }).notNull(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	role: varchar({ length: 20 }).default('member').notNull(),
	familyId: varchar("family_id", { length: 36 }),
	nickname: varchar({ length: 100 }),
	avatarUrl: text("avatar_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	openid: varchar({ length: 128 }),
	memberId: uuid("member_id"),
	phone: varchar({ length: 32 }),
	residence: varchar({ length: 255 }),
}, (table) => [
	index("users_family_id_idx").using("btree", table.familyId.asc().nullsLast().op("text_ops")),
	index("users_username_idx").using("btree", table.username.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.familyId],
			foreignColumns: [families.id],
			name: "users_family_id_fkey"
		}).onDelete("set null"),
	unique("users_username_key").on(table.username),
]);

export const spouses = pgTable("spouses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	memberId: varchar("member_id", { length: 36 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	status: varchar({ length: 20 }).default('alive').notNull(),
	birthDate: varchar("birth_date", { length: 20 }),
	deathDate: varchar("death_date", { length: 20 }),
	phone: varchar({ length: 32 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	bio: text(),
	burialPlace: varchar("burial_place", { length: 255 }),
}, (table) => [
	index("spouses_member_id_idx").using("btree", table.memberId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.memberId],
			foreignColumns: [members.id],
			name: "spouses_member_id_fkey"
		}).onDelete("cascade"),
]);

export const comments = pgTable("comments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	targetType: varchar("target_type", { length: 50 }).notNull(),
	targetId: varchar("target_id", { length: 36 }).notNull(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("comments_target_idx").using("btree", table.targetType.asc().nullsLast().op("text_ops"), table.targetId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "comments_user_id_fkey"
		}).onDelete("cascade"),
]);

export const registrations = pgTable("registrations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	activityId: varchar("activity_id", { length: 36 }).notNull(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	memberName: varchar("member_name", { length: 100 }),
	phone: varchar({ length: 50 }),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("registrations_activity_id_idx").using("btree", table.activityId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.activityId],
			foreignColumns: [harmonyActivities.id],
			name: "registrations_activity_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "registrations_user_id_fkey"
		}).onDelete("cascade"),
	unique("registrations_activity_id_user_id_key").on(table.activityId, table.userId),
]);

export const economicDevelopment = pgTable("economic_development", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	familyId: varchar("family_id", { length: 36 }).notNull(),
	category: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 200 }).notNull(),
	content: text(),
	contactName: varchar("contact_name", { length: 100 }),
	contactPhone: varchar("contact_phone", { length: 50 }),
	memberId: varchar("member_id", { length: 36 }),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	address: varchar({ length: 200 }),
	note: text(),
	imageUrl: text("image_url"),
}, (table) => [
	index("economic_development_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("economic_development_family_id_idx").using("btree", table.familyId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.familyId],
			foreignColumns: [families.id],
			name: "economic_development_family_id_fkey"
		}).onDelete("cascade"),
]);
