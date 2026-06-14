import { createServerFn } from "@tanstack/react-start";
import Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Checkout de anúncios patrocinados.
 * IMPORTANTE: NÃO usa Stripe Connect (sem transfer_data / application_fee_amount).
 * O valor é recebido integralmente pela plataforma.
 */
export const createAdsCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      origin: string;
      packageName: string;
      amountCents: number;
      productId?: string;
    }) => {
      if (!input.packageName) throw new Error("packageName obrigatório");
      if (!Number.isInteger(input.amountCents) || input.amountCents < 100) {
        throw new Error("amountCents inválido");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY não configurada");
    const stripe = new Stripe(key);
    const { userId } = context;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: { name: `Anúncio patrocinado — ${data.packageName}` },
            unit_amount: data.amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        kind: "ads",
        user_id: userId,
        package: data.packageName,
        product_id: data.productId ?? "",
      },
      success_url: `${data.origin}/seller?ads=success`,
      cancel_url: `${data.origin}/seller?ads=canceled`,
    });

    return { url: session.url };
  });
