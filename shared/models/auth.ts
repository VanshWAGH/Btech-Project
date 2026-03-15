import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, text, boolean, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Session storage table.
export const sessions = pgTable(
  "session",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire", { mode: "date" }).notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table - matches actual DB schema (integer PK from legacy schema).
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  password: text("password").notNull(),
  username: text("username").default(""),
  name: text("name").default(""),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  role: text("role").default("STUDENT"), // STUDENT, TEACHER, UNIVERSITY_ADMIN, ADMIN
  department: text("department"),
  academicYear: text("academic_year"),
  semester: text("semester"),
  clearanceLevel: text("clearance_level").default("LEVEL_1"), // LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_MAX
  bio: text("bio"),
  location: text("location"),
  skills: text("skills").array(),
  interests: text("interests").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
