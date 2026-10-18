# mycoil

Mobile-first coil change tracking built with SvelteKit.

## Development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` when Supabase credentials are available. The current app works locally with browser persistence.

Run `supabase/schema.sql` in the Supabase SQL editor before connecting a project.

## Commit convention

Use [Conventional Commits](https://www.conventionalcommits.org/) for every commit, for example `feat: add coil history` or `fix: recalculate next change`.
