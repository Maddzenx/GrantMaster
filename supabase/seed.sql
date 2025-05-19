-- Migration: Create grants table if it does not exist
create table if not exists public.grants (
  id text primary key,
  title text,
  description text,
  deadline text, -- ISO date string (YYYY-MM-DD)
  sector text,
  stage text
);

-- Indexes for efficient querying
create index if not exists grants_deadline_idx on public.grants (deadline);
create index if not exists grants_sector_idx on public.grants (sector);
create index if not exists grants_stage_idx on public.grants (stage); 