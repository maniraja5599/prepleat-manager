import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Schema = z.object({
  owner_user_id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(6).max(20).regex(/^[0-9+\-\s()]+$/),
  service: z.enum(["prepleat", "drape"]),
  saree_count: z.number().int().min(1).max(50),
  delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  delivery_time: z.string().max(20).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/booking-requests")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        let body: unknown;
        try { body = await request.json(); } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
        }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
        }
        const d = parsed.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Verify the recipient is a real registered user before accepting the request.
        const { data: profile, error: pErr } = await supabaseAdmin
          .from("profiles").select("id").eq("id", d.owner_user_id).maybeSingle();
        if (pErr || !profile) {
          return new Response(JSON.stringify({ error: "Unknown recipient" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
        }

        const { error } = await supabaseAdmin.from("booking_requests").insert({
          owner_user_id: d.owner_user_id,
          name: d.name,
          phone: d.phone,
          service: d.service,
          saree_count: d.saree_count,
          delivery_date: d.delivery_date ?? null,
          delivery_time: d.delivery_time ?? null,
          notes: d.notes ?? null,
        });
        if (error) {
          return new Response(JSON.stringify({ error: "Could not submit" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
      },
    },
  },
});