const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../api/index.js");

test("demo login and protected dashboard", async () => {
  const server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  const port = server.address().port;
  try {
    const login = await fetch(`http://127.0.0.1:${port}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "student@mess.local", password: "Student123!" })
    });
    assert.equal(login.status, 200);
    const session = await login.json();
    assert.equal(session.role, "Student");

    const dashboard = await fetch(`http://127.0.0.1:${port}/api/dashboard`, {
      headers: { Authorization: `Bearer ${session.token}` }
    });
    assert.equal(dashboard.status, 200);
    const data = await dashboard.json();
    assert.ok(Array.isArray(data.menu));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test("health and readiness work without a database", async () => {
  const server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  const port = server.address().port;
  try {
    const health = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).mode, "memory");

    const ready = await fetch(`http://127.0.0.1:${port}/api/ready`);
    assert.equal(ready.status, 200);
    assert.equal((await ready.json()).status, "ready");
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test("demo login is trimmed and case-insensitive", async () => {
  const server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  const port = server.address().port;
  try {
    const login = await fetch(`http://127.0.0.1:${port}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "  ADMIN@MESS.LOCAL  ", password: "Admin123!" })
    });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).role, "Admin");
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test("public registration creates a persistent in-memory student", async () => {
  const server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  const port = server.address().port;
  try {
    const email = `student${Date.now()}@mess.local`;
    const register = await fetch(`http://127.0.0.1:${port}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Student456!" })
    });
    assert.equal(register.status, 201);

    const login = await fetch(`http://127.0.0.1:${port}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.toUpperCase(), password: "Student456!" })
    });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).role, "Student");
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test("root UI exposes working script, demo role selector, and signup tab", async () => {
  const server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  const port = server.address().port;
  try {
    const page = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /<script src="\/app\.js(?:\?[^"]*)?" defer><\/script>/);
    assert.match(html, /id="demoRole"/);
    assert.match(html, /Sign up/);
    assert.match(html, /<button id="loginSubmit" class="primary" type="button">Open dashboard<\/button>/);

    const script = await fetch(`http://127.0.0.1:${port}/public/app.js`);
    assert.equal(script.status, 200);
    assert.match(script.headers.get("content-type"), /javascript/);

    const rootScript = await fetch(`http://127.0.0.1:${port}/app.js`);
    assert.equal(rootScript.status, 200);
    assert.match(rootScript.headers.get("content-type"), /javascript/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
