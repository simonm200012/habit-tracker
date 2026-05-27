-- Tier 4: quantitative tracking.
-- Habits with a non-empty goal_unit (e.g. "min", "pages", "reps") become
-- quantitative. Their logs can carry a numeric value. Binary habits keep
-- working unchanged (value stays NULL = treated as 1 check-off).

alter table public.habit_logs
  add column if not exists value numeric;

-- Helpful index for trend queries
create index if not exists habit_logs_habit_value_idx
  on public.habit_logs(habit_id, logged_on)
  where value is not null;
