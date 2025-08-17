ALTER TABLE capsules ADD COLUMN to_rent boolean NOT NULL DEFAULT true;
CREATE INDEX idx_capsules_to_rent ON capsules(to_rent);