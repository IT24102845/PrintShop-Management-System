const bcrypt = require('bcryptjs');
const { supabase } = require('../../dist/config/supabase.js');

async function seedFullData() {
  console.log('🚀 Starting complete data population for PrintShop Management System...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // ─── 1. EMPLOYEES (Add production printer if not exists) ──────────────────────
  console.log('\n--- Checking / Adding Employees ---');
  const { data: existingUsers } = await supabase.from('users').select('id, email').eq('email', 'printer@printshop.com');
  let printerUserId;
  let printerEmpId;

  if (!existingUsers || existingUsers.length === 0) {
    const { data: newPrinterUser } = await supabase.from('users').insert({
      full_name: 'David Perera (Print Specialist)',
      email: 'printer@printshop.com',
      password_hash: passwordHash,
      role: 'production_staff',
      is_active: true
    }).select().single();
    printerUserId = newPrinterUser.id;

    const { data: newPrinterEmp } = await supabase.from('employees').insert({
      user_id: printerUserId,
      employee_role: 'printer',
      is_available: true
    }).select().single();
    printerEmpId = newPrinterEmp.id;
    console.log('Created printer employee:', printerEmpId);
  } else {
    printerUserId = existingUsers[0].id;
    const { data: emp } = await supabase.from('employees').select('id').eq('user_id', printerUserId).single();
    printerEmpId = emp?.id;
  }

  // ─── 2. NEW CUSTOMERS ────────────────────────────────────────────────────────
  console.log('\n--- Seeding Rich Customers ---');
  const customerSeeds = [
    {
      full_name: 'Johnathan Doe',
      email: 'john.doe@apexmarketing.com',
      company: 'Apex Marketing & Media Ltd',
      phone: '+94 77 123 4567',
      address: '45 Galle Road, Colombo 03, Sri Lanka',
      notes: 'Key VIP account. Regular monthly flyer & brochure batches.'
    },
    {
      full_name: 'Chaminda Perera',
      email: 'chaminda@ceylontea.lk',
      company: 'Ceylon Heritage Tea Exporters',
      phone: '+94 81 223 8899',
      address: '12 Kandy Road, Peradeniya, Sri Lanka',
      notes: 'Requires foil-stamped luxury packaging for export tea boxes.'
    },
    {
      full_name: 'Dilani Silva',
      email: 'dilani@blossomevents.com',
      company: 'Blossom Events & Weddings',
      phone: '+94 71 890 1234',
      address: '88 Havelock Road, Colombo 05, Sri Lanka',
      notes: 'Fast turnaround needed for wedding stationery and event signage.'
    },
    {
      full_name: 'Kasun Jayawardena',
      email: 'kasun@pixelcraft.io',
      company: 'PixelCraft Tech Studios',
      phone: '+94 76 543 2109',
      address: '102 High Level Road, Nugegoda, Sri Lanka',
      notes: 'Tech merchandise, die-cut stickers and exhibition pop-up banners.'
    },
    {
      full_name: 'Anushka Fernando',
      email: 'anushka@greenleafcafe.com',
      company: 'Green Leaf Organic Cafe',
      phone: '+94 11 234 5678',
      address: '24 Park Street, Colombo 02, Sri Lanka',
      notes: 'Biodegradable kraft packaging and seasonal table talker menus.'
    },
    {
      full_name: 'Priyantha Wickramasinghe',
      email: 'priyantha@skylinecon.lk',
      company: 'Skyline Construction Partners',
      phone: '+94 77 987 6543',
      address: '350 Baseline Road, Dematagoda, Sri Lanka',
      notes: 'Large format outdoor site signage, mesh hoardings and safety stickers.'
    },
    {
      full_name: 'Shanika De Alwis',
      email: 'shani@urbanthreads.store',
      company: 'Urban Threads Fashion House',
      phone: '+94 72 456 7890',
      address: '15 Dutugemunu Street, Kohuwala, Sri Lanka',
      notes: 'Custom apparel screen-printing, garment tags and branded carry bags.'
    },
    {
      full_name: 'Nuwan Senanayake',
      email: 'nuwan@quickbite.lk',
      company: 'QuickBite Food Express',
      phone: '+94 70 111 2233',
      address: '78 Nawala Road, Rajagiriya, Sri Lanka',
      notes: 'Waterproof greaseproof takeaway food boxes and promo vouchers.'
    }
  ];

  for (const c of customerSeeds) {
    const { data: existingUser } = await supabase.from('users').select('id').eq('email', c.email).maybeSingle();
    let uId;
    if (!existingUser) {
      const { data: u, error: uErr } = await supabase.from('users').insert({
        full_name: c.full_name,
        email: c.email,
        password_hash: passwordHash,
        role: 'customer',
        is_active: true
      }).select().single();
      if (uErr) { console.error('Err inserting user', c.email, uErr); continue; }
      uId = u.id;

      const { data: cust, error: cErr } = await supabase.from('customers').insert({
        user_id: uId,
        phone: c.phone,
        address: c.address,
        company: c.company,
        notes: c.notes
      }).select().single();
      if (cErr) { console.error('Err inserting customer', c.email, cErr); continue; }
      console.log('✅ Added customer:', c.full_name, '(', c.company, ')');
    }
  }

  // Also fetch all current customer IDs
  const { data: allCusts } = await supabase.from('customers').select('id, company, users(full_name, email)');
  const customerList = allCusts || [];
  console.log(`Total customers in system: ${customerList.length}`);

  // ─── 3. SUPPLIERS ───────────────────────────────────────────────────────────
  console.log('\n--- Seeding Suppliers ---');
  const supplierSeeds = [
    {
      supplier_name: 'PaperWorld Lanka Imports',
      phone: '+94 11 289 9001',
      email: 'sales@paperworldlanka.lk',
      address: '14 Industrial Zone, Biyagama, Sri Lanka',
      contact_person: 'Rohan Jayasuriya',
      payment_terms: 'Net 30',
      is_active: true,
      notes: 'Primary paper mill partner. Supplies coated gloss, matte and board.'
    },
    {
      supplier_name: 'ColorCraft Inks & Consumables',
      phone: '+94 11 450 1212',
      email: 'orders@colorcraft.lk',
      address: '89 Sri Sangaraja Mawatha, Colombo 10, Sri Lanka',
      contact_person: 'Farhan Mohideen',
      payment_terms: 'Net 15',
      is_active: true,
      notes: 'Authorized distributor for Roland, Epson and Mimaki inks.'
    },
    {
      supplier_name: 'VinylPro Advanced Substrates',
      phone: '+94 11 789 3344',
      email: 'contact@vinylpro.lk',
      address: '200 Negombo Road, Peliyagoda, Sri Lanka',
      contact_person: 'Suresh Kumar',
      payment_terms: 'Cash on Delivery',
      is_active: true,
      notes: 'Premium monomeric and polymeric vinyls, mesh, PVC banners.'
    },
    {
      supplier_name: 'PackMaster Carton & Kraft Solutions',
      phone: '+94 33 228 5566',
      email: 'trade@packmaster.lk',
      address: '55 BOI Zone, Meerigama, Sri Lanka',
      contact_person: 'Gayan Weerasinghe',
      payment_terms: 'Net 45',
      is_active: true,
      notes: 'Corrugated boards, kraft liners and rigid boxboard sheets.'
    },
    {
      supplier_name: 'TextileCraft Blank Apparel Co.',
      phone: '+94 11 567 8900',
      email: 'wholesale@textilecraft.lk',
      address: '72 Dehiwala Road, Maharagama, Sri Lanka',
      contact_person: 'Mahesh Bandara',
      payment_terms: 'Prepaid',
      is_active: true,
      notes: 'High-density 180gsm combed cotton t-shirt blanks and tote bags.'
    }
  ];

  const supplierIds = [];
  for (const s of supplierSeeds) {
    const { data: existing } = await supabase.from('suppliers').select('id').eq('supplier_name', s.supplier_name).maybeSingle();
    if (!existing) {
      const { data: sup, error } = await supabase.from('suppliers').insert(s).select().single();
      if (!error && sup) {
        supplierIds.push(sup.id);
        console.log('✅ Added supplier:', s.supplier_name);
      }
    } else {
      supplierIds.push(existing.id);
    }
  }

  // ─── 4. INVENTORY MATERIALS ────────────────────────────────────────────────
  console.log('\n--- Seeding Inventory Materials ---');
  const materialSeeds = [
    {
      material_name: 'Art Board 350gsm Silk Coated',
      category: 'paper',
      quantity: 3500,
      unit: 'sheets',
      minimum_stock_level: 800,
      unit_cost: 0.45,
      sku: 'PAP-AB-350-S',
      location: 'Rack A-1 (Main Paper Store)'
    },
    {
      material_name: 'A4 Gloss Paper 150gsm Premium',
      category: 'paper',
      quantity: 12000,
      unit: 'sheets',
      minimum_stock_level: 2500,
      unit_cost: 0.18,
      sku: 'PAP-A4-GL-150',
      location: 'Rack A-2'
    },
    {
      material_name: 'A3 Uncoated Woodfree 100gsm',
      category: 'paper',
      quantity: 8500,
      unit: 'sheets',
      minimum_stock_level: 1500,
      unit_cost: 0.12,
      sku: 'PAP-A3-WF-100',
      location: 'Rack A-3'
    },
    {
      material_name: 'Kraft Liner Board 280gsm Eco',
      category: 'packaging',
      quantity: 240, // LOW STOCK alert
      unit: 'sheets',
      minimum_stock_level: 500,
      unit_cost: 0.65,
      sku: 'PKG-KFT-280',
      location: 'Rack B-1'
    },
    {
      material_name: 'CMYK Eco-Solvent Ink Set (4 x 1L)',
      category: 'ink',
      quantity: 14,
      unit: 'litres',
      minimum_stock_level: 4,
      unit_cost: 85.00,
      sku: 'INK-SOLV-CMYK',
      location: 'Chemical Storage Cabinet 1'
    },
    {
      material_name: 'UV Cure Cyan Pigment Ink (1L)',
      category: 'ink',
      quantity: 2.5, // LOW STOCK alert
      unit: 'litres',
      minimum_stock_level: 5,
      unit_cost: 110.00,
      sku: 'INK-UV-CYAN-1L',
      location: 'Chemical Storage Cabinet 2'
    },
    {
      material_name: 'Gloss Over-Laminate Film Roll (50m x 1.2m)',
      category: 'laminate',
      quantity: 8,
      unit: 'rolls',
      minimum_stock_level: 3,
      unit_cost: 48.00,
      sku: 'LAM-GLS-50M',
      location: 'Finishing Area Rack 1'
    },
    {
      material_name: 'Soft-Touch Matte Thermal Laminate Roll',
      category: 'laminate',
      quantity: 2, // LOW STOCK alert
      unit: 'rolls',
      minimum_stock_level: 4,
      unit_cost: 75.00,
      sku: 'LAM-STM-30M',
      location: 'Finishing Area Rack 1'
    },
    {
      material_name: 'Self-Adhesive White Gloss Vinyl (1.52m x 50m)',
      category: 'vinyl',
      quantity: 12,
      unit: 'rolls',
      minimum_stock_level: 3,
      unit_cost: 125.00,
      sku: 'VNL-WHT-GLS-50',
      location: 'Large Format Roll Stand'
    },
    {
      material_name: 'PVC Frontlit Banner 510gsm (2.2m x 50m)',
      category: 'vinyl',
      quantity: 6,
      unit: 'rolls',
      minimum_stock_level: 2,
      unit_cost: 145.00,
      sku: 'VNL-BNR-510-22',
      location: 'Large Format Roll Stand'
    },
    {
      material_name: 'Frosted Glass Privacy Vinyl (1.22m x 30m)',
      category: 'vinyl',
      quantity: 5,
      unit: 'rolls',
      minimum_stock_level: 2,
      unit_cost: 95.00,
      sku: 'VNL-FRST-122',
      location: 'Large Format Roll Stand'
    },
    {
      material_name: 'Cotton T-Shirt Blanks - Black (Size M)',
      category: 'fabric',
      quantity: 180,
      unit: 'pieces',
      minimum_stock_level: 40,
      unit_cost: 4.80,
      sku: 'FAB-TSH-BLK-M',
      location: 'Textile Room Shelf 2'
    },
    {
      material_name: 'Cotton T-Shirt Blanks - White (Size L)',
      category: 'fabric',
      quantity: 210,
      unit: 'pieces',
      minimum_stock_level: 50,
      unit_cost: 4.50,
      sku: 'FAB-TSH-WHT-L',
      location: 'Textile Room Shelf 2'
    },
    {
      material_name: 'Twin-Loop Wire Binding Spines 1/2-inch',
      category: 'binding',
      quantity: 850,
      unit: 'pieces',
      minimum_stock_level: 200,
      unit_cost: 0.22,
      sku: 'BND-WIR-12',
      location: 'Finishing Bin 4'
    },
    {
      material_name: 'Foam Board 5mm High-Density (4ft x 8ft)',
      category: 'substrate',
      quantity: 45,
      unit: 'sheets',
      minimum_stock_level: 15,
      unit_cost: 14.50,
      sku: 'SUB-FOAM-5MM',
      location: 'Rigid Substrate Bay'
    }
  ];

  for (let i = 0; i < materialSeeds.length; i++) {
    const m = materialSeeds[i];
    const { data: existing } = await supabase.from('inventory_materials').select('id').eq('sku', m.sku).maybeSingle();
    if (!existing) {
      const supId = supplierIds.length > 0 ? supplierIds[i % supplierIds.length] : null;
      await supabase.from('inventory_materials').insert({
        ...m,
        supplier_id: supId
      });
      console.log('✅ Added inventory material:', m.material_name);
    }
  }

  // ─── 5. ORDERS ACROSS WORKFLOW STATES ──────────────────────────────────────
  console.log('\n--- Seeding Rich Orders ---');
  const orderTemplates = [
    {
      service_type: 'business_cards',
      description: 'Executive Soft-Touch Business Cards with Gold Foil Edge and Embossed Logo',
      size: '90mm x 54mm',
      quantity: 500,
      colour: 'Double-sided Full Colour (4/4 CMYK) + Spot UV',
      material: '350gsm Silk Board + Soft-Touch Matte Laminate',
      status: 'in_production',
      deadline_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      special_notes: 'Critical color matching on company brand navy blue (Pantone 288C).'
    },
    {
      service_type: 'banners',
      description: 'Retractable Roll-Up Banners for Annual Tech Summit with Heavy Aluminum Base',
      size: '85cm x 200cm',
      quantity: 4,
      colour: 'Vibrant CMYK High-Resolution 1440 DPI',
      material: 'Anti-curl Polypropylene Film 280gsm with Matte Finish',
      status: 'confirmed',
      deadline_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      special_notes: 'Includes padded nylon carry cases for flight transport.'
    },
    {
      service_type: 'brochures',
      description: 'Corporate Profile 12-Page Saddle-Stitched Catalogues for Overseas Trade Fair',
      size: 'A4 Finished Size (A3 Open)',
      quantity: 1200,
      colour: 'Full Colour Throughout (4/4)',
      material: 'Cover: 250gsm Silk with Gloss Lamination; Inner: 150gsm Gloss',
      status: 'design_review',
      deadline_date: new Date(Date.now() + 86400000 * 8).toISOString().split('T')[0],
      special_notes: 'Customer submitted v2 proofs. Need designer sign-off before CTP plating.'
    },
    {
      service_type: 'stickers',
      description: 'Waterproof Die-Cut Laptop Brand Stickers with Easy-Peel Border',
      size: '75mm x 75mm Custom Contour Shape',
      quantity: 2500,
      colour: 'Full Colour CMYK + White Understrike',
      material: 'Premium White Polymeric Vinyl with UV Gloss Overlaminate',
      status: 'ready',
      deadline_date: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
      special_notes: 'Packaged in bundles of 100 with cardboard backings.'
    },
    {
      service_type: 'flyers',
      description: 'Promotional Grand Opening Marketing Flyers with Perforated Discount Coupon',
      size: 'A5 (148mm x 210mm)',
      quantity: 5000,
      colour: 'Full Colour Both Sides (4/4)',
      material: '150gsm Gloss Coated Art Paper',
      status: 'delivered',
      deadline_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
      special_notes: 'Delivered directly to client headquarters on schedule.'
    },
    {
      service_type: 'packaging',
      description: 'Custom Kraft Corrugated E-commerce Shipping Boxes with Exterior Brand Print',
      size: '300mm x 220mm x 100mm',
      quantity: 800,
      colour: '1-Colour Solid Midnight Black Flexo Print on Kraft',
      material: 'E-Flute Corrugated Board 350gsm with Kraft Liner',
      status: 'quoted',
      deadline_date: new Date(Date.now() + 86400000 * 12).toISOString().split('T')[0],
      special_notes: 'Quotation sent. Awaiting procurement team sign-off.'
    },
    {
      service_type: 'signage',
      description: '3D Acrylic Reception Logo Signage with Brushed Aluminium Standoffs',
      size: '1800mm x 900mm Backplate',
      quantity: 1,
      colour: 'Laser Cut 10mm Clear Acrylic with Opaque Vinyl Facing',
      material: '10mm Cast Acrylic, 3M VHB Bonding, Stainless Standoffs',
      status: 'quality_check',
      deadline_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      special_notes: 'Assembly completed. Performing illumination & edge inspection.'
    },
    {
      service_type: 'tshirts',
      description: 'Corporate Marathon Staff Polo T-Shirts with Embroidered Chest Emblem',
      size: 'Assorted Sizes (S: 30, M: 60, L: 80, XL: 30)',
      quantity: 200,
      colour: 'Royal Blue Pique Fabric with White Collar Trim',
      material: '100% Ring-Spun Pique Cotton 220gsm',
      status: 'in_production',
      deadline_date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
      special_notes: 'Screen-print on back: "STAFF 2026", Embroidery on front chest.'
    },
    {
      service_type: 'posters',
      description: 'Retail Seasonal Window Posters on High-Density Foam Core Mount',
      size: 'A1 (594mm x 841mm)',
      quantity: 15,
      colour: 'Photo-Realistic 12-Colour Pigment Giclée Print',
      material: '260gsm Satin Photographic Paper mounted on 5mm White Foam Board',
      status: 'pending',
      deadline_date: new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0],
      special_notes: 'Awaiting high-resolution product photography from client marketing team.'
    },
    {
      service_type: 'custom',
      description: 'Hardcover Gold Foil Embossed Coffee Table Book with Ribbon Bookmark',
      size: '250mm x 250mm Square',
      quantity: 300,
      colour: 'Full Colour Rich CMYK Throughout (96 Pages)',
      material: '170gsm Matt Art Inner, 2.5mm Dutch Greyboard Casebound with Linen Cloth',
      status: 'quoted',
      deadline_date: new Date(Date.now() + 86400000 * 20).toISOString().split('T')[0],
      special_notes: 'Sample dummy book presented to board of directors.'
    }
  ];

  for (let i = 0; i < orderTemplates.length; i++) {
    const tmpl = orderTemplates[i];
    const custId = customerList[i % customerList.length].id;

    // Check if duplicate description exists
    const { data: existingOrd } = await supabase.from('orders').select('id').eq('description', tmpl.description).maybeSingle();
    let ordId;

    if (!existingOrd) {
      const { data: ord, error: ordErr } = await supabase.from('orders').insert({
        customer_id: custId,
        service_type: tmpl.service_type,
        description: tmpl.description,
        size: tmpl.size,
        quantity: tmpl.quantity,
        colour: tmpl.colour,
        material: tmpl.material,
        status: tmpl.status,
        deadline_date: tmpl.deadline_date,
        special_notes: tmpl.special_notes,
        design_file_url: 'https://cdn.printshop.internal/orders/proof-' + (i + 1) + '.pdf'
      }).select().single();

      if (ordErr || !ord) {
        console.error('Err inserting order', ordErr);
        continue;
      }
      ordId = ord.id;
      console.log('✅ Created order:', ord.service_type, 'for', customerList[i % customerList.length].company || 'Customer');
    } else {
      ordId = existingOrd.id;
    }

    // ─── 6. QUOTATIONS FOR THE ORDER ──────────────────────────────────────────
    const { data: existingQuote } = await supabase.from('quotations').select('id').eq('order_id', ordId).maybeSingle();
    if (!existingQuote) {
      const quoteAmount = Math.round((tmpl.quantity * 1.85 + 45) * 100) / 100;
      const quoteStatus = tmpl.status === 'delivered' || tmpl.status === 'ready' || tmpl.status === 'in_production' || tmpl.status === 'quality_check' || tmpl.status === 'confirmed'
        ? 'accepted'
        : (tmpl.status === 'quoted' ? 'sent' : 'draft');

      const { data: q } = await supabase.from('quotations').insert({
        order_id: ordId,
        amount: quoteAmount,
        status: quoteStatus,
        notes: 'Price includes pre-press proofing, high-precision finishing, and standard packaging.',
        valid_until: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
        revision: 1
      }).select().single();
      if (q) console.log('   ↳ Added quotation: LKR', quoteAmount, `[${quoteStatus}]`);
    }

    // ─── 7. DESIGNS FOR THE ORDER ─────────────────────────────────────────────
    const { data: existingDesign } = await supabase.from('designs').select('id').eq('order_id', ordId).maybeSingle();
    if (!existingDesign) {
      const designStatus = tmpl.status === 'delivered' || tmpl.status === 'ready' || tmpl.status === 'in_production' || tmpl.status === 'quality_check'
        ? 'approved'
        : (tmpl.status === 'design_review' ? 'under_review' : 'pending');

      await supabase.from('designs').insert({
        order_id: ordId,
        file_url: 'https://cdn.printshop.internal/designs/artwork-' + ordId.substring(0, 8) + '.pdf',
        approval_status: designStatus,
        remarks: designStatus === 'approved' ? 'Artwork preflight passed: 300 DPI CMYK with 3mm bleed.' : 'Customer proof uploaded. Awaiting client review.',
        version: 1
      });
      console.log('   ↳ Added design proof:', `[${designStatus}]`);
    }

    // ─── 8. PRODUCTION TASKS FOR PRODUCTION ORDERS ───────────────────────────
    if (['in_production', 'quality_check', 'ready', 'delivered'].includes(tmpl.status)) {
      const { data: existingTask } = await supabase.from('production_tasks').select('id').eq('order_id', ordId).maybeSingle();
      if (!existingTask) {
        const taskStatus = tmpl.status === 'delivered' || tmpl.status === 'ready'
          ? 'COMPLETED'
          : (tmpl.status === 'quality_check' ? 'QUALITY_CHECK' : 'PRINTING');

        await supabase.from('production_tasks').insert({
          order_id: ordId,
          assigned_employee: printerEmpId,
          status: taskStatus,
          priority: i % 2 === 0 ? 'high' : 'normal',
          notes: 'Standard production instructions: Calibrate color profile before print run, inspect cutting tolerances.',
          started_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          completed_at: taskStatus === 'COMPLETED' ? new Date().toISOString() : null,
          estimated_hours: 4.5,
          actual_hours: taskStatus === 'COMPLETED' ? 4.0 : null
        });
        console.log('   ↳ Added production task:', `[${taskStatus}]`);
      }
    }

    // ─── 9. PAYMENTS FOR CONFIRMED / COMPLETED ORDERS ────────────────────────
    if (['confirmed', 'in_production', 'ready', 'delivered'].includes(tmpl.status)) {
      const { data: existingPay } = await supabase.from('payments').select('id').eq('order_id', ordId).maybeSingle();
      if (!existingPay) {
        const payAmount = Math.round((tmpl.quantity * 1.5 + 30) * 100) / 100;
        await supabase.from('payments').insert({
          order_id: ordId,
          amount: payAmount,
          payment_method: i % 3 === 0 ? 'bank_transfer' : (i % 3 === 1 ? 'card' : 'cash'),
          payment_status: 'completed',
          transaction_ref: 'TXN-20260908-' + Math.floor(100000 + Math.random() * 900000),
          paid_at: new Date(Date.now() - 86400000).toISOString(),
          notes: 'Payment verified and credited to merchant account.'
        });
        console.log('   ↳ Added payment record: LKR', payAmount, '[completed]');
      }
    }
  }

  console.log('\n🎉 ALL DATA SUCCESSFULLY POPULATED ACROSS ALL MODULES!');
}

seedFullData().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
