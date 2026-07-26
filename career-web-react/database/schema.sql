-- Career App relational schema for Supabase/PostgreSQL.
-- This mirrors the local PGlite structure and adds foreign keys for production.

create table if not exists public.users (
  id text primary key,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  username text not null unique,
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  role_type text not null default 'candidate',
  avatar_data_url text not null default '',
  profile_json jsonb not null default '{}',
  subscription_json jsonb not null default '{}'
);

create table if not exists public.user_accounts (
  user_id text primary key references public.users(id) on delete cascade,
  account_type text not null,
  phone text not null default '',
  city text not null default '',
  country text not null default '',
  onboarding_completed boolean not null default false,
  avatar_data_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_candidate_profiles (
  user_id text primary key references public.users(id) on delete cascade,
  current_title text not null default '',
  target_role text not null default '',
  experience_years integer not null default 0,
  school_name text not null default '',
  study_level text not null default '',
  graduation_year integer,
  contract_preference text not null default '',
  availability text not null default '',
  portfolio_url text not null default '',
  linkedin_url text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.user_recruiter_profiles (
  user_id text primary key references public.users(id) on delete cascade,
  organization_name text not null default '',
  recruiter_role text not null default '',
  hiring_volume text not null default '',
  industry text not null default '',
  website text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.user_org_profiles (
  user_id text primary key references public.users(id) on delete cascade,
  organization_name text not null default '',
  organization_type text not null default '',
  department text not null default '',
  website text not null default '',
  size_range text not null default '',
  industry text not null default '',
  contact_role text not null default '',
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  token text primary key,
  user_id text not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.email_verification_codes (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  email text not null,
  code_hash text not null,
  code_salt text not null,
  purpose text not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cvs (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  file_name text not null,
  source_text text not null,
  parsed_json jsonb not null default '{}'
);

create table if not exists public.offers (
  id text primary key,
  company text not null,
  title text not null,
  location text not null,
  contract text not null,
  premium boolean not null default false,
  sector text not null,
  experience_min integer not null default 0,
  education text not null default '',
  skills_json jsonb not null default '[]',
  missions_json jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_runs (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  cv_id text references public.cvs(id) on delete set null,
  created_at timestamptz not null default now(),
  payload_json jsonb not null default '{}'
);

create index if not exists idx_users_username on public.users(username);
create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_codes_user_purpose on public.email_verification_codes(user_id, purpose, created_at desc);
create index if not exists idx_cvs_user_id on public.cvs(user_id);
create index if not exists idx_matches_user_id on public.match_runs(user_id, created_at desc);
create index if not exists idx_offers_sector on public.offers(sector);
