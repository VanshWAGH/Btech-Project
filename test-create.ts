import { storage } from "./server/storage";
import { db } from "./server/db";

async function main() {
  try {
    const course = await storage.createCourse({
      courseId: "EXTC2425",
      courseName: "Test Course",
      courseCode: "TC242",
      department: "Computer Engineering",
      semester: "5",
      description: "Test",
      teacherId: 1, // Need a valid teacher
      tenantId: 1
    });
    console.log("Success:", course);
  } catch(e) {
    console.error("Error creating:", e);
  }
  process.exit(0);
}
main();
