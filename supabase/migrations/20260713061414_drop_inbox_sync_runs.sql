-- Email webhook events are the single operational log for inbound email.
-- The IMAP reader still imports messages, but no longer records per-run rows.
DROP TABLE IF EXISTS public.inbox_sync_runs;
