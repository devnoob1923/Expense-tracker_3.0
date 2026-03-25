create or replace function public.get_dashboard_stats(
    p_user_id uuid,
    p_range_start date default null
)
returns table (
    total_spent numeric,
    today_spent numeric,
    transaction_count bigint,
    processed_email_count bigint,
    top_category text
)
language sql
security definer
set search_path = public
as $$
with filtered_transactions as (
    select amount, category, date
    from public.transactions
    where user_id = p_user_id
      and (p_range_start is null or date >= p_range_start)
),
processed_email_totals as (
    select count(*)::bigint as processed_email_count
    from public.processed_emails
    where user_id = p_user_id
      and (
        p_range_start is null
        or processed_at >= (p_range_start::timestamp at time zone 'UTC')
      )
),
top_category_row as (
    select category
    from filtered_transactions
    group by category
    order by count(*) desc, category asc
    limit 1
)
select
    coalesce((select sum(amount) from filtered_transactions), 0) as total_spent,
    coalesce((select sum(amount) from filtered_transactions where date = current_date), 0) as today_spent,
    (select count(*)::bigint from filtered_transactions) as transaction_count,
    coalesce((select processed_email_count from processed_email_totals), 0) as processed_email_count,
    coalesce((select category from top_category_row), 'None') as top_category;
$$;

revoke all on function public.get_dashboard_stats(uuid, date) from public;
grant execute on function public.get_dashboard_stats(uuid, date) to service_role;
