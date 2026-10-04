# Admin v2 setup (do in this order)

1. Supabase → SQL Editor: run `supabase_admin_v2.sql` (after supabase_payments.sql).
   First put BOTH founders' real login emails in section 6 (they must have signed up once).
2. Resend: create an account, verify a domain you own (so mail can go to other people), make an API key.
3. Supabase → Edge Functions → Secrets:
   RESEND_API_KEY, OWNER_EMAILS (a@x.com,b@y.com), FROM_EMAIL ("ReviewRadar <payments@yourdomain>"),
   APP_URL (your Vercel URL), CRON_SECRET (long random string, only for the reminder job)
4. Redeploy `notify-payment` (JWT verify ON). Deploy `expiry-reminders` with JWT verify OFF.
5. Database → Extensions: enable pg_cron and pg_net. Then un-comment and run the cron block at the bottom of
   supabase_admin_v2.sql with your project ref and the same CRON_SECRET.
6. Upload the new code to GitHub (Vercel redeploys).
7. Each founder opens /admin, sets up the authenticator app once, then signs in with password + 6-digit code.

IMPORTANT: until step 7 is done, /admin is locked for everyone (the server now requires the second step).
Test with a test customer: UPI request, cash request, approve each, give a grace period, check the log.

Extra function (customer emails on approve/reject): deploy `notify-decision` (JWT verify ON). It uses the same
secrets: RESEND_API_KEY, FROM_EMAIL, APP_URL.
