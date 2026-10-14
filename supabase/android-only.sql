-- Apply after trial-recorder-readings.sql. Preserve history and native submission paths.
begin;
revoke execute on function public.diesel_field_submit(jsonb),public.diesel_submit(jsonb) from public,anon,authenticated;
notify pgrst, 'reload schema';
commit;
