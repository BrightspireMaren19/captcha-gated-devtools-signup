const response = await fetch("http://localhost:3000/signup", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    email: "chenhua@changba.com",
    password: "replace-with-a-long-password",
    name: "Solo Builder",
    widgetRecordId: process.env.CAPTCHA_WIDGET_RECORD_ID,
    captchaToken: process.env.CAPTCHA_TOKEN,
    idempotencyKey: "local-signup-demo-001"
  })
});

console.log(JSON.stringify(await response.json(), null, 2));
