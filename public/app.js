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
  if (!document.querySelector("#loginFields").hidden) {
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
  }
});

const loginTab = document.querySelector("#loginTab");
const registerTab = document.querySelector("#registerTab");
const loginFields = document.querySelector("#loginFields");
const registerFields = document.querySelector("#registerFields");

function showAuthTab(register) {
  loginFields.hidden = register;
  registerFields.hidden = !register;
  loginTab.classList.toggle("active", !register);
  registerTab.classList.toggle("active", register);
  document.querySelector("#loginError").textContent = "";
}

loginTab.addEventListener("click", () => showAuthTab(false));
registerTab.addEventListener("click", () => showAuthTab(true));

document.querySelector("#registerSubmit").addEventListener("click", async () => {
  try {
    const data = await api("/api/register", {
      method: "POST",
      body: JSON.stringify({
        email: document.querySelector("#registerEmail").value,
        password: document.querySelector("#registerPassword").value
      })
    });
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
