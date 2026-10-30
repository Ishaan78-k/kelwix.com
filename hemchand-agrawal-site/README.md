# Hemchand Agrawal Saree Atelier

Static site + Supabase (database, image storage, owner login). No build step.

## Setup (10 minutes)
1. Create a project at supabase.com.
2. SQL Editor > paste `supabase/schema.sql` > Run.
3. Authentication > Providers > Email: **turn OFF "Allow new users to sign up"**.
4. Authentication > Users > Add user (email + strong password, auto-confirm).
5. SQL Editor, run (use that email):
   `insert into public.owners (user_id) select id from auth.users where email = 'owner@example.com';`
6. Project Settings > API: copy Project URL and anon key into `config.js`.
7. Rename `owner.html` to something unguessable (e.g. `owner-x7k2.html`). Do not link it anywhere.
8. Run locally: `npx serve .` then open http://localhost:3000 and /owner.html.
9. Deploy the folder to Netlify, Vercel or Cloudflare Pages.

## Security model
- Row Level Security: everyone can read posts; only users listed in `owners` can insert, update or delete posts and images.
- Even if someone signs up or finds the page, the database rejects their writes.
- Sessions auto-expire after 20 min idle. Keep the service_role key out of this folder (never use it here).
