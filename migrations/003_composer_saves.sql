-- Additive metadata for idempotent retries after a lost save response.
ALTER TABLE campaign_drafts ADD COLUMN last_save_id uuid;
ALTER TABLE campaign_drafts ADD COLUMN last_save_hash text;
