import assert from "node:assert/strict";
import test from "node:test";
import { CaptchaRejected, SignupReleaseService } from "../src/signup_release.js";

const signup = {
  email: "builder@example.com",
  password: "long-local-password",
  name: "Solo Builder",
  widgetRecordId: "widget-record-123",
  captchaToken: "browser-token",
  idempotencyKey: "signup-demo-001"
};

test("a passing captcha queues one developer-tools release", async () => {
  let checks = 0;
  let widgetRecordId: string | undefined;
  const service = new SignupReleaseService(
    async (input) => {
      checks += 1;
      widgetRecordId = input.widget_record_id;
      return { success: true };
    },
    () => new Date("2026-09-05T10:00:00.000Z"),
    () => "fixed"
  );

  const first = await service.register(signup, "203.0.113.10");
  const replay = await service.register(signup, "203.0.113.10");

  assert.equal(first.decision, "accepted");
  assert.equal(first.release.state, "queued");
  assert.deepEqual(replay, first);
  assert.equal(checks, 1);
  assert.equal(widgetRecordId, signup.widgetRecordId);
});

test("a failed captcha blocks the release decision", async () => {
  const service = new SignupReleaseService(async () => ({ success: false }));
  await assert.rejects(() => service.register(signup), CaptchaRejected);
});
