-- Membersihkan tabel-tabel yang sudah tidak terpakai dalam sistem
DROP TABLE IF EXISTS table_qr_codes CASCADE;
DROP TABLE IF EXISTS table_sessions CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS website_banners CASCADE;
DROP TABLE IF EXISTS website_gallery CASCADE;
DROP TABLE IF EXISTS website_testimonials CASCADE;

-- Membersihkan kolom yang sudah tidak terpakai
ALTER TABLE tables DROP COLUMN IF EXISTS current_session_id CASCADE;
