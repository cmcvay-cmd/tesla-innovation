-- Optional image URL (or small data URL) on chat messages.

alter table messages add column if not exists image text;
