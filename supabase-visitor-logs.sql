
-- Same visitor_logs structure used for the three domain sites.
-- Run only if the table/policies do not already exist in your Supabase project.
create table if not exists public.visitor_logs (
  id uuid primary key default gen_random_uuid(),
  site text not null check (site in ('classyheels.com','mughlaifood.com','odinship.com')),
  visitor_type text not null check (visitor_type in ('human','bot')),
  city text,
  country text,
  country_code text,
  visited_at timestamptz not null default now(),
  user_agent text,
  referrer text
);

alter table public.visitor_logs enable row level security;

grant insert on public.visitor_logs to anon, authenticated;

drop policy if exists visitor_logs_insert_public on public.visitor_logs;
create policy visitor_logs_insert_public
on public.visitor_logs
for insert
to anon, authenticated
with check (site in ('classyheels.com','mughlaifood.com','odinship.com'));

create index if not exists visitor_logs_site_visited_at_idx
on public.visitor_logs(site, visited_at desc);

create index if not exists visitor_logs_type_idx
on public.visitor_logs(visitor_type);
