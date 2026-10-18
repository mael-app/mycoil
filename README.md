# mycoil

Mobile-first coil change tracking built with SvelteKit.

## Development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` with your Supabase project URL and publishable key. Without Supabase credentials, the app falls back to browser persistence. With an authenticated user, plans and history sync across devices.

Run `supabase/schema.sql` in the Supabase SQL editor before connecting a project.

## Commit convention

Use [Conventional Commits](https://www.conventionalcommits.org/) for every commit, for example `feat: add coil history` or `fix: recalculate next change`.
