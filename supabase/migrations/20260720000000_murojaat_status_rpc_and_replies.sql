begin;

-- Add admin_reply column to reception_requests and contact_messages if not exists
alter table public.reception_requests add column if not exists admin_reply text;
alter table public.contact_messages add column if not exists admin_reply text;

-- Create secure RPC function for looking up murojaat status and admin replies safely
create or replace function public.get_murojaat_status(p_code text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_rec record;
begin
  p_code := trim(p_code);
  
  if p_code = '' then
    return jsonb_build_object('found', false);
  end if;

  -- 1. Search reception_requests by request_number or ID
  select 'VR' as msg_type, request_number as code, full_name, subject, status, created_at, admin_reply
  into v_rec
  from public.reception_requests
  where lower(request_number) = lower(p_code) or id::text = p_code
  limit 1;

  if found then
    return jsonb_build_object(
      'found', true,
      'code', v_rec.code,
      'type_label', 'Virtual Qabulxona Murojaati',
      'full_name', v_rec.full_name,
      'subject', v_rec.subject,
      'created_at', v_rec.created_at,
      'status', coalesce(v_rec.status, 'new'),
      'admin_reply', v_rec.admin_reply
    );
  end if;

  -- 2. Search contact_messages by ID or MSG- formatted code
  select 'MSG' as msg_type, ('MSG-2026-' || upper(left(id::text, 6))) as code, full_name, subject, status, created_at, admin_reply
  into v_rec
  from public.contact_messages
  where lower(id::text) = lower(p_code)
     or lower('MSG-2026-' || left(id::text, 6)) = lower(p_code)
     or lower('MSG-2026-' || left(id::text, 8)) = lower(p_code)
  limit 1;

  if found then
    return jsonb_build_object(
      'found', true,
      'code', v_rec.code,
      'type_label', 'Bog''lanish Xabari',
      'full_name', v_rec.full_name,
      'subject', coalesce(v_rec.subject, 'Murojaat'),
      'created_at', v_rec.created_at,
      'status', coalesce(v_rec.status, 'new'),
      'admin_reply', v_rec.admin_reply
    );
  end if;

  return jsonb_build_object('found', false);
end;
$$;

-- Grant execution to anon and authenticated
grant execute on function public.get_murojaat_status(text) to anon, authenticated;

commit;
