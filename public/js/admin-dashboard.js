const token = localStorage.getItem("adminToken");
if (!token) location.href = "admin-login.html";

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "https://your-app-name.onrender.com"; // Replace this after deploying to Render

function logout() {
  localStorage.removeItem("adminToken");
  location.href = "admin-login.html";
}

function showAddForm() {
  document.getElementById("addStudentForm").style.display = "block";
}

async function fetchStudents() {
  const res = await fetch(`${API_BASE_URL}/api/admin/students`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const students = await res.json();

  const tbody = document.querySelector("#studentTable tbody");
  tbody.innerHTML = "";
  students.forEach((student) => {
    tbody.innerHTML += `
      <tr>
        <td>${student.name}</td>
        <td>${student.email}</td>
        <td>${student.course}</td>
        <td><button onclick="deleteStudent(${student.id})">Delete</button></td>
      </tr>
    `;
  });

  const assessmentSelect = document.getElementById("assessmentStudentSelect");
  const paymentSelect = document.getElementById("paymentStudentSelect");
  assessmentSelect.innerHTML = '<option value="">Select Student</option>';
  paymentSelect.innerHTML = '<option value="">Select Student</option>';
  students.forEach(student => {
    const option = `<option value="${student.id}">${student.name} (${student.student_id})</option>`;
    assessmentSelect.innerHTML += option;
    paymentSelect.innerHTML += option;
  });
}

async function deleteStudent(id) {
  await fetch(`${API_BASE_URL}/api/admin/students/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  fetchStudents();
}

document.getElementById("addStudentBtn").addEventListener("click", showAddForm);

document.getElementById("studentForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const formData = {
    student_id: this.student_id.value,
    name: this.name.value,
    email: this.email.value,
    course: this.course.value,
    password: this.password.value
  };
  const res = await fetch(`${API_BASE_URL}/api/admin/students`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(formData)
  });
  if (res.ok) {
    alert("Student added!");
    this.reset();
    document.getElementById("addStudentForm").style.display = "none";
    fetchStudents();
  }
});

document.getElementById("assessmentForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const payload = {
    student_id: this.assessmentStudentSelect.value,
    tuition: this.tuition.value,
    registration: this.registration.value,
    others: this.others.value,
    semester: this.semester.value,
    school_year: this.school_year.value
  };
  const res = await fetch(`${API_BASE_URL}/api/admin/assessments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (res.ok) {
    alert("Assessment recorded!");
    this.reset();
  }
});

document.getElementById("paymentForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const payload = {
    student_id: this.paymentStudentSelect.value,
    amount: this.amount.value,
    date: this.date.value
  };
  const res = await fetch(`${API_BASE_URL}/api/admin/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (res.ok) {
    alert("Payment recorded!");
    this.reset();
  }
});

fetchStudents();