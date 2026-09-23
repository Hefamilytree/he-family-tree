import { relations } from "drizzle-orm/relations";
import { families, members, harmonyActivities, culturalHeritage, users, spouses, comments, registrations, economicDevelopment } from "./schema";

export const membersRelations = relations(members, ({one, many}) => ({
	family: one(families, {
		fields: [members.familyId],
		references: [families.id]
	}),
	spouses: many(spouses),
}));

export const familiesRelations = relations(families, ({many}) => ({
	members: many(members),
	harmonyActivities: many(harmonyActivities),
	culturalHeritages: many(culturalHeritage),
	users: many(users),
	economicDevelopments: many(economicDevelopment),
}));

export const harmonyActivitiesRelations = relations(harmonyActivities, ({one, many}) => ({
	family: one(families, {
		fields: [harmonyActivities.familyId],
		references: [families.id]
	}),
	registrations: many(registrations),
}));

export const culturalHeritageRelations = relations(culturalHeritage, ({one}) => ({
	family: one(families, {
		fields: [culturalHeritage.familyId],
		references: [families.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	family: one(families, {
		fields: [users.familyId],
		references: [families.id]
	}),
	comments: many(comments),
	registrations: many(registrations),
}));

export const spousesRelations = relations(spouses, ({one}) => ({
	member: one(members, {
		fields: [spouses.memberId],
		references: [members.id]
	}),
}));

export const commentsRelations = relations(comments, ({one}) => ({
	user: one(users, {
		fields: [comments.userId],
		references: [users.id]
	}),
}));

export const registrationsRelations = relations(registrations, ({one}) => ({
	harmonyActivity: one(harmonyActivities, {
		fields: [registrations.activityId],
		references: [harmonyActivities.id]
	}),
	user: one(users, {
		fields: [registrations.userId],
		references: [users.id]
	}),
}));

export const economicDevelopmentRelations = relations(economicDevelopment, ({one}) => ({
	family: one(families, {
		fields: [economicDevelopment.familyId],
		references: [families.id]
	}),
}));