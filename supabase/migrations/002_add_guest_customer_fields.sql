-- Migration: Add customer_name and customer_phone to orders table
-- Purpose: Menyimpan nama & nomor HP pemesan yang tidak login (guest)
-- Date: 2026-06-12

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Index untuk pencarian by nama pelanggan
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);

-- Comment
COMMENT ON COLUMN orders.customer_name IS 'Nama pemesan untuk guest (tidak login). Jika customer_id ada, prioritaskan dari profiles.';
COMMENT ON COLUMN orders.customer_phone IS 'No. WhatsApp pemesan untuk guest. Berguna untuk konfirmasi pesanan.';
