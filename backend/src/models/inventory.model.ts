// =============================================================================
// Model: InventoryMaterial
// Table: inventory_materials
// =============================================================================

export type MaterialCategory =
  | 'paper'
  | 'ink'
  | 'vinyl'
  | 'fabric'
  | 'packaging'
  | 'binding'
  | 'laminate'
  | 'substrate'
  | 'other';

/** Full database row */
export interface InventoryMaterial {
  id:                   string;           // UUID
  material_name:        string;
  category:             MaterialCategory;
  quantity:             number;
  unit:                 string;           // e.g. 'sheets', 'litres', 'kg'
  minimum_stock_level:  number;
  unit_cost:            number | null;
  supplier_id:          string | null;    // FK → suppliers.id
  sku:                  string | null;
  location:             string | null;
  created_at:           string;
  updated_at:           string;
}

export interface CreateInventoryMaterialDto {
  material_name:       string;
  category:            MaterialCategory;
  quantity?:           number;
  unit:                string;
  minimum_stock_level?: number;
  unit_cost?:          number;
  supplier_id?:        string;
  sku?:                string;
  location?:           string;
}

export type UpdateInventoryMaterialDto = Partial<CreateInventoryMaterialDto>;

/** Low stock alert — from view_low_stock */
export interface LowStockAlert extends InventoryMaterial {
  current_stock:  number;
  reorder_point:  number;
  shortage:       number;
  supplier_name:  string | null;
  supplier_phone: string | null;
  supplier_email: string | null;
}
