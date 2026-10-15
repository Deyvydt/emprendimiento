-- Ejecuta este archivo completo en Supabase → SQL Editor → New query → Run.
-- Crea 2 tablas y una vista de métricas para el experimento del MVP (E6).

-- 1) Interesados: quienes dejaron su correo UTEC
create table if not exists public.leads (
  id          bigint generated always as identity primary key,
  email       text not null unique check (email ~* '^[a-z0-9._%+-]+@utec\.edu\.pe$'),
  course      text check (char_length(course) <= 80),
  source      text check (char_length(source) <= 40),   -- 'modal' o 'final'
  ref         text check (char_length(ref) <= 40),      -- canal: ?ref=whatsapp, ?ref=instagram…
  session_id  text check (char_length(session_id) <= 64),
  created_at  timestamptz not null default now()
);

-- 2) Eventos: visitas y clics (para calcular la tasa de conversión)
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  type        text not null check (type in ('visit', 'cta_click', 'demo_toggle', 'calc_use', 'share')),
  source      text check (char_length(source) <= 40),   -- qué botón: 'hero', 'nav', 'calculadora'…
  ref         text check (char_length(ref) <= 40),
  session_id  text check (char_length(session_id) <= 64),
  created_at  timestamptz not null default now()
);

-- 3) Seguridad (RLS): el público solo puede INSERTAR, nunca leer los correos.
alter table public.leads  enable row level security;
alter table public.events enable row level security;

drop policy if exists "public can insert leads"  on public.leads;
drop policy if exists "public can insert events" on public.events;
create policy "public can insert leads"  on public.leads  for insert to anon with check (true);
create policy "public can insert events" on public.events for insert to anon with check (true);

-- 4) Métricas del experimento (solo visibles para ti en el panel de Supabase)
create or replace view public.metrics with (security_invoker = true) as
select
  (select count(distinct session_id) from public.events where type = 'visit')     as visitantes,
  (select count(distinct session_id) from public.events where type = 'cta_click') as clic_quiero_esto,
  (select count(*) from public.leads)                                              as correos_utec,
  round(100.0 * (select count(distinct session_id) from public.events where type = 'cta_click')
        / nullif((select count(distinct session_id) from public.events where type = 'visit'), 0), 1) as pct_clic,
  round(100.0 * (select count(*) from public.leads)
        / nullif((select count(distinct session_id) from public.events where type = 'visit'), 0), 1) as pct_conversion;

revoke all on public.metrics from anon, authenticated;
