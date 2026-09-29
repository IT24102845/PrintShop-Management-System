-- =============================================================================
--  PrintShop Management System — Seed Data
-- =============================================================================
--  Purpose  : Populate the database with realistic sample data for
--             development, testing, and demonstrations.
--  Run after: schema.sql
--  WARNING  : DO NOT run in production.
--
--  Passwords (all accounts): PrintShop2026!
--  bcrypt hash (cost 12) of "PrintShop2026!"
-- =============================================================================

BEGIN;

-- ─── USERS ───────────────────────────────────────────────────────────────────
-- 5 users: 1 admin, 1 manager, 2 employees, 2 customers

INSERT INTO users (id, full_name, email, password_hash, role, is_active)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'Admin User',
    'admin@printshop.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewkJOy.XGwKBtBHm',
    'admin',
    TRUE
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Sarah Johnson',
    'sarah.manager@printshop.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewkJOy.XGwKBtBHm',
    'manager',
    TRUE
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Michael Chen',
    'michael.designer@printshop.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewkJOy.XGwKBtBHm',
    'employee',
    TRUE
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'David Osei',
    'david.printer@printshop.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewkJOy.XGwKBtBHm',
    'employee',
    TRUE
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    'Amina Mensah',
    'amina@techstartup.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewkJOy.XGwKBtBHm',
    'customer',
    TRUE
  ),
  (
    '10000000-0000-0000-0000-000000000006',
    'James Kwame',
    'james.kwame@gmail.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewkJOy.XGwKBtBHm',
    'customer',
    TRUE
  );


-- ─── EMPLOYEES ────────────────────────────────────────────────────────────────

INSERT INTO employees (id, user_id, employee_role, hire_date, is_available)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',  -- Sarah Johnson
    'manager',
    '2024-01-15',
    TRUE
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',  -- Michael Chen
    'designer',
    '2024-03-01',
    TRUE
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000004',  -- David Osei
    'printer',
    '2024-06-10',
    TRUE
  );


-- ─── CUSTOMERS ────────────────────────────────────────────────────────────────

INSERT INTO customers (id, user_id, phone, address, company)
VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000005',  -- Amina Mensah
    '+233 24 456 7890',
    '14 Ring Road, Accra, Ghana',
    'TechStartup Ghana Ltd'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000006',  -- James Kwame
    '+233 55 123 4567',
    '7 Independence Ave, Kumasi, Ghana',
    NULL
  );


-- ─── SUPPLIERS ────────────────────────────────────────────────────────────────

INSERT INTO suppliers (id, supplier_name, phone, email, address, contact_person, payment_terms, is_active)
VALUES
  (
    '40000000-0000-0000-0000-000000000001',
    'PaperWorld Ghana',
    '+233 30 222 3344',
    'sales@paperworldghana.com',
    '88 Industrial Area, Accra, Ghana',
    'Kofi Boateng',
    'Net 30',
    TRUE
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    'ColorInk Supplies Ltd',
    '+233 20 111 5678',
    'orders@colorink.com.gh',
    '22 Tema Port Road, Tema, Ghana',
    'Esi Asante',
    'Net 15',
    TRUE
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    'VinylPro Distributors',
    '+233 50 987 6543',
    'info@vinylpro.gh',
    '5 Graphic Road, Accra, Ghana',
    'Kweku Antwi',
    'Cash on Delivery',
    TRUE
  );


-- ─── INVENTORY MATERIALS ─────────────────────────────────────────────────────

INSERT INTO inventory_materials (id, material_name, category, quantity, unit, minimum_stock_level, unit_cost, supplier_id, sku)
VALUES
  (
    '50000000-0000-0000-0000-000000000001',
    'A4 Glossy Paper 200gsm',
    'paper',
    2500.000,
    'sheets',
    500.000,
    0.25,
    '40000000-0000-0000-0000-000000000001',
    'PAP-A4-GL-200'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    'A3 Matte Paper 120gsm',
    'paper',
    1200.000,
    'sheets',
    300.000,
    0.35,
    '40000000-0000-0000-0000-000000000001',
    'PAP-A3-MT-120'
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    'CMYK Ink Set — Epson Compatible',
    'ink',
    18.000,
    'litres',
    5.000,
    45.00,
    '40000000-0000-0000-0000-000000000002',
    'INK-EPSON-CMYK'
  ),
  (
    '50000000-0000-0000-0000-000000000004',
    'Self-Adhesive Vinyl White',
    'vinyl',
    85.500,
    'meters',
    20.000,
    8.50,
    '40000000-0000-0000-0000-000000000003',
    'VNL-ADHV-WHT'
  ),
  (
    '50000000-0000-0000-0000-000000000005',
    'Matte Laminate Film Roll',
    'laminate',
    42.000,
    'meters',
    10.000,
    12.00,
    '40000000-0000-0000-0000-000000000003',
    'LAM-MT-ROLL'
  ),
  (
    '50000000-0000-0000-0000-000000000006',
    'Cotton T-Shirt Blanks (M)',
    'fabric',
    150.000,
    'pieces',
    30.000,
    5.50,
    NULL,
    'FAB-TSH-CTN-M'
  ),
  (
    '50000000-0000-0000-0000-000000000007',
    'Business Card Stock 350gsm',
    'paper',
    80.000,   -- LOW STOCK (below min 100)
    'sheets',
    100.000,
    0.60,
    '40000000-0000-0000-0000-000000000001',
    'PAP-BC-350'
  );


-- ─── ORDERS ───────────────────────────────────────────────────────────────────

INSERT INTO orders (id, customer_id, service_type, description, size, quantity, colour, material, design_file_url, status, deadline_date, special_notes)
VALUES
  (
    '60000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',  -- Amina (TechStartup)
    'business_cards',
    'Premium business cards for executive team. Double-sided, rounded corners.',
    '90mm x 54mm',
    500,
    'Full colour both sides (CMYK)',
    '350gsm Silk Laminated',
    'https://storage.example.com/designs/techstartup-bizcard-v1.pdf',
    'in_production',
    '2026-09-15',
    'Please ensure logo is sharp — previous run had blurring issues.'
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',  -- Amina (TechStartup)
    'banners',
    'Pull-up banner for exhibition stand.',
    '85cm x 200cm',
    2,
    'Full colour',
    'Premium PVC',
    NULL,
    'quoted',
    '2026-09-20',
    'Customer will provide artwork. Banner to include stand hardware.'
  ),
  (
    '60000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000002',  -- James Kwame
    'flyers',
    'Promotional flyers for church event.',
    'A5',
    1000,
    'Full colour one side',
    '120gsm Matte',
    'https://storage.example.com/designs/church-flyer-draft.jpg',
    'delivered',
    '2026-09-01',
    NULL
  );


-- ─── QUOTATIONS ───────────────────────────────────────────────────────────────

INSERT INTO quotations (id, order_id, amount, status, notes, valid_until, revision)
VALUES
  (
    '70000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',  -- Business cards order
    320.00,
    'accepted',
    'Includes setup fee (GH₵ 50), printing (GH₵ 220), and lamination (GH₵ 50).',
    '2026-09-12',
    1
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000002',  -- Banner order
    185.00,
    'sent',
    'Price includes 2 premium PVC banners with retractable stands.',
    '2026-09-18',
    1
  ),
  (
    '70000000-0000-0000-0000-000000000003',
    '60000000-0000-0000-0000-000000000003',  -- Flyers order
    95.00,
    'accepted',
    '1000 A5 flyers, single-sided colour print on 120gsm matte paper.',
    '2026-08-30',
    1
  );


-- ─── DESIGNS ─────────────────────────────────────────────────────────────────

INSERT INTO designs (id, order_id, file_url, approval_status, remarks, version, uploaded_by, approved_by)
VALUES
  (
    '80000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    'https://storage.example.com/designs/techstartup-bizcard-v1.pdf',
    'revision_requested',
    'Logo resolution too low for print (72 DPI detected, need minimum 300 DPI). Please re-upload in vector format (.ai or .pdf).',
    1,
    '10000000-0000-0000-0000-000000000005',  -- Uploaded by Amina
    '10000000-0000-0000-0000-000000000003'   -- Reviewed by Michael (designer)
  ),
  (
    '80000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000001',
    'https://storage.example.com/designs/techstartup-bizcard-v2.pdf',
    'approved',
    'All good — 300 DPI confirmed, bleed area correct, fonts embedded.',
    2,
    '10000000-0000-0000-0000-000000000005',  -- Re-uploaded by Amina
    '10000000-0000-0000-0000-000000000003'   -- Approved by Michael
  ),
  (
    '80000000-0000-0000-0000-000000000003',
    '60000000-0000-0000-0000-000000000003',
    'https://storage.example.com/designs/church-flyer-final.jpg',
    'approved',
    'Design approved by staff. Ready for print.',
    1,
    '10000000-0000-0000-0000-000000000006',  -- Uploaded by James
    '10000000-0000-0000-0000-000000000003'   -- Approved by Michael
  );


-- ─── PRODUCTION TASKS ────────────────────────────────────────────────────────

INSERT INTO production_tasks (id, order_id, assigned_employee, status, priority, notes, started_at, completed_at, estimated_hours, actual_hours)
VALUES
  (
    '90000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',  -- Business cards order
    '20000000-0000-0000-0000-000000000003',  -- David (printer)
    'PRINTING',
    'high',
    'Print 500 business cards. Use premium silk stock. Check colour profile before run. Apply matte lamination after print.',
    '2026-09-06 07:00:00+00',
    NULL,
    3.5,
    NULL
  ),
  (
    '90000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000003',  -- Flyers order (completed)
    '20000000-0000-0000-0000-000000000003',  -- David (printer)
    'COMPLETED',
    'normal',
    '1000 A5 flyers printed and quality checked. Delivered to customer.',
    '2026-08-31 08:00:00+00',
    '2026-08-31 10:30:00+00',
    3.0,
    2.5
  );


-- ─── PAYMENTS ────────────────────────────────────────────────────────────────

INSERT INTO payments (id, order_id, amount, payment_method, payment_status, transaction_ref, paid_at, notes)
VALUES
  (
    'A0000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',  -- Business cards order
    160.00,   -- 50% deposit
    'bank_transfer',
    'completed',
    'TXN-2026090601-BNK',
    '2026-09-06 09:15:00+00',
    '50% deposit paid. Balance of GH₵ 160.00 due on collection.'
  ),
  (
    'A0000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000003',  -- Flyers order (fully paid)
    95.00,    -- Full payment
    'cash',
    'completed',
    NULL,
    '2026-08-31 11:00:00+00',
    'Full payment collected on delivery.'
  );


-- ─── OFFERS ──────────────────────────────────────────────────────────────────
-- Promotional showcase cards for the customer dashboard.
-- Uses ON CONFLICT (eyebrow, title) DO NOTHING — safe to re-run.

INSERT INTO public.offers
  (eyebrow, title, description, button_text, button_link, service_query, badge_text, badge_icon, theme, sort_order, is_active)
VALUES
  (
    'PREMIUM FINISHES',
    'Spot UV & Gold Foil Cards.',
    'From LKR 15 / card. Tactile velvety soft-touch with raised 3D metallic foil.',
    'Order Now',
    '/customer/orders/new',
    'business_cards',
    'Soft-Touch Velvet 450gsm',
    'auto_awesome',
    'dark',
    1,
    TRUE
  ),
  (
    'EVENTS & SIGNAGE',
    'Heavyweight Vinyl Banners.',
    'Vibrant weather-resistant prints. Ready in 24 hours with reinforced brass eyelets.',
    'Configure Size',
    '/customer/orders/new',
    'banners',
    'Same-Day Dispatch Available',
    'speed',
    'light',
    2,
    TRUE
  ),
  (
    'SUSTAINABLE PACKAGING',
    '100% Recycled Kraft Boxes.',
    'Eco-friendly corrugated mailer boxes tailored to elevate your brand''s unboxing.',
    'Get Free Quote',
    '/customer/orders/new',
    'packaging',
    'FSC-Certified & Soy Inks',
    'eco',
    'eco',
    3,
    TRUE
  ),
  (
    'FLASH SALE 30% OFF',
    'Holographic Foil Stickers.',
    'Dazzling prismatic reflections for high-impact packaging and labels. Water and UV proof.',
    'Claim 30% Off',
    '/customer/orders/new',
    'stickers',
    'Hot New Arrival',
    'auto_awesome',
    'purple',
    4,
    TRUE
  )
ON CONFLICT (eyebrow, title) DO NOTHING;


COMMIT;

-- =============================================================================
-- VERIFY SEED DATA
-- =============================================================================
-- Run these queries to verify the seed data was inserted correctly:

-- SELECT 'users'               AS table_name, COUNT(*) AS rows FROM users;
-- SELECT 'customers'           AS table_name, COUNT(*) AS rows FROM customers;
-- SELECT 'employees'           AS table_name, COUNT(*) AS rows FROM employees;
-- SELECT 'suppliers'           AS table_name, COUNT(*) AS rows FROM suppliers;
-- SELECT 'inventory_materials' AS table_name, COUNT(*) AS rows FROM inventory_materials;
-- SELECT 'orders'              AS table_name, COUNT(*) AS rows FROM orders;
-- SELECT 'quotations'          AS table_name, COUNT(*) AS rows FROM quotations;
-- SELECT 'designs'             AS table_name, COUNT(*) AS rows FROM designs;
-- SELECT 'production_tasks'    AS table_name, COUNT(*) AS rows FROM production_tasks;
-- SELECT 'payments'            AS table_name, COUNT(*) AS rows FROM payments;
-- SELECT 'offers'              AS table_name, COUNT(*) AS rows FROM public.offers;

-- Check the useful views:
-- SELECT * FROM view_order_summary;
-- SELECT * FROM view_low_stock;
-- SELECT * FROM view_production_queue;

-- Verify offer records:
-- SELECT id, eyebrow, title, theme, sort_order, is_active
-- FROM   public.offers
-- ORDER  BY sort_order;
