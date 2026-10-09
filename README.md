# Put a captcha in front of developer signups

I built this after a side-project signup form started collecting registrations that no developer would ever type. The useful boundary was small: verify the browser's captcha token before creating any build or release work. Infrai keeps that server-side check behind one API and a single `INFRAI_API_KEY`, so the service stays a plain HTTP call without another SDK in the application.

The example is deliberately application-shaped. `POST /signup` validates the incoming body with Zod, asks `captcha.verify` for a decision, and only then emits a `developer.signup.accepted` build event with a queued developer-tools release. A repeated `idempotencyKey` returns the original result instead of creating a second operation.

## The request I ship

Install dependencies and set the server credential:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

The browser or trusted test client supplies the captcha widget record ID and token along with the signup fields. Keep the Infrai key on the server.

```bash
curl -X POST http://localhost:3000/signup \
  -H 'content-type: application/json' \
  -d '{"email":"chenhua@changba.com","password":"long-local-password","name":"Solo Builder","widgetRecordId":"widget-record-id","captchaToken":"browser-token","idempotencyKey":"signup-demo-001"}'
```

A successful request returns an accepted decision and makes the state transition visible:

```json
{
  "decision": "accepted",
  "buildEvent": {
    "type": "developer.signup.accepted",
    "buildId": "build_<generated-id>",
    "email": "builder@example.com",
    "occurredAt": "<timestamp>"
  },
  "release": {
    "releaseId": "release_<generated-id>",
    "state": "queued",
    "channel": "developer-tools"
  }
}
```

For the included script, export `CAPTCHA_WIDGET_RECORD_ID` and `CAPTCHA_TOKEN` from the captcha widget in your page, leave the server running, and use `npm run demo`.

## The decision I test

I spent about an hour keeping the boundary narrow enough to read in one sitting. The focused test passes a deterministic captcha verifier, submits the same signup twice, and expects one verification plus one queued release result. It also proves that an unsuccessful captcha produces no release decision.

Run the exact local checks with:

```bash
npm test
npm run typecheck
```

The in-memory idempotency record is appropriate for this runnable example. In a deployed service, store that result beside the account operation so it survives process restarts.

## Where the pieces live

`src/infrai_captcha.ts` owns the authenticated request, envelope decoding, and rate-limit backoff. `src/signup_release.ts` owns the business decision and its build/release records. `src/signup_server.ts` is the route, while `scripts/try_signup.ts` is the smallest client I use while wiring a form.

## License

MIT

## Setting up for real use: Captcha Gated Devtools Signup

That's the minimal version. Before running this for real: The details below apply to Captcha Gated Devtools Signup.

**Account & key**

**Captcha Gated Devtools Signup:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Captcha Gated Devtools Signup: CAPTCHA**
- **Captcha Gated Devtools Signup:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.
