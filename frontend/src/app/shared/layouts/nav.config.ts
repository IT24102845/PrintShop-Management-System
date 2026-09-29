export interface NavItem {
  label: string;
  route: string;
  icon: string;
  roles: string[];
  section?: string;
}

export const STAFF_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',   route: '/app/dashboard',   icon: 'dashboard',               roles: ['admin', 'manager', 'customer_service', 'design_staff', 'production_staff', 'inventory_staff'], section: 'Overview' },
  { label: 'Customers',   route: '/app/customers',   icon: 'groups',                  roles: ['admin', 'manager', 'customer_service'], section: 'Customer & Orders' },
  { label: 'Orders',      route: '/app/orders',      icon: 'receipt_long',            roles: ['admin', 'manager', 'customer_service', 'design_staff', 'production_staff'], section: 'Customer & Orders' },
  { label: 'Quotations',  route: '/app/quotations',  icon: 'request_quote',           roles: ['admin', 'manager', 'customer_service'], section: 'Customer & Orders' },
  { label: 'Designs',     route: '/app/designs',     icon: 'design_services',         roles: ['admin', 'manager', 'design_staff'], section: 'Production & Design' },
  { label: 'Production',  route: '/app/production',  icon: 'precision_manufacturing', roles: ['admin', 'manager', 'production_staff'], section: 'Production & Design' },
  { label: 'Inventory',   route: '/app/inventory',   icon: 'inventory_2',             roles: ['admin', 'manager', 'inventory_staff'], section: 'Inventory & Suppliers' },
  { label: 'Suppliers',   route: '/app/suppliers',   icon: 'local_shipping',          roles: ['admin', 'manager'], section: 'Inventory & Suppliers' },
  { label: 'Payments',    route: '/app/payments',    icon: 'payments',                roles: ['admin', 'manager'], section: 'Payment & Admin' },
  { label: 'Offers',      route: '/app/offers',      icon: 'local_offer',             roles: ['admin', 'manager'], section: 'Payment & Admin' },
  { label: 'Reports',     route: '/app/reports',     icon: 'insights',                roles: ['admin', 'manager'], section: 'Payment & Admin' },
];

export const CUSTOMER_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',       route: '/customer/dashboard',   icon: 'dashboard',       roles: ['customer'] },
  { label: 'My Orders',       route: '/customer/orders',      icon: 'receipt_long',    roles: ['customer'] },
  { label: 'Create Order',    route: '/customer/orders/new',  icon: 'add_circle',      roles: ['customer'] },
  { label: 'Quotations',      route: '/customer/quotations',  icon: 'request_quote',   roles: ['customer'] },
  { label: 'Design Approval', route: '/customer/designs',     icon: 'design_services', roles: ['customer'] },
  { label: 'Profile',         route: '/customer/profile',     icon: 'person',          roles: ['customer'] },
];
