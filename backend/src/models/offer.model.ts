// =============================================================================
// PrintShop Management System — Offer Model
// =============================================================================

export type OfferTheme = 'dark' | 'light' | 'eco' | 'blue' | 'purple';

export interface Offer {
  id:            string;
  eyebrow:       string;
  title:         string;
  description:   string;
  button_text:   string;
  button_link:   string;
  service_query?: string | null;
  badge_text?:   string | null;
  badge_icon?:   string | null;
  theme:         OfferTheme;
  sort_order:    number;
  is_active:     boolean;
  created_at?:   string;
  updated_at?:   string;
}

export interface CreateOfferDto {
  eyebrow:       string;
  title:         string;
  description:   string;
  button_text?:  string;
  button_link?:  string;
  service_query?: string | null;
  badge_text?:   string | null;
  badge_icon?:   string | null;
  theme?:        OfferTheme;
  sort_order?:   number;
  is_active?:    boolean;
}

export interface UpdateOfferDto extends Partial<CreateOfferDto> {}
