-- TeamAI Database Schema (Supabase/Postgres)

-- Users are managed by Supabase Auth (auth.users)

-- Profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  bio text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Teams (custom user-created teams)
create table if not exists teams (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  emoji text,
  tagline text,
  color text,
  bots jsonb not null default '[]',
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Projects
create table if not exists projects (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  team_id text,
  team_name text,
  team_emoji text,
  title text,
  idea text,
  results jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Conversations
create table if not exists conversations (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  team_id text,
  title text,
  messages jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Agent configs
create table if not exists agent_configs (
  agent_id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text,
  role text,
  collaborate text,
  solo text,
  enabled boolean default true,
  updated_at timestamptz default now()
);

-- Execution logs
create table if not exists execution_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  conversation_id text,
  agent_id text,
  status text,
  output text,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table teams enable row level security;
alter table projects enable row level security;
alter table conversations enable row level security;
alter table agent_configs enable row level security;
alter table execution_logs enable row level security;

-- Policies: users can only access their own data
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

create policy "Users can CRUD own teams" on teams for all using (auth.uid() = user_id);
create policy "Users can CRUD own projects" on projects for all using (auth.uid() = user_id);
create policy "Users can CRUD own conversations" on conversations for all using (auth.uid() = user_id);
create policy "Users can CRUD own agent configs" on agent_configs for all using (auth.uid() = user_id);
create policy "Users can view own execution logs" on execution_logs for select using (auth.uid() = user_id);
create policy "Users can insert own execution logs" on execution_logs for insert with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();