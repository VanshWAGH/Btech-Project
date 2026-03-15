async function testAPIs() {
  // Login as a teacher
  let loginRes = await fetch("http://localhost:5000/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "teacher_test@nexus.edu", password: "password123" })
  });
  
  if(loginRes.status === 401) {
    loginRes = await fetch("http://localhost:5000/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "teacher_test@nexus.edu", password: "password123", role: "TEACHER", firstName: "Test", lastName: "Teacher", department: "Computer Engineering", tenantId: 1 })
    });
  }

  const cookie = loginRes.headers.get("set-cookie");
  if (!cookie) {
    console.log("No cookie returned. Body:", await loginRes.text());
    return;
  }
  
  const headers = { "Cookie": cookie, "Content-Type": "application/json" };
  
  // 1. Get Teacher Stats
  console.log("Testing /api/courses (Teacher)...");
  let res = await fetch("http://localhost:5000/api/courses", { headers });
  console.log("Courses Status:", res.status);
  const courses = await res.json();
  
  let courseId;
  if (courses.length === 0) {
      console.log("No courses found, creating one for testing...");
      const createRes = await fetch("http://localhost:5000/api/courses", {
          method: "POST",
          headers,
          body: JSON.stringify({
              courseId: "TE_CS101",
              courseName: "Test Course TE",
              courseCode: "TE101",
              department: "Computer Engineering",
              semester: "1",
              description: "Testing Notes Upload"
          })
      });
      const created = await createRes.json();
      courseId = created.id;
  } else {
      courseId = courses[0].id;
  }

  // 2. Test Get Notes
  console.log("Testing /api/courses/" + courseId + "/notes ...");
  res = await fetch("http://localhost:5000/api/courses/" + courseId + "/notes", { headers });
  console.log("Notes Status:", res.status, await res.text());

  // 3. Test Create Note
  console.log("Testing Create Note...");
  res = await fetch("http://localhost:5000/api/courses/" + courseId + "/notes", {
      method: "POST",
      headers,
      body: JSON.stringify({
          title: "Introduction Lecture",
          description: "Basic info",
          topic: "Basics"
      })
  });
  console.log("Create Note Status:", res.status, await res.text());

  // 4. Test Get Enrolled Students
  console.log("Testing Enrolled Students...");
  res = await fetch("http://localhost:5000/api/courses/" + courseId + "/students", { headers });
  console.log("Enrolled Students Status:", res.status, await res.text());

  // 5. Calendar Post
  console.log("Testing Calendar Post...");
  res = await fetch("http://localhost:5000/api/calendar", {
      method: "POST",
      headers,
      body: JSON.stringify({
          title: "Teacher Exam",
          department: "Computer Engineering",
          eventDate: new Date().toISOString(),
          eventType: "exam"
      })
  });
  console.log("Calendar Post Status:", res.status, await res.text());

  // 6. Test Teacher Dashboard Stats (if it exists)
  console.log("Testing /api/teacher/stats...");
  res = await fetch("http://localhost:5000/api/teacher/stats", { headers });
  if (res.status === 404) {
      console.log("Endpoint /api/teacher/stats might not exist, ignoring error...");
  } else {
      console.log("Teacher Stats Status:", res.status, await res.text());
  }

}
testAPIs().catch(console.error);
