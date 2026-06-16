import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/hooks/ad-scheduler')({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const now = new Date().toISOString();

        // Activate scheduled campaigns whose start time has arrived
        const { data: activatedStandard, error: actErr } = await supabaseAdmin
          .from('ad_campaigns')
          .update({ status: 'active' })
          .eq('status', 'scheduled')
          .neq('placement', 'carousel')
          .lte('starts_at', now)
          .gt('ends_at', now)
          .select('id');

        const { data: activatedPremium, error: premiumActErr } = await supabaseAdmin
          .from('ad_campaigns')
          .update({ status: 'active' })
          .eq('status', 'scheduled')
          .eq('placement', 'carousel')
          .contains('metadata', { admin_status: 'approved' })
          .lte('starts_at', now)
          .gt('ends_at', now)
          .select('id');

        if (actErr || premiumActErr) {
          return new Response(JSON.stringify({ error: actErr?.message ?? premiumActErr?.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // End campaigns whose end time has passed
        const { data: ended, error: endErr } = await supabaseAdmin
          .from('ad_campaigns')
          .update({ status: 'ended' })
          .in('status', ['active', 'scheduled'])
          .lte('ends_at', now)
          .select('id');

        if (endErr) {
          return new Response(JSON.stringify({ error: endErr.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            activated: (activatedStandard?.length ?? 0) + (activatedPremium?.length ?? 0),
            ended: ended?.length ?? 0,
            timestamp: now,
          }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      },
    },
  },
});
