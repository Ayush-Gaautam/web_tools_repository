const loginView = document.querySelector("#loginView");
const appView = document.querySelector("#appView");
const loginForm = document.querySelector("#loginForm");
const token = () => localStorage.getItem("mess_token");

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token()) headers.Authorization = `Bearer ${token()}`;
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function loadDashboard() {
  const data = await api("/api/dashboard");
  document.querySelector("#identity").textContent = `${data.role} · ${localStorage.getItem("mess_email")}`;
  document.querySelector("#dashboard").innerHTML = `<div class="stats"><div class="stat">Active halls<strong>${data.halls.length}</strong></div><div class="stat">Bookings<strong>${data.bookingCount}</strong></div><div class="stat">Waste kg<strong>${data.wasteKg}</strong></div></div>`;
  document.querySelector("#menu").innerHTML = data.menu.map(x => `<div class="menu-item"><span>${x.mealType}</span><strong>${x.dishName}</strong><p>${x.prepared} portions</p></div>`).join("");
  document.querySelector("#wasteForm").hidden = !["Admin", "Manager", "Kitchen"].includes(data.role);
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const data = await api("/api/login", { method: "POST", body: JSON.stringify({ email: document.querySelector("#email").value, password: document.querySelector("#password").value }) });
    localStorage.setItem("mess_token", data.token);
    localStorage.setItem("mess_email", data.email);
    loginView.hidden = true;
    appView.hidden = false;
    await loadDashboard();
  } catch (error) {
    document.querySelector("#loginError").textContent = error.message;
  }
});

document.querySelector("#bookingForm").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await api("/api/bookings", {
      method: "POST",
      body: JSON.stringify({
        diningHall: document.querySelector("#hall").value,
        mealType: document.querySelector("#mealType").value
      })
    });
    document.querySelector("#actionStatus").textContent = "Meal booking confirmed.";
    await loadDashboard();
  } catch (error) {
    document.querySelector("#actionStatus").textContent = error.message;
  }
});

document.querySelector("#wasteForm").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await api("/api/waste", {
      method: "POST",
      body: JSON.stringify({
        diningHall: document.querySelector("#hall").value,
        mealType: document.querySelector("#mealType").value,
        dishName: document.querySelector("#dish").value,
        quantityKg: Number(document.querySelector("#quantity").value),
        cost: Number(document.querySelector("#cost").value)
      })
    });
    document.querySelector("#actionStatus").textContent = "Waste record saved.";
    await loadDashboard();
  } catch (error) {
    document.querySelector("#actionStatus").textContent = error.message;
  }
});

document.querySelector("#logout").addEventListener("click", () => {
  localStorage.removeItem("mess_token");
  localStorage.removeItem("mess_email");
  appView.hidden = true;
  loginView.hidden = false;
});

if (token()) {
  loginView.hidden = true;
  appView.hidden = false;
  loadDashboard().catch(() => {
    localStorage.removeItem("mess_token");
    appView.hidden = true;
    loginView.hidden = false;
  });
}
