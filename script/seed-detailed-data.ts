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

const DEPARTMENTS = ["Computer Engineering", "Information Technology", "Mechanical Engineering", "Electrical Engineering"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

async function main() {
  console.log("Seeding detailed test data for different branches and years...");

  const allTenants = await db.select().from(tenants);

  if (allTenants.length === 0) {
    console.log("No tenants found! Please run patch-db.ts first to create demo tenants.");
    process.exit(1);
  }

  const defaultPassword = await hashPassword("password123");

  for (const t of allTenants) {
    console.log(`\n--- Seeding Detailed Data for Tenant: ${t.name} (ID: ${t.id}) ---`);
    const domain = t.domain || "example.com";

    // 1. Create a University Admin (UA)
    const uaEmail = `admin_${t.id}@${domain}`;
    let [ua] = await db.select().from(users).where(eq(users.email, uaEmail));
    if (!ua) {
      [ua] = await db.insert(users).values({
        email: uaEmail,
        password: defaultPassword,
        firstName: "System",
        lastName: "Admin",
        role: "UNIVERSITY_ADMIN",
        username: uaEmail.split("@")[0],
        name: `University Admin`,
      }).returning();
      console.log(` Created University Admin: ${uaEmail}`);
    } else {
      console.log(` University Admin exists: ${uaEmail}`);
    }

    // Add UA to tenantMembers
    let uaMember = await db.select()
        .from(tenantMembers)
        .where(and(eq(tenantMembers.userId, ua.id), eq(tenantMembers.tenantId, t.id)));
    if (uaMember.length === 0) {
      await db.insert(tenantMembers).values({
        tenantId: t.id,
        userId: ua.id,
        role: "UNIVERSITY_ADMIN",
      });
    }

    // 2. Create Teachers for different departments
    const teacherUsers = [];
    for (const dept of DEPARTMENTS) {
      const email = `teacher_${dept.substring(0,2).toLowerCase()}_${t.id}@${domain}`;
      let [teacher] = await db.select().from(users).where(eq(users.email, email));
      if (!teacher) {
        [teacher] = await db.insert(users).values({
          email: email,
          password: defaultPassword,
          firstName: "Prof.",
          lastName: dept.split(' ')[0],
          role: "TEACHER",
          department: dept,
          username: email.split("@")[0],
          name: `Prof. ${dept.split(' ')[0]}`,
        }).returning();
        console.log(` Created Teacher for ${dept}: ${email}`);
      }
      teacherUsers.push(teacher);

      // Add to tenant members
      let tm = await db.select()
        .from(tenantMembers)
        .where(and(eq(tenantMembers.userId, teacher.id), eq(tenantMembers.tenantId, t.id)));
      if (tm.length === 0) {
        await db.insert(tenantMembers).values({
          tenantId: t.id,
          userId: teacher.id,
          role: "TEACHER",
          department: dept
        });
      }

      // Create a specific course for this department and teacher
      const courseCode = `${dept.substring(0,2).toUpperCase()}200-${t.id}`;
      let [course] = await db.select().from(courses).where(and(
        eq(courses.courseCode, courseCode),
        eq(courses.tenantId, t.id)
      ));
      if (!course) {
        [course] = await db.insert(courses).values({
          tenantId: t.id,
          courseId: `${courseCode}-SP26`,
          courseName: `Core ${dept}`,
          courseCode: courseCode,
          department: dept,
          semester: "Spring 2026",
          teacherId: teacher.id,
          description: `Core concepts of ${dept}.`,
        }).returning();
        console.log(` Created Course for ${dept}: ${course.courseName}`);
      }
    }

    // 3. Create Students across permutations of branch and year
    for (const dept of DEPARTMENTS) {
      for (let i = 0; i < YEARS.length; i++) {
        const year = YEARS[i];
        const studentEmail = `student_${dept.substring(0,2).toLowerCase()}_y${i+1}_${t.id}@${domain}`;
        
        let [student] = await db.select().from(users).where(eq(users.email, studentEmail));
        if (!student) {
          [student] = await db.insert(users).values({
            email: studentEmail,
            password: defaultPassword,
            firstName: "Student",
            lastName: `${dept.split(' ')[0]} Y${i+1}`,
            role: "STUDENT",
            department: dept,
            academicYear: year, // Adding year info
            username: studentEmail.split("@")[0],
            name: `Student ${dept.split(' ')[0]} Y${i+1}`,
          }).returning();
          console.log(` Created Student (${dept}, ${year}): ${studentEmail}`);
        }

        // Add to tenant members
        let tm = await db.select()
          .from(tenantMembers)
          .where(and(eq(tenantMembers.userId, student.id), eq(tenantMembers.tenantId, t.id)));
        if (tm.length === 0) {
          await db.insert(tenantMembers).values({
            tenantId: t.id,
            userId: student.id,
            role: "STUDENT",
            department: dept
          });
        }

        // Enroll in the department's course
        const deptCourseCode = `${dept.substring(0,2).toUpperCase()}200-${t.id}`;
        let [course] = await db.select().from(courses).where(and(
          eq(courses.courseCode, deptCourseCode),
          eq(courses.tenantId, t.id)
        ));
        
        if (course) {
           let existingEnroll = await db.select().from(courseEnrollments)
            .where(and(
              eq(courseEnrollments.courseId, course.id),
              eq(courseEnrollments.studentId, student.id)
            ));
          
          if (existingEnroll.length === 0) {
            await db.insert(courseEnrollments).values({
              courseId: course.id,
              studentId: student.id,
            });
            console.log(` Enrolled ${studentEmail} in ${course.courseName}`);
          }
        }
      }
    }
  }

  console.log("\n✅ Detailed Seeding Complete! Enjoy testing.");
  await pool.end();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
