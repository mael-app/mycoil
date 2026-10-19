# mycoil

Mobile-first coil change tracking built with SvelteKit.

## Development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` with your Supabase project URL and publishable key. Without Supabase credentials, the app falls back to browser persistence. With an authenticated user, plans and history sync across devices.

Run `supabase/schema.sql` in the Supabase SQL editor before connecting a project.

## Push notifications

Apply `supabase/migrations/20261020000000_web_push.sql`, generate VAPID keys with the `@negrel/webpush` generator, and set `PUBLIC_VAPID_PUBLIC_KEY` in Vercel. Deploy `send-coil-notifications` with `VAPID_KEYS_JSON`, `VAPID_SUBJECT`, and `CRON_SECRET` secrets, then run `supabase/notifications.sql` after storing `project_url` and `cron_secret` in Supabase Vault.

## Commit convention

Use [Conventional Commits](https://www.conventionalcommits.org/) for every commit, for example `feat: add coil history` or `fix: recalculate next change`.
