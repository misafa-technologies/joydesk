import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestUrl } from "@tanstack/react-start/server";
import { z } from "zod";

const resetSchema = z.object({ email: z.string().email().max(255) });

/**
 * Sends a password reset link built from the domain the request actually came
 * from (preview, Vercel, custom domain) instead of a hardcoded host.
 * Returns `fallback: true` when the caller should use the built-in provider email.
 */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => resetSchema.parse(data))
  .handler(async ({ data }) => {
    // Origin is derived server-side so a client can never inject a phishing host.
    const originHeader = getRequestHeader("origin");
    const origin = (originHeader ?? getRequestUrl().origin).replace(/\/$/, "");

    const { sendCustomPasswordReset } = await import("@/lib/auth.server");
    const result = await sendCustomPasswordReset(data.email, origin);
    // Never reveal whether the account exists.
    return { fallback: result.fallback, origin };
  });
