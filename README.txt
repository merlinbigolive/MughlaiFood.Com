MughlaiFood.Com — server-side visitor tracker + private admin API

1. This version requires Node.js hosting (not static-only hosting).
2. Copy .env.example to .env on the server and fill in: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET.
3. NEVER put SUPABASE_SERVICE_ROLE_KEY in config.js or any browser file.
4. Run: npm install
5. Start: npm start
6. Main site: /
7. Private admin: /admin (login is handled server-side).
8. Browser visitors POST to /api/track; the server inserts into public.visitor_logs using the service-role key.
9. Admin data is available only through authenticated /api/admin/* endpoints.
10. The existing supabase-visitor-logs.sql remains the database reference.
