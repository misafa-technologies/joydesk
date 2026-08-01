import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/mpesa/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ack = Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
        let payload: Record<string, unknown> = {};
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          return ack;
        }

        try {
          const body = payload["Body"] as { stkCallback?: Record<string, unknown> } | undefined;
          const cb = body?.stkCallback;
          if (!cb) return ack;

          const checkoutRequestId = String(cb["CheckoutRequestID"] ?? "");
          if (!checkoutRequestId) return ack;
          const meta = (cb["CallbackMetadata"] as { Item?: { Name: string; Value?: unknown }[] } | undefined)?.Item ?? [];
          const receipt = meta.find((i) => i.Name === "MpesaReceiptNumber")?.Value;

          // Treat the callback as a notification only. Query Daraja directly before
          // changing payment state so a forged public request cannot settle an order.
          const { applyPaymentResult, loadMpesaConfig, stkQuery } = await import("@/lib/mpesa.server");
          const cfg = await loadMpesaConfig();
          const verified = await stkQuery(cfg, checkoutRequestId);
          const resultCode = String(verified["ResultCode"] ?? "");
          const resultDesc = String(verified["ResultDesc"] ?? cb["ResultDesc"] ?? "");
          if (!resultCode) return ack;
          const applied = await applyPaymentResult({
            checkoutRequestId,
            resultCode,
            resultDesc,
            receipt: receipt ? String(receipt) : null,
            raw: { callback: payload, verification: verified },
          });

          if (applied.success && applied.orderId && !applied.alreadyHandled) {
            const { notifyOrderEvent } = await import("@/lib/notifications.server");
            await notifyOrderEvent(applied.orderId, "payment_received", {
              receiptNumber: receipt ? String(receipt) : null,
            });
            await notifyOrderEvent(applied.orderId, "admin_new_order");
          }
        } catch (err) {
          console.error("[mpesa callback] failed:", err instanceof Error ? err.message : err);
        }
        return ack;
      },
      GET: async () => Response.json({ ok: true, endpoint: "mpesa-callback" }),
    },
  },
});
