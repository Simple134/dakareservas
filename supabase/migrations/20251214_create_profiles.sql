-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  role text default 'client' check (role in ('admin', 'client', 'employee')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone" 
on public.profiles for select using (true);

create policy "Users can update own profile" 
on public.profiles for update using (auth.uid() = id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Create profile
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );

  -- Link to existing persona_fisica if email matches
  update public.persona_fisica 
  set user_id = new.id 
  where email = new.email;

  -- Link to existing persona_juridica if email matches
  update public.persona_juridica 
  set user_id = new.id 
  where email = new.email;

  return new;
end;
$$ language plpgsql security definer;

-- Recreate trigger (drop first to avoid conflicts)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Add user_id column to existing persona tables if not exists
do $$
begin
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'persona_fisica' and column_name = 'user_id') then
        alter table public.persona_fisica add column user_id uuid references public.profiles(id);
    end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'persona_juridica' and column_name = 'user_id') then
        alter table public.persona_juridica add column user_id uuid references public.profiles(id);
    end if;
end $$;
