create table if not exists public.sync_cooldowns (
    user_id uuid primary key,
    last_synced_at timestamptz not null default now()
);

create or replace function public.claim_sync_cooldown(
    p_user_id uuid,
    p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    current_last_synced_at timestamptz;
begin
    select last_synced_at
    into current_last_synced_at
    from public.sync_cooldowns
    where user_id = p_user_id
    for update;

    if current_last_synced_at is null then
        insert into public.sync_cooldowns(user_id, last_synced_at)
        values (p_user_id, now());
        return true;
    end if;

    if current_last_synced_at > now() - make_interval(secs => p_window_seconds) then
        return false;
    end if;

    update public.sync_cooldowns
    set last_synced_at = now()
    where user_id = p_user_id;

    return true;
end;
$$;

revoke all on table public.sync_cooldowns from public;
revoke all on function public.claim_sync_cooldown(uuid, integer) from public;
grant execute on function public.claim_sync_cooldown(uuid, integer) to service_role;
