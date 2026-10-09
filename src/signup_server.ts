import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { InfraiError, infrai } from "./infrai_captcha.js";
import { CaptchaRejected, SignupReleaseService, signupBodySchema } from "./signup_release.js";

const service = new SignupReleaseService(infrai.captcha.verify);

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/signup") {
    send(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const input = signupBodySchema.parse(await readJson(request));
    const ip = request.socket.remoteAddress;
    send(response, 202, await service.register(input, ip));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      send(response, 400, { error: "Invalid signup body" });
    } else if (error instanceof CaptchaRejected) {
      send(response, 422, { error: error.message });
    } else if (error instanceof InfraiError) {
      send(response, error.status >= 400 && error.status < 500 ? error.status : 502, {
        error: error.message,
        code: error.code
      });
    } else {
      send(response, 502, { error: "Signup verification could not be completed" });
    }
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Developer signup listening on http://localhost:${port}/signup`));
