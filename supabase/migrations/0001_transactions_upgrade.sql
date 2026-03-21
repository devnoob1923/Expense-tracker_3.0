alter table public.transactions
alter column transaction_id set default gen_random_uuid();

alter table public.transactions
add column if not exists currency text default 'INR',
add column if not exists confidence numeric,
add column if not exists status text default 'confirmed',
add column if not exists raw_extraction jsonb;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'transactions_status_check'
    ) then
        alter table public.transactions
        add constraint transactions_status_check
        check (status = any (array['confirmed'::text, 'needs_review'::text]));
    end if;
end $$;

create unique index if not exists processed_emails_user_message_idx
on public.processed_emails(user_id, message_id);

create index if not exists transactions_user_date_idx
on public.transactions(user_id, date desc);
