import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, boolean, index, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

// Export auth and chat models
export * from "./models/auth";
export * from "./models/chat";

// ============================================
// MULTI-TENANT RAG SYSTEM TABLES
// ============================================

// Tenants - Organizations using the system
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain"),
  type: text("type").notNull().default("demo"), // academic | enterprise | research | demo
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tenant members - Users belonging to tenants with roles
export const tenantMembers = pgTable("tenant_members", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // SUPER_ADMIN, TENANT_ADMIN, MANAGER, USER, VIEWER
  department: text("department"),
  permissions: text("permissions").array(),
  accessLevel: text("access_level"), // low | medium | high, etc.
  organizationType: text("organization_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("tenant_members_tenant_idx").on(table.tenantId),
  index("tenant_members_user_idx").on(table.userId),
]);

// Documents - Files uploaded to the system
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category"),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  status: text("status").default("APPROVED"), // PENDING, APPROVED, REJECTED
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("documents_tenant_idx").on(table.tenantId),
]);

// Queries - User queries with context
export const queries = pgTable("queries", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  query: text("query").notNull(),
  response: text("response"),
  context: text("context"),
  relevantDocs: text("relevant_docs").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("queries_tenant_idx").on(table.tenantId),
  index("queries_user_idx").on(table.userId),
]);

// Announcements - System or tenant level broadcasts
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  department: text("department"), // if specific to a dept
  targetRole: text("target_role"), // e.g. STUDENT, TEACHER or ALL
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("announcements_tenant_idx").on(table.tenantId),
]);

// Audit Logs - Security and operations logging
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("audit_logs_tenant_idx").on(table.tenantId),
]);

// ============================================
// COURSES
// ============================================

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  courseId: varchar("course_id", { length: 50 }).notNull(),
  courseName: text("course_name").notNull(),
  courseCode: varchar("course_code", { length: 30 }).notNull(),
  department: text("department").notNull(),
  semester: text("semester").notNull(),
  teacherId: integer("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("courses_tenant_idx").on(table.tenantId),
  index("courses_teacher_idx").on(table.teacherId),
]);

export const courseEnrollments = pgTable("course_enrollments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
}, (table) => [
  index("enrollments_course_idx").on(table.courseId),
  index("enrollments_student_idx").on(table.studentId),
]);

export const courseNotes = pgTable("course_notes", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url"),
  fileType: text("file_type"), // pdf, docx, ppt, video, image
  topic: text("topic"),
  tags: text("tags").array(),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
}, (table) => [
  index("notes_course_idx").on(table.courseId),
]);

export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  department: text("department").notNull(),
  eventDate: timestamp("event_date").notNull(),
  eventType: text("event_type").notNull(), // lecture | exam | assignment_deadline | holiday | seminar
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("calendar_tenant_idx").on(table.tenantId),
  index("calendar_dept_idx").on(table.department),
]);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // new_note | new_course | new_event | assignment_deadline
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedId: integer("related_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("notifications_user_idx").on(table.userId),
]);

// ============================================
// RELATIONS
// ============================================

export const tenantsRelations = relations(tenants, ({ many }) => ({
  members: many(tenantMembers),
  documents: many(documents),
  queries: many(queries),
}));

export const tenantMembersRelations = relations(tenantMembers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantMembers.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [tenantMembers.userId],
    references: [users.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  tenant: one(tenants, {
    fields: [documents.tenantId],
    references: [tenants.id],
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
}));

export const queriesRelations = relations(queries, ({ one }) => ({
  tenant: one(tenants, {
    fields: [queries.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [queries.userId],
    references: [users.id],
  }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  tenant: one(tenants, {
    fields: [announcements.tenantId],
    references: [tenants.id],
  }),
  creator: one(users, {
    fields: [announcements.createdBy],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLogs.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  tenant: one(tenants, { fields: [courses.tenantId], references: [tenants.id] }),
  teacher: one(users, { fields: [courses.teacherId], references: [users.id] }),
  enrollments: many(courseEnrollments),
  notes: many(courseNotes),
}));

export const courseEnrollmentsRelations = relations(courseEnrollments, ({ one }) => ({
  course: one(courses, { fields: [courseEnrollments.courseId], references: [courses.id] }),
  student: one(users, { fields: [courseEnrollments.studentId], references: [users.id] }),
}));

export const courseNotesRelations = relations(courseNotes, ({ one }) => ({
  course: one(courses, { fields: [courseNotes.courseId], references: [courses.id] }),
  uploader: one(users, { fields: [courseNotes.uploadedBy], references: [users.id] }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  tenant: one(tenants, { fields: [calendarEvents.tenantId], references: [tenants.id] }),
  creator: one(users, { fields: [calendarEvents.createdBy], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

// ============================================
// BASE SCHEMAS
// ============================================

export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true });
export const insertTenantMemberSchema = createInsertSchema(tenantMembers).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true }).extend({
  tenantId: z.coerce.number().optional(),
  uploadedBy: z.string().optional(),
});
export const insertQuerySchema = createInsertSchema(queries).omit({ id: true, createdAt: true });
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertCourseSchema = createInsertSchema(courses).omit({ id: true, createdAt: true }).extend({
  tenantId: z.coerce.number().optional(),
  teacherId: z.string().optional(),
});
export const insertCourseNoteSchema = createInsertSchema(courseNotes).omit({ id: true, uploadedAt: true }).extend({
  uploadedBy: z.string().optional(),
});
export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({ id: true, createdAt: true }).extend({
  tenantId: z.coerce.number().optional(),
  createdBy: z.string().optional(),
  eventDate: z.string().or(z.date()).transform(v => new Date(v)),
});
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

// ============================================
// EXPLICIT API CONTRACT TYPES
// ============================================

// Base types
export type Tenant = typeof tenants.$inferSelect;
export type TenantMember = typeof tenantMembers.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Query = typeof queries.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type CourseEnrollment = typeof courseEnrollments.$inferSelect;
export type CourseNote = typeof courseNotes.$inferSelect;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type Notification = typeof notifications.$inferSelect;

// Request types
export type CreateTenantRequest = z.infer<typeof insertTenantSchema>;
export type CreateTenantMemberRequest = z.infer<typeof insertTenantMemberSchema>;
export type CreateDocumentRequest = z.infer<typeof insertDocumentSchema>;
export type CreateQueryRequest = {
  query: string;
};

// Response types
export type TenantResponse = Tenant & { membersCount?: number };
export type TenantMemberResponse = TenantMember & { userName?: string };
export type DocumentResponse = Document & { uploaderName?: string };
export type QueryResponse = Query & { relevantDocuments?: DocumentResponse[] };

// Query processing response
export type ProcessedQueryResponse = {
  response: string;
  context: string;
  relevantDocs: string[];
  sources: DocumentResponse[];
};
