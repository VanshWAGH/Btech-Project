async function run() {
  const resp = await fetch("http://localhost:5000/api/courses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": "connect.sid=s%3A_z23mZ4YpTns19qQ8bUScT1NGBm6wJ1h.fake" // Probably auth will fail
    },
    body: JSON.stringify({
      courseId: "CS301",
      courseName: "Test Course",
      courseCode: "CS-301",
      department: "Computer Engineering",
      semester: "2",
      description: "Test"
    })
  });
  console.log(resp.status, await resp.text());
}
run();
