-- Add customer info and product fields to pqr_cases
-- Run this in your Supabase SQL Editor

ALTER TABLE pqr_cases ADD COLUMN IF NOT EXISTS customer_name TEXT DEFAULT '';
ALTER TABLE pqr_cases ADD COLUMN IF NOT EXISTS customer_email TEXT DEFAULT '';
ALTER TABLE pqr_cases ADD COLUMN IF NOT EXISTS customer_phone TEXT DEFAULT '';
ALTER TABLE pqr_cases ADD COLUMN IF NOT EXISTS products_involved TEXT DEFAULT '';
