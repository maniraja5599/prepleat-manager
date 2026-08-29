import { createServerFn } from "@tanstack/react-start";

export interface CreateOrderPayload {
  appId: string;
  secretKey: string;
  isProd: boolean;
  amount: number;
  plan: string;
  userId: string;
  userEmail: string;
  customerPhone?: string;
}

export const createCashfreeOrderServer = createServerFn({ method: "POST" })
  .validator((data: CreateOrderPayload) => data)
  .handler(async ({ data }) => {
    const { appId, secretKey, isProd, amount, plan, userId, userEmail, customerPhone } = data;

    if (!appId || !secretKey) {
      return {
        success: false,
        message: "Cashfree App ID and Secret Key must be configured in Admin Settings.",
      };
    }

    const endpoint = isProd
      ? "https://api.cashfree.com/pg/orders"
      : "https://sandbox.cashfree.com/pg/orders";

    const cleanUid = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 45) || "cust_user";
    const orderId = `order_${cleanUid}_${Date.now()}`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "x-client-id": appId.trim(),
          "x-client-secret": secretKey.trim(),
          "x-api-version": "2023-08-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: orderId,
          order_amount: Number(amount),
          order_currency: "INR",
          customer_details: {
            customer_id: cleanUid,
            customer_email: userEmail || "customer@sareeprepleat.com",
            customer_phone: (customerPhone && customerPhone.replace(/\D/g, "").slice(-10).length === 10)
              ? customerPhone.replace(/\D/g, "").slice(-10)
              : "9159036301",
          },
          order_meta: {
            return_url: `https://sareeprepleatmanager.vercel.app?order_id=${orderId}`,
          },
          order_note: `Subscription ${plan.toUpperCase()} for ${userEmail}`,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.payment_session_id) {
        return {
          success: true,
          paymentSessionId: resData.payment_session_id,
          orderId: resData.order_id,
        };
      } else {
        return {
          success: false,
          message: resData.message || `Cashfree error (${res.status}): ${JSON.stringify(resData)}`,
        };
      }
    } catch (err: any) {
      console.error("Server-side Cashfree error:", err);
      return {
        success: false,
        message: err?.message || "Failed to connect to Cashfree payment server.",
      };
    }
  });
