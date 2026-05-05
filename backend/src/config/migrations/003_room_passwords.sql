ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS room_password_hash TEXT;
