
## 19. Supabase Migration SQL

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles Table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  role TEXT CHECK (role IN ('admin', 'cashier', 'customer')) DEFAULT 'customer',
  membership_level TEXT CHECK (membership_level IN ('member_baru', 'member_setia', 'vip')) DEFAULT 'member_baru',
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL DEFAULT 0,
  birth_date DATE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories Table
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menus Table
CREATE TABLE menus (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL NOT NULL,
  image_url TEXT,
  is_best_seller BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  total_sold INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tables Table
CREATE TABLE tables (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_number TEXT UNIQUE NOT NULL,
  capacity INTEGER DEFAULT 4,
  status TEXT CHECK (status IN ('available', 'occupied', 'waiting_payment', 'waiting_takeaway', 'cleaning', 'reserved', 'disabled')) DEFAULT 'available',
  qr_code_url TEXT,
  current_session_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table QR Codes
CREATE TABLE table_qr_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
  qr_code_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table Sessions
CREATE TABLE table_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES profiles(id),
  check_in TIMESTAMPTZ DEFAULT NOW(),
  check_out TIMESTAMPTZ,
  total_amount DECIMAL DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders Table
CREATE TABLE orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES profiles(id),
  cashier_id UUID REFERENCES profiles(id),
  customer_name TEXT,        -- Nama pemesan untuk guest (tidak login)
  customer_phone TEXT,       -- No. WhatsApp pemesan untuk guest
  table_number TEXT,
  order_type TEXT CHECK (order_type IN ('dine_in', 'takeaway_waiting', 'takeaway_pickup')) DEFAULT 'dine_in',
  status TEXT CHECK (status IN ('pending', 'processing', 'ready', 'completed', 'cancelled')) DEFAULT 'pending',
  total_amount DECIMAL NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_id UUID REFERENCES menus(id),
  quantity INTEGER NOT NULL,
  price DECIMAL NOT NULL,
  subtotal DECIMAL NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments Table
CREATE TABLE payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  amount DECIMAL NOT NULL,
  method TEXT CHECK (method IN ('cash', 'qris')) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
  proof_url TEXT,
  validated_by UUID REFERENCES profiles(id),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vouchers Table
CREATE TABLE vouchers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('percentage', 'fixed', 'free_shipping')) NOT NULL,
  value DECIMAL NOT NULL,
  min_purchase DECIMAL DEFAULT 0,
  max_discount DECIMAL,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  customer_id UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promotions Table
CREATE TABLE promotions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  discount_percentage DECIMAL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT,
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities Table
CREATE TABLE activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  description TEXT NOT NULL,
  type TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cashier Closing Table
CREATE TABLE cashier_closing (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cashier_id UUID REFERENCES profiles(id),
  opening_balance DECIMAL DEFAULT 0,
  closing_balance DECIMAL DEFAULT 0,
  cash_transactions INTEGER DEFAULT 0,
  qris_transactions INTEGER DEFAULT 0,
  total_revenue DECIMAL DEFAULT 0,
  discrepancy DECIMAL DEFAULT 0,
  notes TEXT,
  closed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Website Settings Table
CREATE TABLE website_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  restaurant_name TEXT DEFAULT 'Waroeng RCM Kang Abuy',
  tagline TEXT DEFAULT 'Makanan Enak, Harga Ekonomis, Solusi Ketika Laper & Mageer',
  logo_url TEXT,
  favicon_url TEXT,
  address TEXT,
  whatsapp_number TEXT,
  email TEXT,
  operating_hours TEXT,
  google_maps_url TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,
  facebook_url TEXT,
  youtube_url TEXT,
  gofood_url TEXT,
  grabfood_url TEXT,
  qris_image_url TEXT,
  primary_color TEXT DEFAULT '#f97316',
  secondary_color TEXT DEFAULT '#ef4444',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Website Banners Table
CREATE TABLE website_banners (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT,
  subtitle TEXT,
  image_url TEXT,
  link_url TEXT,
  button_text TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Website Gallery Table
CREATE TABLE website_gallery (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT,
  image_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Website Testimonials Table
CREATE TABLE website_testimonials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_photo_url TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);
CREATE POLICY "Only admins can insert categories" ON categories FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Only admins can update categories" ON categories FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Menus are viewable by everyone" ON menus FOR SELECT USING (true);
CREATE POLICY "Only admins can modify menus" ON menus FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'cashier')));

CREATE POLICY "Tables are viewable by authenticated users" ON tables FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Only staff can modify tables" ON tables FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'cashier')));

CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = cashier_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Cashiers and admins can create orders" ON orders FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'cashier')));

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE tables;
ALTER PUBLICATION supabase_realtime ADD TABLE table_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE activities;

-- Create indexes
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_cashier ON orders(cashier_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_activities_user ON activities(user_id);
CREATE INDEX idx_menus_category ON menus(category_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Insert default website settings
INSERT INTO website_settings (restaurant_name, tagline) 
VALUES ('Waroeng RCM Kang Abuy', 'Makanan Enak, Harga Ekonomis, Solusi Ketika Laper & Mageer');

-- Create storage buckets
-- Run these in Supabase dashboard:
-- 1. Create bucket: website-assets
-- 2. Create bucket: menu-images
-- 3. Create bucket: qr-codes
-- 4. Create bucket: payment-proofs