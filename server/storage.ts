import {
  tenants,
  tenantMembers,
  documents,
  queries,
  users,
  announcements,
  auditLogs,
  courses,
  courseEnrollments,
  courseNotes,
  calendarEvents,
  notifications,
  type Tenant,
  type TenantMember,
  type Document,
  type Query,
  type Announcement,
  type AuditLog,
  type Course,
  type CourseEnrollment,
  type CourseNote,
  type CalendarEvent,
  type Notification,
  type CreateTenantRequest,
  type CreateTenantMemberRequest,
  type CreateDocumentRequest,
  type TenantResponse,
  type TenantMemberResponse,
  type DocumentResponse,
  type QueryResponse,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc, getTableColumns, asc } from "drizzle-orm";

export interface IStorage {
  getTenant(id: number): Promise<TenantResponse | undefined>;
  getAllTenants(): Promise<TenantResponse[]>;
  createTenant(data: CreateTenantRequest): Promise<Tenant>;

  getTenantMembers(tenantId: number): Promise<TenantMemberResponse[]>;
  getTenantMemberByUser(tenantId: number, userId: number): Promise<TenantMember | undefined>;
  addTenantMember(data: CreateTenantMemberRequest): Promise<TenantMember>;

  getDocuments(tenantId?: number, category?: string): Promise<DocumentResponse[]>;
  getDocument(id: number): Promise<DocumentResponse | undefined>;
  createDocument(data: CreateDocumentRequest): Promise<Document>;
  deleteDocument(id: number): Promise<void>;

  getQueries(tenantId?: number, userId?: number): Promise<QueryResponse[]>;
  createQuery(data: {
    tenantId: number;
    userId: number;
    query: string;
    response?: string;
    context?: string;
    relevantDocs?: string[];
  }): Promise<Query>;

  updateDocumentStatus(id: number, status: string): Promise<Document>;

  getAnnouncements(tenantId?: number, role?: string): Promise<Announcement[]>;
  createAnnouncement(data: any): Promise<Announcement>;

  createAuditLog(data: any): Promise<AuditLog>;

  // COURSES
  getCourses(tenantId?: number, department?: string, teacherId?: number): Promise<any[]>;
  getCourse(id: number): Promise<any | undefined>;
  createCourse(data: any): Promise<Course>;
  updateCourse(id: number, data: Partial<Course>): Promise<Course>;
  deleteCourse(id: number): Promise<void>;

  // ENROLLMENTS
  enrollStudent(courseId: number, studentId: number): Promise<CourseEnrollment>;
  unenrollStudent(courseId: number, studentId: number): Promise<void>;
  getEnrolledStudents(courseId: number): Promise<any[]>;
  getStudentEnrollments(studentId: number): Promise<any[]>;
  isEnrolled(courseId: number, studentId: number): Promise<boolean>;

  // COURSE NOTES
  getCourseNotes(courseId: number, topic?: string): Promise<any[]>;
  getCourseNote(id: number): Promise<CourseNote | undefined>;
  createCourseNote(data: any): Promise<CourseNote>;
  updateCourseNote(id: number, data: Partial<CourseNote>): Promise<CourseNote>;
  deleteCourseNote(id: number): Promise<void>;

  // CALENDAR EVENTS
  getCalendarEvents(tenantId?: number, department?: string): Promise<any[]>;
  createCalendarEvent(data: any): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, data: Partial<CalendarEvent>): Promise<CalendarEvent>;
  deleteCalendarEvent(id: number): Promise<void>;

  // NOTIFICATIONS
  getUserNotifications(userId: number): Promise<Notification[]>;
  createNotification(data: any): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;
  markAllNotificationsRead(userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // TENANTS
  async getTenant(id: number): Promise<TenantResponse | undefined> {
    const [tenant] = await db
      .select({
        ...getTableColumns(tenants),
        membersCount: sql<number>`count(${tenantMembers.id})::int`,
      })
      .from(tenants)
      .leftJoin(tenantMembers, eq(tenants.id, tenantMembers.tenantId))
      .where(eq(tenants.id, id))
      .groupBy(tenants.id);
    return tenant as TenantResponse | undefined;
  }

  async getAllTenants(): Promise<TenantResponse[]> {
    return db
      .select({
        ...getTableColumns(tenants),
        membersCount: sql<number>`count(${tenantMembers.id})::int`,
      })
      .from(tenants)
      .leftJoin(tenantMembers, eq(tenants.id, tenantMembers.tenantId))
      .groupBy(tenants.id)
      .orderBy(desc(tenants.createdAt)) as any;
  }

  async createTenant(data: CreateTenantRequest): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(data).returning();
    return tenant;
  }

  // TENANT MEMBERS
  async getTenantMembers(tenantId: number): Promise<TenantMemberResponse[]> {
    return db
      .select({
        ...getTableColumns(tenantMembers),
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      })
      .from(tenantMembers)
      .leftJoin(users, eq(tenantMembers.userId, users.id))
      .where(eq(tenantMembers.tenantId, tenantId)) as any;
  }

  async getTenantMemberByUser(
    tenantId: number,
    userId: number
  ): Promise<TenantMember | undefined> {
    const [member] = await db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.userId, userId)
        )
      );
    return member;
  }

  async addTenantMember(data: CreateTenantMemberRequest): Promise<TenantMember> {
    const [member] = await db.insert(tenantMembers).values(data).returning();
    return member;
  }

  // DOCUMENTS
  async getDocuments(
    tenantId?: number,
    category?: string
  ): Promise<DocumentResponse[]> {
    let query = db
      .select({
        ...getTableColumns(documents),
        uploaderName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      })
      .from(documents)
      .leftJoin(users, eq(documents.uploadedBy, users.id))
      .orderBy(desc(documents.createdAt));

    if (tenantId) {
      query = query.where(eq(documents.tenantId, tenantId)) as any;
    }
    if (category) {
      query = query.where(eq(documents.category, category)) as any;
    }

    return query as any;
  }

  async getDocument(id: number): Promise<DocumentResponse | undefined> {
    const [doc] = await db
      .select({
        ...getTableColumns(documents),
        uploaderName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      })
      .from(documents)
      .leftJoin(users, eq(documents.uploadedBy, users.id))
      .where(eq(documents.id, id));
    return doc as DocumentResponse | undefined;
  }

  async createDocument(data: any): Promise<Document> {
    const [doc] = await db.insert(documents).values(data).returning();
    return doc;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // QUERIES
  async getQueries(
    tenantId?: number,
    userId?: number
  ): Promise<QueryResponse[]> {
    let query = db
      .select()
      .from(queries)
      .orderBy(desc(queries.createdAt));

    if (tenantId) {
      query = query.where(eq(queries.tenantId, tenantId)) as any;
    }
    if (userId) {
      query = query.where(eq(queries.userId, userId)) as any;
    }

    return query;
  }

  async createQuery(data: {
    tenantId: number;
    userId: number;
    query: string;
    response?: string;
    context?: string;
    relevantDocs?: string[];
  }): Promise<Query> {
    const [query] = await db.insert(queries).values(data).returning();
    return query;
  }

  // STATUS UPDATES
  async updateDocumentStatus(id: number, status: string): Promise<Document> {
    const [doc] = await db
      .update(documents)
      .set({ status })
      .where(eq(documents.id, id))
      .returning();
    return doc;
  }

  // ANNOUNCEMENTS
  async getAnnouncements(tenantId?: number, role?: string): Promise<Announcement[]> {
    let query = db.select().from(announcements).orderBy(desc(announcements.createdAt));

    if (tenantId) {
      query = query.where(eq(announcements.tenantId, tenantId)) as any;
    }

    return query as any;
  }

  async createAnnouncement(data: any): Promise<Announcement> {
    const [announcement] = await db.insert(announcements).values(data).returning();
    return announcement;
  }

  // AUDIT LOGS
  async createAuditLog(data: any): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(data).returning();
    return log;
  }

  // ============================================
  // COURSES
  // ============================================
  async getCourses(tenantId?: number, department?: string, teacherId?: number): Promise<any[]> {
    let q = db
      .select({
        ...getTableColumns(courses),
        teacherName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        enrollmentCount: sql<number>`(SELECT COUNT(*) FROM course_enrollments WHERE course_id = courses.id)::int`,
      })
      .from(courses)
      .leftJoin(users, eq(courses.teacherId, users.id))
      .orderBy(desc(courses.createdAt));

    const conditions: any[] = [];
    if (tenantId) conditions.push(eq(courses.tenantId, tenantId));
    if (department) conditions.push(eq(courses.department, department));
    if (teacherId) conditions.push(eq(courses.teacherId, teacherId));

    if (conditions.length === 1) q = q.where(conditions[0]) as any;
    else if (conditions.length > 1) q = q.where(and(...conditions)) as any;

    return q as any;
  }

  async getCourse(id: number): Promise<any | undefined> {
    const [course] = await db
      .select({
        ...getTableColumns(courses),
        teacherName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        enrollmentCount: sql<number>`(SELECT COUNT(*) FROM course_enrollments WHERE course_id = courses.id)::int`,
      })
      .from(courses)
      .leftJoin(users, eq(courses.teacherId, users.id))
      .where(eq(courses.id, id));
    return course;
  }

  async createCourse(data: any): Promise<Course> {
    const [course] = await db.insert(courses).values(data).returning();
    return course;
  }

  async updateCourse(id: number, data: Partial<Course>): Promise<Course> {
    const [course] = await db.update(courses).set(data).where(eq(courses.id, id)).returning();
    return course;
  }

  async deleteCourse(id: number): Promise<void> {
    await db.delete(courses).where(eq(courses.id, id));
  }

  // ============================================
  // ENROLLMENTS
  // ============================================
  async enrollStudent(courseId: number, studentId: number): Promise<CourseEnrollment> {
    const [enrollment] = await db.insert(courseEnrollments).values({ courseId, studentId }).returning();
    return enrollment;
  }

  async unenrollStudent(courseId: number, studentId: number): Promise<void> {
    await db.delete(courseEnrollments).where(
      and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.studentId, studentId))
    );
  }

  async getEnrolledStudents(courseId: number): Promise<any[]> {
    return db
      .select({
        ...getTableColumns(courseEnrollments),
        studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        studentEmail: users.email,
        department: users.department,
      })
      .from(courseEnrollments)
      .leftJoin(users, eq(courseEnrollments.studentId, users.id))
      .where(eq(courseEnrollments.courseId, courseId)) as any;
  }

  async getStudentEnrollments(studentId: number): Promise<any[]> {
    return db
      .select({
        ...getTableColumns(courseEnrollments),
        ...getTableColumns(courses),
        teacherName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        enrollmentId: courseEnrollments.id,
        enrolledAt: courseEnrollments.enrolledAt,
      })
      .from(courseEnrollments)
      .leftJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .leftJoin(users, eq(courses.teacherId, users.id))
      .where(eq(courseEnrollments.studentId, studentId)) as any;
  }

  async isEnrolled(courseId: number, studentId: number): Promise<boolean> {
    const [row] = await db
      .select()
      .from(courseEnrollments)
      .where(and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.studentId, studentId)));
    return !!row;
  }

  // ============================================
  // COURSE NOTES
  // ============================================
  async getCourseNotes(courseId: number, topic?: string): Promise<any[]> {
    let q = db
      .select({
        ...getTableColumns(courseNotes),
        uploaderName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      })
      .from(courseNotes)
      .leftJoin(users, eq(courseNotes.uploadedBy, users.id))
      .where(eq(courseNotes.courseId, courseId))
      .orderBy(desc(courseNotes.uploadedAt));

    if (topic) q = q.where(eq(courseNotes.topic, topic)) as any;

    return q as any;
  }

  async getCourseNote(id: number): Promise<CourseNote | undefined> {
    const [note] = await db.select().from(courseNotes).where(eq(courseNotes.id, id));
    return note;
  }

  async createCourseNote(data: any): Promise<CourseNote> {
    const [note] = await db.insert(courseNotes).values(data).returning();
    return note;
  }

  async updateCourseNote(id: number, data: Partial<CourseNote>): Promise<CourseNote> {
    const [note] = await db.update(courseNotes).set(data).where(eq(courseNotes.id, id)).returning();
    return note;
  }

  async deleteCourseNote(id: number): Promise<void> {
    await db.delete(courseNotes).where(eq(courseNotes.id, id));
  }

  // ============================================
  // CALENDAR EVENTS
  // ============================================
  async getCalendarEvents(tenantId?: number, department?: string): Promise<any[]> {
    let q = db
      .select({
        ...getTableColumns(calendarEvents),
        creatorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      })
      .from(calendarEvents)
      .leftJoin(users, eq(calendarEvents.createdBy, users.id))
      .orderBy(asc(calendarEvents.eventDate));

    const conditions: any[] = [];
    if (tenantId) conditions.push(eq(calendarEvents.tenantId, tenantId));
    if (department) conditions.push(eq(calendarEvents.department, department));

    if (conditions.length === 1) q = q.where(conditions[0]) as any;
    else if (conditions.length > 1) q = q.where(and(...conditions)) as any;

    return q as any;
  }

  async createCalendarEvent(data: any): Promise<CalendarEvent> {
    const [event] = await db.insert(calendarEvents).values(data).returning();
    return event;
  }

  async updateCalendarEvent(id: number, data: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const [event] = await db.update(calendarEvents).set(data).where(eq(calendarEvents.id, id)).returning();
    return event;
  }

  async deleteCalendarEvent(id: number): Promise<void> {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================
  async getUserNotifications(userId: number): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50) as any;
  }

  async createNotification(data: any): Promise<Notification> {
    const [notif] = await db.insert(notifications).values(data).returning();
    return notif;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }
}

export const storage = new DatabaseStorage();
