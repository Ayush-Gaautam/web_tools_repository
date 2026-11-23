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
