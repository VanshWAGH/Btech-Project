import "dotenv/config";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq, and } from "drizzle-orm";
import { db, pool } from "../server/db";
import { 
  tenants, users, tenantMembers, courses, courseEnrollments, 
  announcements, notifications 
} from "../shared/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  console.log("Seeding test data across all tenants...");

  const allTenants = await db.select().from(tenants);

  if (allTenants.length === 0) {
    console.log("No tenants found! Please run patch-db.ts first to create demo tenants.");
    process.exit(1);
  }

  const defaultPassword = await hashPassword("password123");

  for (const t of allTenants) {
    console.log(`\n--- Seeding Tenant: ${t.name} (ID: ${t.id}) ---`);
    const domain = t.domain || "example.com";

    // 1. Create a Teacher
    const teacherEmail = `teacher_${t.id}@${domain}`;
    let [teacher] = await db.select().from(users).where(eq(users.email, teacherEmail));
    if (!teacher) {
      [teacher] = await db.insert(users).values({
        email: teacherEmail,
        password: defaultPassword,
        firstName: "Dr. Alex",
        lastName: "Smith",
        role: "TEACHER",
        department: "Computer Engineering",
        username: teacherEmail.split("@")[0],
        name: `Dr. Alex Smith`,
      }).returning();
      console.log(` Created Teacher: ${teacherEmail}`);
    } else {
      console.log(` Teacher exists: ${teacherEmail}`);
    }

    // 2. Create 2 Students
    const student1Email = `student1_${t.id}@${domain}`;
    let [student1] = await db.select().from(users).where(eq(users.email, student1Email));
    if (!student1) {
      [student1] = await db.insert(users).values({
        email: student1Email,
        password: defaultPassword,
        firstName: "Alice",
        lastName: "Johnson",
        role: "STUDENT",
        department: "Computer Engineering",
        username: student1Email.split("@")[0],
        name: `Alice Johnson`,
      }).returning();
      console.log(` Created Student 1: ${student1Email}`);
    }

    const student2Email = `student2_${t.id}@${domain}`;
    let [student2] = await db.select().from(users).where(eq(users.email, student2Email));
    if (!student2) {
      [student2] = await db.insert(users).values({
        email: student2Email,
        password: defaultPassword,
        firstName: "Bob",
        lastName: "Williams",
        role: "STUDENT",
        department: "Computer Engineering",
        username: student2Email.split("@")[0],
        name: `Bob Williams`,
      }).returning();
      console.log(` Created Student 2: ${student2Email}`);
    }

    // 3. Add to tenant_members (if not already added)
    for (const u of [teacher, student1, student2]) {
      const existingMember = await db.select()
        .from(tenantMembers)
        .where(
          and(
            eq(tenantMembers.userId, u.id),
            eq(tenantMembers.tenantId, t.id)
          )
        );
      
      if (existingMember.length === 0) {
        await db.insert(tenantMembers).values({
          tenantId: t.id,
          userId: u.id,
          role: u.role || "STUDENT",
          department: "Computer Engineering"
        });
      }
    }

    // 4. Create a Course for the teacher
    const courseCode = `CS101-${t.id}`;
    let [course] = await db.select().from(courses).where(and(
      eq(courses.courseCode, courseCode),
      eq(courses.tenantId, t.id)
    ));

    if (!course) {
      [course] = await db.insert(courses).values({
        tenantId: t.id,
        courseId: `CS101-${t.id}-FA25`,
        courseName: "Introduction to Artificial Intelligence",
        courseCode: courseCode,
        department: "Computer Engineering",
        semester: "Fall 2025",
        teacherId: teacher.id,
        description: "An introductory course to AI, Neural Networks, and RAG systems.",
      }).returning();
      console.log(` Created Course: ${course.courseName}`);
    }

    // 5. Enroll Students in the Course
    for (const s of [student1, student2]) {
      const existingEnroll = await db.select().from(courseEnrollments)
        .where(and(
          eq(courseEnrollments.courseId, course.id),
          eq(courseEnrollments.studentId, s.id)
        ));
      
      if (existingEnroll.length === 0) {
        await db.insert(courseEnrollments).values({
          courseId: course.id,
          studentId: s.id,
        });
        console.log(` Enrolled ${s.email} in ${course.courseName}`);
      }
    }

    // 6. Create Announcements
    const [existingAnnouncements] = await db.select().from(announcements)
      .where(eq(announcements.tenantId, t.id)).limit(1);
    
    if (!existingAnnouncements) {
      await db.insert(announcements).values([{
        tenantId: t.id,
        title: "Welcome to the New Academic Year!",
        content: "We are excited to launch our new multi-tenant RAG learning platform.",
        targetRole: "ALL",
        createdBy: teacher.id
      }, {
        tenantId: t.id,
        title: "Midterm Exams Schedule Released",
        content: "Please check your department's board for the definitive exam timetable.",
        department: "Computer Engineering",
        targetRole: "STUDENT",
        createdBy: teacher.id
      }]);
      console.log(` Created Announcements for Tenant`);
    }

    // 7. Create Notifications for Students
    for (const s of [student1, student2]) {
      const [existingNotifs] = await db.select()
        .from(notifications)
        .where(eq(notifications.userId, s.id)).limit(1);

      if (!existingNotifs) {
        await db.insert(notifications).values([{
          userId: s.id,
          tenantId: t.id,
          type: "new_course",
          title: "You've been enrolled!",
          message: `You are now enrolled in ${course.courseName}.`,
          relatedId: course.id,
        }, {
          userId: s.id,
          tenantId: t.id,
          type: "new_note",
          title: "New Course Material Available",
          message: `Dr. Smith has uploaded new lecture slides for ${course.courseName}.`,
          relatedId: course.id,
        }]);
        console.log(` Created Notifications for ${s.email}`);
      }
    }
  }

  console.log("\n✅ Seeding Complete! Enjoy testing.");
  await pool.end();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
