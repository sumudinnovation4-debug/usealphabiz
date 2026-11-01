# UseAlphaBiz: go live from your phone

Do Part A first. Your site will work in demo mode (no payments, no real domains) so you can see everything. Then do Part B to switch on the real services.

## Part A. Put the site online

### 1. GitHub
1. Sign in at github.com. Tap the + icon, New repository. Name it `usealphabiz`, choose Private, tick "Add a README file", Create repository.
2. In the repo tap Add file, Upload files. Choose `useAlphaBiz.zip` from your phone. Wait for it to finish, then tap Commit changes.
3. Tap Add file, Create new file. In the name box type exactly `.github/workflows/unzip.yml` and paste this:

```
name: Unzip
on: workflow_dispatch
permissions:
  contents: write
jobs:
  unzip:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          unzip -oq useAlphaBiz.zip
          rm useAlphaBiz.zip
          git config user.name "bot"
          git config user.email "bot@users.noreply.github.com"
          git add -A
          git commit -m "Unzip project"
          git push
```
Tap Commit changes.
4. Tap the Actions tab. If asked, tap "I understand my workflows, enable them". Tap Unzip on the left, Run workflow, Run workflow. Wait about 30 seconds for the green tick.
5. Go back to Code. You should now see all the project files (index.html, api, worker, tpl-*.html and more).

### 2. Vercel
1. Go to vercel.com, Sign up, Continue with GitHub.
2. Add New, Project. Import `usealphabiz`.
3. Framework Preset: Other. Leave everything else empty. Tap Deploy.
4. When it finishes, tap the preview image to open your site. Try the whole flow in demo mode.
Vercel will count 7 functions in the `api` folder. The free limit is 12.

To change any file later: open it on GitHub, tap the pencil icon, edit, Commit changes. Vercel updates by itself.

## Part B. Switch on the real services

### 3. Domain for the main site
Buy `usealphabiz.com` at Cloudflare (dash.cloudflare.com, Domain Registration). In Vercel, Settings, Domains, add it and follow the two DNS records Vercel shows.

### 4. Supabase (accounts and database)
1. supabase.com, New project.
2. SQL Editor, paste everything from `supabase.sql`, Run.
3. Project Settings, API: copy the Project URL, the anon key and the service_role key (keep this one secret).
4. Authentication, URL Configuration: Site URL `https://usealphabiz.com`. Add the redirect URL `https://usealphabiz.com/reset`.

### 5. Cloudflare (customer domains and sites)
1. Add a card under Billing. Under Domain Registration set your default contact details.
2. Copy your Account ID from the dashboard home.
3. My Profile, API Tokens, Create Custom Token. Give it access to Registrar, Zone, DNS and Workers Scripts for your account. Copy the token.
4. On GitHub, open `wrangler.toml`, edit it, and fill in your Supabase URL and anon key.
5. Cloudflare, Workers & Pages, Create, Import a repository, choose `usealphabiz`. Keep the name `alphabiz-sites`. Deploy.

### 6. Paystack
1. paystack.com, create the account and complete business verification.
2. Settings, API Keys: copy the public and secret keys.
3. Settings, API Keys & Webhooks: set the webhook URL to `https://usealphabiz.com/api/paystack-webhook`.
4. For dollar payments from abroad, ask Paystack support to enable USD, then set `PAYSTACK_USD:true` in `app.js`.

### 7. Add the keys
In Vercel, Settings, Environment Variables, add these, then Redeploy:
`SUPABASE_URL`, `SUPABASE_ANON`, `SUPABASE_SERVICE_KEY`, `CF_ACCOUNT_ID`, `CF_API_TOKEN`, `CF_WORKER_NAME` (alphabiz-sites), `PAYSTACK_SECRET`, `ADMIN_EMAILS` (your email), `CRON_SECRET` (any long random text).

On GitHub, edit `app.js` and fill in `SUPABASE_URL`, `SUPABASE_ANON` and `PAYSTACK_PK` (the Paystack public key). Commit.

### 8. Test
1. Use your Paystack test keys first.
2. Sign up on your site with the email you put in `ADMIN_EMAILS`, then open `/admin`.
3. Registering a domain charges your Cloudflare card for real, so do one test with one cheap domain.

## Notes
- Stripe is switched off (`STRIPE:false`) because Stripe does not open accounts for Nigerian companies.
- `.ng` and `.com.ng` domains are not sold automatically.
- Templates are free and MIT licensed (Start Bootstrap and 8B). Credits are in `legal.html`, in each site footer and in `LICENSES.txt`. Their demo photos load from Unsplash, so customers should upload their own.
