async function testAPIs() {
  // Login first
  let loginRes = await fetch("http://localhost:5000/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student_test@nexus.edu", password: "password123" }) // Assuming this exists or we create it
  });
  
  if(loginRes.status === 401) {
    // try to register
    loginRes = await fetch("http://localhost:5000/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "student_test@nexus.edu", password: "password123", role: "STUDENT", firstName: "Test", lastName: "Student", department: "Computer Engineering", tenantId: 1 })
    });
  }

  const cookie = loginRes.headers.get("set-cookie");
  if (!cookie) {
    console.log("No cookie returned. Body:", await loginRes.text());
    return;
  }
  
  const headers = { "Cookie": cookie, "Content-Type": "application/json" };
  
  // 1. ChatGPT
  console.log("Testing /api/queries (Chat)...");
  let res = await fetch("http://localhost:5000/api/queries", {
    method: "POST",
    headers,
    body: JSON.stringify({ query: "What is software engineering?" })
  });
  console.log(res.status, await res.text());

  // 2. Recommendations
  console.log("Testing /api/student/recommendations...");
  res = await fetch("http://localhost:5000/api/student/recommendations", { headers });
  console.log(res.status, await res.text());

  // 3. Notifications
  console.log("Testing /api/student/notifications...");
  res = await fetch("http://localhost:5000/api/student/notifications", { headers });
  console.log(res.status, await res.text());

  // 4. Calendar
  console.log("Testing /api/calendar...");
  res = await fetch("http://localhost:5000/api/calendar?department=Computer%20Engineering", { headers });
  console.log(res.status, await res.text());
}
testAPIs().catch(console.error);
