-- Apply this in the Supabase SQL editor after Django migrations have created the tables.
-- Do not put it in a Django migration: local Postgres has no auth.uid() or realtime schema.
--
-- Django connects as the table owner and bypasses row level security.
-- Authenticated and anon roles get no write policies, so the Data API cannot insert,
-- update, or delete chat rows. Realtime clients may only SELECT broadcast rows for
-- rooms they still belong to.

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_invites enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.message_reactions enable row level security;
alter table public.typing_state enable row level security;

-- Private Realtime broadcast. The client subscribes to room:{room_id}.
alter table realtime.messages enable row level security;

drop policy if exists "members can receive room broadcasts" on realtime.messages;
create policy "members can receive room broadcasts"
on realtime.messages
for select
to authenticated
using (
  realtime.topic() like 'room:%'
  and exists (
    select 1
    from public.room_members as member
    join public.rooms as room on room.id = member.room_id
    where member.user_id = auth.uid()
      and room.deleted_at is null
      and ('room:' || room.id::text) = realtime.topic()
  )
);
