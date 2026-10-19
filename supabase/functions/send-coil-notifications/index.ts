import * as webpush from 'jsr:@negrel/webpush@^0.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
const vapidSubject = Deno.env.get('VAPID_SUBJECT')!;
const vapidKeys = await webpush.importVapidKeys(JSON.parse(Deno.env.get('VAPID_KEYS_JSON')!));
const cronSecret = Deno.env.get('CRON_SECRET');
const applicationServer = await webpush.ApplicationServer.new({
  contactInformation: vapidSubject,
  vapidKeys
});

Deno.serve(async (request) => {
  if (cronSecret && request.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const now = new Date().toISOString();
  const { data: settings, error: settingsError } = await supabase
    .from('coil_settings')
    .select('user_id, next_change_at, last_notified_at')
    .gt('coil_count', 0)
    .lte('next_change_at', now);

  if (settingsError) return Response.json({ error: settingsError.message }, { status: 500 });

  let sent = 0;
  for (const setting of settings ?? []) {
    if (setting.last_notified_at && new Date(setting.last_notified_at) >= new Date(setting.next_change_at)) continue;

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', setting.user_id);

    let delivered = false;
    for (const subscription of subscriptions ?? []) {
      try {
        const subscriber = applicationServer.subscribe({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth }
        });
        await subscriber.pushTextMessage(JSON.stringify({
          title: 'Time for a fresh coil',
          body: 'Your current coil has reached its rhythm. Swap it when you are ready.',
          url: '/',
          tag: `coil-change-${setting.user_id}`
        }), { ttl: 3600, urgency: webpush.Urgency.High, topic: `coil-${setting.user_id}` });
        delivered = true;
        sent += 1;
      } catch (error) {
        if (error instanceof webpush.PushMessageError && error.isGone()) {
          await supabase.from('push_subscriptions').delete().eq('id', subscription.id);
        }
      }
    }

    if (delivered) {
      await supabase.from('coil_settings').update({ last_notified_at: now }).eq('user_id', setting.user_id);
    }
  }

  return Response.json({ sent });
});
