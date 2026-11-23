(() => {
  const memorySession = { token: "", email: "" };
  const demoCredentials = {
    "student@mess.local": { password: "Student123!", role: "Student" },
    "kitchen@mess.local": { password: "Kitchen123!", role: "Kitchen" },
    "manager@mess.local": { password: "Manager123!", role: "Manager" },
    "admin@mess.local": { password: "Admin123!", role: "Admin" }
  };

  function storageGet(key) {
    try {
      return window.localStorage?.getItem(key) || memorySession[key === "mess_token" ? "token" : "email"] || "";
    } catch {
      return memorySession[key === "mess_token" ? "token" : "email"] || "";
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage?.setItem(key, value);
    } catch {
      if (key === "mess_token") memorySession.token = value;
      if (key === "mess_email") memorySession.email = value;
    }
  }

  function storageRemove(key) {
    try {
      window.localStorage?.removeItem(key);
    } catch {
      if (key === "mess_token") memorySession.token = "";
      if (key === "mess_email") memorySession.email = "";
    }
  }

  function initialize() {
    const loginView = document.querySelector("#loginView");
    const appView = document.querySelector("#appView");
    const loginForm = document.querySelector("#loginForm");
    const loginSubmit = document.querySelector("#loginSubmit");
    const loginError = document.querySelector("#loginError");
    if (!loginView || !appView || !loginForm) return;

    const token = () => storageGet("mess_token");

    async function api(path, options = {}) {
      const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
      if (token()) headers.Authorization = `Bearer ${token()}`;
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      let response;
      try {
        response = await fetch(path, { ...options, headers, signal: controller.signal });
      } catch (error) {
        if (error.name === "AbortError") throw new Error("Request timed out. Please try again.");
        throw new Error("Cannot reach the server. Check your connection and redeploy status.");
      } finally {
        window.clearTimeout(timeout);
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
      return data;
    }

    async function loadDashboard() {
      const data = await api("/api/dashboard");
      document.querySelector("#identity").textContent =
        `${data.role} · ${storageGet("mess_email")}`;
      document.querySelector("#dashboard").innerHTML =
        `<div class="stats">
          <div class="stat">Active halls<strong>${data.halls.length}</strong></div>
          <div class="stat">Bookings<strong>${data.bookingCount}</strong></div>
          <div class="stat">Waste kg<strong>${data.wasteKg}</strong></div>
        </div>`;
      document.querySelector("#menu").innerHTML = data.menu
        .map(x => `<div class="menu-item"><span>${x.mealType}</span><strong>${x.dishName}</strong><p>${x.prepared} portions</p></div>`)
        .join("");
      document.querySelector("#wasteForm").hidden =
        !["Admin", "Manager", "Kitchen"].includes(data.role);
    }

    async function enterSession(data) {
      storageSet("mess_token", data.token);
      storageSet("mess_email", data.email);
      loginView.hidden = true;
      appView.hidden = false;
      document.querySelector("#identity").textContent =
        `${data.role || "User"} · ${data.email || storageGet("mess_email")}`;
      loadDashboard().catch(error => {
        document.querySelector("#actionStatus").textContent =
          `Dashboard data could not refresh: ${error.message}`;
      });
    }

    function localDemoLogin(email, password) {
      const account = demoCredentials[email];
      if (!account || account.password !== password) return null;
      return {
        token: `demo-${account.role.toLowerCase()}`,
        email,
        role: account.role
      };
    }

    function localRegister(email, password) {
      let accounts = {};
      try {
        accounts = JSON.parse(window.localStorage?.getItem("mess_registered_accounts") || "{}");
      } catch {
        accounts = {};
      }
      const key = email.toLowerCase();
      if (accounts[key]) return { error: "An account with this email already exists" };
      accounts[key] = { password, role: "Student" };
      try {
        window.localStorage?.setItem("mess_registered_accounts", JSON.stringify(accounts));
      } catch {
        // The entered account still works for this browser session.
      }
      memorySession.email = key;
      return { token: "demo-Student", email: key, role: "Student" };
    }

    function localRegisteredLogin(email, password) {
      let accounts = {};
      try {
        accounts = JSON.parse(window.localStorage?.getItem("mess_registered_accounts") || "{}");
      } catch {
        accounts = {};
      }
      const account = accounts[email];
      if (!account || account.password !== password) return null;
      return { token: "demo-Student", email, role: account.role || "Student" };
    }

    document.querySelector("#demoRole").addEventListener("change", event => {
      const [email, password] = event.target.value.split("|");
      document.querySelector("#email").value = email;
      document.querySelector("#password").value = password;
    });

    async function openMessDashboard(event) {
      if (event) event.preventDefault();
      loginSubmit.disabled = true;
      loginSubmit.textContent = "Signing in...";
      loginError.textContent = "";
      try {
        const email = document.querySelector("#email").value.trim().toLowerCase();
        const password = document.querySelector("#password").value;
        let data = localDemoLogin(email, password) ||
          localRegisteredLogin(email, password);
        if (!data) {
          data = await api("/api/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
          });
        }
        await enterSession(data);
      } catch (error) {
        loginError.textContent = error.message;
      } finally {
        loginSubmit.disabled = false;
        loginSubmit.textContent = "Open dashboard";
      }
    }

    window.openMessDashboard = openMessDashboard;
    loginSubmit.removeEventListener("click", openMessDashboard);
    loginForm.addEventListener("submit", event => {
      openMessDashboard(event);
    });

    const loginTab = document.querySelector("#loginTab");
    const registerTab = document.querySelector("#registerTab");
    const loginFields = document.querySelector("#loginFields");
    const registerFields = document.querySelector("#registerFields");
    const registerSubmit = document.querySelector("#registerSubmit");

    function showAuthTab(register) {
      loginFields.hidden = register;
      registerFields.hidden = !register;
      loginTab.classList.toggle("active", !register);
      registerTab.classList.toggle("active", register);
      loginError.textContent = "";
    }

    loginTab.addEventListener("click", () => showAuthTab(false));
    registerTab.addEventListener("click", () => showAuthTab(true));

    registerSubmit.addEventListener("click", async () => {
      registerSubmit.disabled = true;
      registerSubmit.textContent = "Creating account...";
      loginError.textContent = "";
      try {
        const email = document.querySelector("#registerEmail").value.trim().toLowerCase();
        const password = document.querySelector("#registerPassword").value;
        if (!email.includes("@")) throw new Error("Enter a valid email address");
        if (password.length < 8) throw new Error("Password must be at least 8 characters");
        let data = localRegister(email, password);
        if (data.error) throw new Error(data.error);
        api("/api/register", {
          method: "POST",
          body: JSON.stringify({ email, password })
        }).catch(() => {
          // Local registration remains available when Vercel API is unavailable.
        });
        await enterSession(data);
      } catch (error) {
        loginError.textContent = error.message;
      } finally {
        registerSubmit.disabled = false;
        registerSubmit.textContent = "Create account";
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
      storageRemove("mess_token");
      storageRemove("mess_email");
      memorySession.token = "";
      memorySession.email = "";
      appView.hidden = true;
      loginView.hidden = false;
    });

    if (token()) {
      loginView.hidden = true;
      appView.hidden = false;
      loadDashboard().catch(() => {
        storageRemove("mess_token");
        appView.hidden = true;
        loginView.hidden = false;
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
