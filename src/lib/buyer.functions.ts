import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, created_at, payment_status, fulfillment_status, gross_cents, total, tracking_code, carrier, shipped_at, delivered_at")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const orderIds = (orders ?? []).map((o: any) => o.id);
    let itemsByOrder: Record<string, any[]> = {};
    if (orderIds.length) {
      const { data: items } = await supabase
        .from("order_items")
        .select("id, order_id, title, qty, unit_price, variant_label, product_id, seller_id")
        .in("order_id", orderIds);
      for (const it of items ?? []) {
        (itemsByOrder[it.order_id] ||= []).push(it);
      }
    }
    return { orders: (orders ?? []).map((o: any) => ({ ...o, items: itemsByOrder[o.id] ?? [] })) };
  });

export const listMyReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("reviews")
      .select("id, rating, comment, seller_reply, created_at, product_id, products(title)")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { reviews: data ?? [] };
  });

export const createReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { product_id: string; rating: number; comment?: string }) =>
    z.object({
      product_id: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(2000).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prod } = await supabase.from("products").select("seller_id").eq("id", data.product_id).maybeSingle();
    if (!prod) throw new Error("Produto não encontrado");
    const { error } = await supabase.from("reviews").upsert({
      product_id: data.product_id,
      buyer_id: userId,
      seller_id: prod.seller_id,
      rating: data.rating,
      comment: data.comment ?? null,
    }, { onConflict: "product_id,buyer_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyAddresses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { addresses: data ?? [] };
  });

const addressSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().max(60).optional().nullable(),
  recipient: z.string().min(1).max(120),
  phone: z.string().max(30).optional().nullable(),
  zip: z.string().min(5).max(15),
  street: z.string().min(1).max(200),
  number: z.string().max(20).optional().nullable(),
  complement: z.string().max(120).optional().nullable(),
  district: z.string().max(120).optional().nullable(),
  city: z.string().min(1).max(120),
  state: z.string().min(2).max(2),
  is_default: z.boolean().optional(),
});

export const upsertAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => addressSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload: any = { ...data, user_id: userId };
    if (payload.is_default) {
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
    }
    if (payload.id) {
      const { error } = await supabase.from("addresses").update(payload).eq("id", payload.id).eq("user_id", userId);
      if (error) throw new Error(error.message);
    } else {
      delete payload.id;
      const { error } = await supabase.from("addresses").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("addresses").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { full_name?: string; avatar_url?: string }) =>
    z.object({
      full_name: z.string().min(1).max(120).optional(),
      avatar_url: z.string().url().max(500).optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("profiles").update(data).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
