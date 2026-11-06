-- Read-only migration export. Download the complete JSON value; keep private.
SELECT jsonb_build_object(
'format','abencoada-migration-v1',
'exportedAt',now(),
'users',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'email',email)),'[]'::jsonb) FROM auth.users),
'tables',jsonb_build_object(
'private.diesel_devices', (SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM private.diesel_devices t),
'private.diesel_occurrence_photos', (SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM private.diesel_occurrence_photos t),
'private.login_attempts', (SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM private.login_attempts t),
'private.record_control_audit', (SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM private.record_control_audit t),
'private.removed_members', (SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM private.removed_members t),
'private.user_access_audit', (SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM private.user_access_audit t),
'public.diesel_checklist_templates', (SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.diesel_checklist_templates t),
'public.diesel_checklists', (SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.diesel_checklists t),
'public.diesel_locations', (SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.diesel_locations t),
'public.diesel_materials', (SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.diesel_materials t),
'public.diesel_operations', (SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.diesel_operations t),
'public.fleets', (SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.fleets t),
'public.members', (SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.members t),
'public.records', (SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.records t),
'public.settings', (SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.settings t)
)) AS backup;
