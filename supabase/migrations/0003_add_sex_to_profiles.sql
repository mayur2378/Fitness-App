alter table public.profiles
  add column sex text not null check (sex in ('male', 'female')) default 'male';

alter table public.profiles
  alter column sex drop default;
