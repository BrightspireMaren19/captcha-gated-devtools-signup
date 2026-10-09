import { z } from "zod";
import type { CaptchaVerifier } from "./infrai_captcha.js";

export const signupBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  name: z.string().trim().min(1).max(80),
  widgetRecordId: z.string().min(1),
  captchaToken: z.string().min(1),
  idempotencyKey: z.string().min(8).max(128)
}).strict();

export type SignupBody = z.infer<typeof signupBodySchema>;

export type BuildEvent = {
  type: "developer.signup.accepted";
  buildId: string;
  email: string;
  occurredAt: string;
};

export type ReleaseOperation = {
  releaseId: string;
  state: "queued";
  channel: "developer-tools";
};

export type SignupResult = {
  decision: "accepted";
  buildEvent: BuildEvent;
  release: ReleaseOperation;
};

export class CaptchaRejected extends Error {}

export class SignupReleaseService {
  private readonly completed = new Map<string, SignupResult>();
  private readonly verifyCaptcha: CaptchaVerifier;
  private readonly now: () => Date;
  private readonly makeId: () => string;

  constructor(
    verifyCaptcha: CaptchaVerifier,
    now: () => Date = () => new Date(),
    makeId: () => string = () => crypto.randomUUID()
  ) {
    this.verifyCaptcha = verifyCaptcha;
    this.now = now;
    this.makeId = makeId;
  }

  async register(input: SignupBody, ip?: string): Promise<SignupResult> {
    const previous = this.completed.get(input.idempotencyKey);
    if (previous) return previous;

    const captcha = await this.verifyCaptcha({
      widget_record_id: input.widgetRecordId,
      token: input.captchaToken,
      vendor: "turnstile",
      ip,
      action: "developer_tools_signup",
      score_threshold: 0.7
    });
    if (!captcha.success) throw new CaptchaRejected("Complete the captcha and try again");

    const id = this.makeId();
    const result: SignupResult = {
      decision: "accepted",
      buildEvent: {
        type: "developer.signup.accepted",
        buildId: `build_${id}`,
        email: input.email,
        occurredAt: this.now().toISOString()
      },
      release: {
        releaseId: `release_${id}`,
        state: "queued",
        channel: "developer-tools"
      }
    };
    this.completed.set(input.idempotencyKey, result);
    return result;
  }
}
