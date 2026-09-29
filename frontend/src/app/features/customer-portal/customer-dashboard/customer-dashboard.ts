// ============================================================
// CUSTOMER DASHBOARD COMPONENT
// Purpose: Controls the Customer Self-Service Portal Dashboard screen.
// UI: Displays and manages customer active orders, pending quotes, and quick order links.
// Flow: Component -> CustomerService / OrderService -> Backend APIs
// This TypeScript file controls the behaviour of the UI.
// ============================================================

/**
 * ============================================================================
 * CUSTOMER DASHBOARD COMPONENT - STOREFRONT & SELF-SERVICE OVERVIEW
 * ============================================================================
 * 
 * ARCHITECTURAL CONTEXT:
 * Serves as the primary landing page for authenticated CUSTOMER accounts.
 * Blends an Apple-inspired high-end product catalog showcase with an
 * actionable self-service operational cockpit.
 * 
 * WORKFLOW & INTEGRATION:
 * 1. Telemetry Aggregation: Concurrent initialization via RxJS `forkJoin` loads:
 *    - Orders (`getMyOrders`): Active orders, total history, and status filters.
 *    - Quotations (`getMyQuotations`): Pending quotes awaiting customer review.
 *    - Designs (`getMyDesigns`): Proofs requiring approval or revision requests.
 *    - Promotional Offers (`getAll(false)`): Marketing hero banners & products.
 * 2. Fault Tolerance: Every branch uses `.pipe(catchError(() => of(null)))` to
 *    prevent a single service failure from breaking the dashboard view.
 * ============================================================================
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { OrderService } from '../../../core/services/order.service';
import { QuotationService } from '../../../core/services/quotation.service';
import { DesignService } from '../../../core/services/design.service';
import { OfferService, Offer } from '../../../core/services/offer.service';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StatusBadge],
  template: `
    <div class="apple-store-container">

      <!-- Apple Store Hero Header -->
      <section class="store-hero-section">
        <!-- Artistic Lion Watermark Background -->
        <div class="store-hero-watermark">
          <img src="/dashboard-lion.png" alt="Supreme Lion" class="hero-watermark-img" />
        </div>

        <div class="store-hero-left">
          <h1 class="apple-hero-headline">
            <span class="headline-bold">Store.</span>
            <span class="headline-muted">The best way to buy the prints you love.</span>
          </h1>
          <p class="store-hero-sub">Welcome back, {{ firstName }}. Browse premium print products, review proofs, and track active orders.</p>
        </div>

        <div class="store-hero-right">
          <div class="specialist-card">
            <div class="spec-avatar-circle">
              <span class="material-icons-outlined">support_agent</span>
            </div>
            <div class="spec-details">
              <span class="spec-prompt">Need printing advice?</span>
              <a routerLink="/customer/quotations" class="spec-action">Ask a Specialist &rsaquo;</a>
            </div>
          </div>

          <div class="specialist-card">
            <div class="spec-avatar-circle store-icon-circle">
              <span class="material-icons-outlined">storefront</span>
            </div>
            <div class="spec-details">
              <span class="spec-prompt">Visit Supreme Advertising Studio</span>
              <a routerLink="/customer/orders/new" class="spec-action">Find a studio near you &rsaquo;</a>
            </div>
          </div>
        </div>
      </section>

      <!-- Category Quick-Nav Shelf (Apple Product Shelf) -->
      <section class="category-nav-shelf">
        <div class="category-nav-track">
          
          <a routerLink="/customer/orders/new" [queryParams]="{service: 'brochures'}" class="category-nav-item">
            <div class="category-nav-img-wrap">
              <span class="material-icons-outlined">print</span>
            </div>
            <span class="category-nav-label">Digital Printing</span>
          </a>

          <a routerLink="/customer/orders/new" [queryParams]="{service: 'banners'}" class="category-nav-item">
            <div class="category-nav-img-wrap">
              <span class="material-icons-outlined">view_carousel</span>
            </div>
            <span class="category-nav-label">Banner Printing</span>
          </a>

          <a routerLink="/customer/orders/new" [queryParams]="{service: 'business_cards'}" class="category-nav-item">
            <div class="category-nav-img-wrap">
              <span class="material-icons-outlined">badge</span>
            </div>
            <span class="category-nav-label">Business Cards</span>
          </a>

          <a routerLink="/customer/orders/new" [queryParams]="{service: 'flyers'}" class="category-nav-item">
            <div class="category-nav-img-wrap">
              <span class="material-icons-outlined">auto_stories</span>
            </div>
            <span class="category-nav-label">Flyer Printing</span>
          </a>

          <a routerLink="/customer/orders/new" [queryParams]="{service: 'posters'}" class="category-nav-item">
            <div class="category-nav-img-wrap">
              <span class="material-icons-outlined">photo_size_select_actual</span>
            </div>
            <span class="category-nav-label">Poster Printing</span>
          </a>

          <a routerLink="/customer/orders/new" [queryParams]="{service: 'tshirts'}" class="category-nav-item">
            <div class="category-nav-img-wrap">
              <span class="material-icons-outlined">checkroom</span>
            </div>
            <span class="category-nav-label">Custom Products</span>
          </a>

          <a routerLink="/customer/orders/new" [queryParams]="{service: 'custom'}" class="category-nav-item">
            <div class="category-nav-img-wrap">
              <span class="material-icons-outlined">mark_email_read</span>
            </div>
            <span class="category-nav-label">Invitations</span>
          </a>

          <a routerLink="/customer/orders/new" [queryParams]="{service: 'stickers'}" class="category-nav-item">
            <div class="category-nav-img-wrap">
              <span class="material-icons-outlined">loyalty</span>
            </div>
            <span class="category-nav-label">Promotional Prints</span>
          </a>

        </div>
      </section>

      <!-- Section: The Latest (Apple Showcase Deck) -->
      @if (offers.length > 0) {
        <section class="apple-shelf">
          <div class="apple-shelf-header">
            <span class="shelf-title">The latest.</span>
            <span class="shelf-subtitle">Take a look at what’s new, right now.</span>
          </div>

          <div class="apple-showcase-grid">
            @for (offer of offers; track offer.id) {
              <div class="showcase-card showcase-{{ offer.theme || 'dark' }}">
                <div class="showcase-content">
                  <span class="showcase-eyebrow">{{ offer.eyebrow }}</span>
                  <h3 class="showcase-title">{{ offer.title }}</h3>
                  <p class="showcase-desc">{{ offer.description }}</p>
                  <div class="showcase-actions">
                    <a
                      [routerLink]="offer.button_link || '/customer/orders/new'"
                      [queryParams]="offer.service_query ? { service: offer.service_query } : {}"
                      class="apple-pill-btn"
                      [class.pill-primary]="offer.theme === 'dark' || offer.theme === 'blue' || offer.theme === 'purple'"
                      [class.pill-secondary]="offer.theme === 'light' || offer.theme === 'eco'"
                    >
                      {{ offer.button_text || 'Order Now' }}
                    </a>
                  </div>
                </div>

                <div class="showcase-visual">
                  @if (offer.badge_text) {
                    <div [class]="(offer.theme === 'dark' || offer.theme === 'blue' || offer.theme === 'purple') ? 'visual-badge-foil' : 'visual-badge-pill'">
                      <span class="material-icons-outlined">{{ offer.badge_icon || 'auto_awesome' }}</span>
                      <span>{{ offer.badge_text }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </section>
      }

      <!-- Section: Your Activity & Orders (Apple Minimalist Metrics & Table) -->
      <section class="apple-shelf">
        <div class="apple-shelf-header">
          <span class="shelf-title">Your activity.</span>
          <span class="shelf-subtitle">Track orders, proofs, and active quotes.</span>
        </div>

        <!-- KPI Metrics Shelf -->
        @if (isLoading) {
          <div class="apple-metrics-grid">
            @for (i of [1,2,3,4,5]; track i) {
              <div class="card metric-card">
                <div class="skeleton" style="width:48px;height:48px;border-radius:12px;flex-shrink:0"></div>
                <div class="metric-content" style="flex:1">
                  <span class="skeleton skeleton-text" style="width:60%"></span>
                  <span class="skeleton" style="height:1.75rem;width:40%;border-radius:4px;margin-top:.5rem;display:block"></span>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="apple-metrics-grid">
            
            <div class="card metric-card">
              <div class="metric-icon bg-portal-light text-portal">
                <span class="material-icons-outlined">receipt_long</span>
              </div>
              <div class="metric-content">
                <p class="metric-title">Total Orders</p>
                <p class="metric-value">{{ totalOrders }}</p>
                <p class="metric-sub">Lifetime print jobs</p>
              </div>
            </div>

            <div class="card metric-card">
              <div class="metric-icon bg-info-light text-info">
                <span class="material-icons-outlined">pending_actions</span>
              </div>
              <div class="metric-content">
                <p class="metric-title">In Progress</p>
                <p class="metric-value">{{ pendingOrders }}</p>
                <p class="metric-sub">Active in production</p>
              </div>
            </div>

            <div class="card metric-card">
              <div class="metric-icon bg-warning-light text-warning">
                <span class="material-icons-outlined">request_quote</span>
              </div>
              <div class="metric-content">
                <p class="metric-title">Pending Quotes</p>
                <p class="metric-value" [class.text-warning]="pendingQuotations > 0">{{ pendingQuotations }}</p>
                <p class="metric-sub">Awaiting your response</p>
              </div>
            </div>

            <div class="card metric-card">
              <div class="metric-icon bg-purple-light text-purple">
                <span class="material-icons-outlined">palette</span>
              </div>
              <div class="metric-content">
                <p class="metric-title">Proofs to Review</p>
                <p class="metric-value" [class.text-primary]="pendingDesigns > 0">{{ pendingDesigns }}</p>
                <p class="metric-sub">Artwork approval needed</p>
              </div>
            </div>

            <div class="card metric-card">
              <div class="metric-icon bg-success-light text-success">
                <span class="material-icons-outlined">task_alt</span>
              </div>
              <div class="metric-content">
                <p class="metric-title">Completed</p>
                <p class="metric-value">{{ completedOrders }}</p>
                <p class="metric-sub">Delivered & finalized</p>
              </div>
            </div>

          </div>
        }

        <!-- Recent Orders Card (Apple Table Container) -->
        <div class="apple-orders-card mt-5">
          <div class="apple-orders-card-header">
            <div>
              <h3 class="orders-card-title">Recent Print Orders</h3>
              <p class="orders-card-sub">Real-time status updates from our printing presses</p>
            </div>
            <a routerLink="/customer/orders" class="apple-pill-btn pill-secondary">
              View All Orders &rsaquo;
            </a>
          </div>

          @if (recentOrders.length > 0) {
            <div class="table-wrapper apple-table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Service</th>
                    <th>Quantity</th>
                    <th>Order Date</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th style="text-align:right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  @for (o of recentOrders; track o.id || o.order_id) {
                    <tr>
                      <td class="font-mono font-bold" style="color:var(--primary-color)">
                        #{{ (o.id || o.order_id)?.substring(0,8) }}
                      </td>
                      <td><strong>{{ (o.service_type)?.replace(/_/g,' ') | titlecase }}</strong></td>
                      <td>{{ o.quantity }} pcs</td>
                      <td class="text-muted text-sm">{{ (o.created_at || o.order_date) | date:'MMM d, y' }}</td>
                      <td class="text-sm">{{ o.deadline_date ? (o.deadline_date | date:'MMM d, y') : '—' }}</td>
                      <td><app-status-badge [status]="o.status || o.order_status"></app-status-badge></td>
                      <td style="text-align:right">
                        <a [routerLink]="'/customer/orders/' + (o.id || o.order_id)" class="apple-pill-btn pill-secondary" style="padding:0.28rem 0.75rem;font-size:0.75rem">
                          Details
                        </a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else if (!isLoading) {
            <div class="empty-apple-state">
              <div class="empty-icon-wrap">
                <span class="material-icons-outlined">receipt_long</span>
              </div>
              <h3>No Orders Yet</h3>
              <p>Place your first print order with guaranteed proof approval before print.</p>
              <a routerLink="/customer/orders/new" class="apple-pill-btn pill-primary mt-3">
                <span class="material-icons-outlined" style="font-size:1rem">add</span> Start Your First Order
              </a>
            </div>
          }
        </div>
      </section>

      <!-- Section: Help is Here (Apple Specialist Cards) -->
      <section class="apple-shelf">
        <div class="apple-shelf-header">
          <span class="shelf-title">Help is here.</span>
          <span class="shelf-subtitle">Whenever and however you need it.</span>
        </div>

        <div class="help-cards-grid">
          
          <div class="help-card">
            <div class="help-card-icon">
              <span class="material-icons-outlined">support_agent</span>
            </div>
            <div class="help-card-body">
              <span class="help-tag">PRINT SPECIALISTS</span>
              <h4 class="help-title">Shop one on one with a specialist.</h4>
              <p class="help-desc">Get guidance choosing papers, card stocks, and bespoke finishing techniques.</p>
              <a routerLink="/customer/quotations" class="help-link">Connect now &rsaquo;</a>
            </div>
          </div>

          <div class="help-card">
            <div class="help-card-icon">
              <span class="material-icons-outlined">verified</span>
            </div>
            <div class="help-card-body">
              <span class="help-tag">PRODUCER GUARANTEE</span>
              <h4 class="help-title">Digital proof approval guarantee.</h4>
              <p class="help-desc">We never print until you inspect and approve your digital PDF or artwork proof.</p>
              <a routerLink="/customer/designs" class="help-link">Check proofs &rsaquo;</a>
            </div>
          </div>

          <div class="help-card">
            <div class="help-card-icon">
              <span class="material-icons-outlined">calculate</span>
            </div>
            <div class="help-card-body">
              <span class="help-tag">INSTANT PRICING</span>
              <h4 class="help-title">Transparent volume quotes.</h4>
              <p class="help-desc">Accurate real-time estimates with tier savings for larger print runs.</p>
              <a routerLink="/customer/quotations/new" class="help-link">Request quote &rsaquo;</a>
            </div>
          </div>

        </div>
      </section>

      <!-- Section: The PrintShop Difference -->
      <section class="apple-shelf">
        <div class="apple-shelf-header">
          <span class="shelf-title">The Supreme Advertising difference.</span>
          <span class="shelf-subtitle">Even more reasons to print with us.</span>
        </div>

        <div class="difference-grid">
          <div class="difference-item">
            <span class="material-icons-outlined diff-icon">speed</span>
            <h4>24-48 Hour Dispatch</h4>
            <p>High-speed industrial printing presses built for rapid turnaround without quality compromise.</p>
          </div>

          <div class="difference-item">
            <span class="material-icons-outlined diff-icon">hd</span>
            <h4>2400 DPI Offset & Digital</h4>
            <p>Razor-sharp micro-type, smooth gradients, and colour accuracy matched to your brand standards.</p>
          </div>

          <div class="difference-item">
            <span class="material-icons-outlined diff-icon">eco</span>
            <h4>Eco-Friendly Stocks & Inks</h4>
            <p>FSC-certified sustainable paper stocks and low-VOC non-toxic plant-based inks.</p>
          </div>

          <div class="difference-item">
            <span class="material-icons-outlined diff-icon">local_shipping</span>
            <h4>Free Nationwide Delivery</h4>
            <p>Free tracked courier delivery across the country on bulk orders over LKR 25,000.</p>
          </div>
        </div>
      </section>

    </div>
  `,
  styles: [`
    .apple-store-container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 2.5rem 1.5rem 4rem;
    }

    // ─── Hero Section ─────────────────────────────────────────────────────────────
    .store-hero-section {
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 2rem;
      margin-bottom: 2.75rem;
      flex-wrap: wrap;
    }

    .store-hero-watermark {
      position: absolute;
      top: -55px;
      right: 14%;
      height: 330px;
      max-width: 650px;
      pointer-events: none;
      z-index: 1;
      opacity: 0.20;
      mix-blend-mode: multiply;
      transition: all 0.3s ease;

      .hero-watermark-img {
        height: 100%;
        width: auto;
        object-fit: contain;
        display: block;
        filter: saturate(115%);
      }

      @media (max-width: 1200px) {
        height: 270px;
        top: -35px;
        right: 8%;
        opacity: 0.16;
      }

      @media (max-width: 900px) {
        height: 220px;
        top: -20px;
        right: 2%;
        opacity: 0.13;
      }

      @media (max-width: 640px) {
        height: 170px;
        top: -10px;
        right: 0;
        opacity: 0.10;
      }
    }

    .store-hero-left {
      position: relative;
      z-index: 2;
      flex: 1;
      min-width: 320px;
      max-width: 680px;
    }

    .store-hero-sub {
      font-size: 1.0625rem;
      color: var(--text-secondary);
      margin-top: 0.5rem;
      line-height: 1.5;
    }

    .store-hero-right {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      min-width: 260px;
    }

    .specialist-card {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.75rem 1rem;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: var(--radius-xl);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
      transition: transform 0.2s ease, box-shadow 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
      }
    }

    .spec-avatar-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #e8f2ff;
      color: var(--primary-color);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &.store-icon-circle {
        background: #f0fdf4;
        color: #16a34a;
      }

      .material-icons-outlined {
        font-size: 1.25rem;
      }
    }

    .spec-details {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .spec-prompt {
      font-size: 0.78125rem;
      font-weight: 600;
      color: var(--text-main);
    }

    .spec-action {
      font-size: 0.75rem;
      color: var(--primary-color);
      text-decoration: none;
      font-weight: 500;
      &:hover { text-decoration: underline; }
    }

    // ─── Category Quick-Nav Shelf ────────────────────────────────────────────────
    .category-nav-shelf {
      margin-bottom: 3.25rem;
    }

    .category-nav-track {
      display: flex;
      gap: 1.5rem;
      overflow-x: auto;
      scrollbar-width: none;
      padding: 0.5rem 0.25rem;
      -webkit-overflow-scrolling: touch;

      &::-webkit-scrollbar { display: none; }
    }

    .category-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.625rem;
      text-decoration: none;
      color: var(--text-main);
      flex-shrink: 0;
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        transform: translateY(-3px);
        text-decoration: none;

        .category-nav-img-wrap {
          box-shadow: 0 8px 24px rgba(0, 113, 227, 0.15);
          border-color: var(--primary-color);
          color: var(--primary-color);
        }

        .category-nav-label {
          color: var(--primary-color);
        }
      }
    }

    .category-nav-img-wrap {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #1d1d1f;
      transition: all 0.25s ease;
      overflow: hidden;

      .material-icons-outlined {
        font-size: 2rem;
      }
    }

    .category-nav-label {
      font-size: 0.8125rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      white-space: nowrap;
      transition: color 0.2s ease;
    }

    // ─── The Latest Showcase Grid (Apple Store Cards) ───────────────────────────
    .apple-showcase-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.5rem;
    }

    .showcase-card {
      position: relative;
      border-radius: 22px;
      padding: 2.25rem 2rem;
      min-height: 380px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
      transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease;

      &:hover {
        transform: translateY(-4px) scale(1.008);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.09);
      }

      &.showcase-dark {
        background: linear-gradient(145deg, #161617 0%, #242426 100%);
        color: #ffffff;

        .showcase-eyebrow { color: rgba(255, 255, 255, 0.65); }
        .showcase-title   { color: #ffffff; }
        .showcase-desc    { color: rgba(255, 255, 255, 0.8); }
      }

      &.showcase-light {
        background: #ffffff;
        border: 1px solid rgba(0, 0, 0, 0.06);
        color: #1d1d1f;

        .showcase-eyebrow { color: #86868b; }
        .showcase-title   { color: #1d1d1f; }
        .showcase-desc    { color: #515154; }
      }

      &.showcase-eco {
        background: linear-gradient(145deg, #faf7f2 0%, #f4eee3 100%);
        border: 1px solid rgba(180, 140, 90, 0.15);
        color: #1d1d1f;

        .showcase-eyebrow { color: #854d0e; }
        .showcase-title   { color: #1d1d1f; }
        .showcase-desc    { color: #515154; }
      }

      &.showcase-blue {
        background: linear-gradient(145deg, #0b1f3a 0%, #1e3a8a 100%);
        color: #ffffff;

        .showcase-eyebrow { color: #60a5fa; }
        .showcase-title   { color: #ffffff; }
        .showcase-desc    { color: rgba(255, 255, 255, 0.85); }
      }

      &.showcase-purple {
        background: linear-gradient(145deg, #1e0b36 0%, #581c87 100%);
        color: #ffffff;

        .showcase-eyebrow { color: #c084fc; }
        .showcase-title   { color: #ffffff; }
        .showcase-desc    { color: rgba(255, 255, 255, 0.85); }
      }
    }

    .showcase-eyebrow {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
      display: block;
    }

    .showcase-title {
      font-size: 1.625rem;
      font-weight: 700;
      letter-spacing: -0.022em;
      line-height: 1.2;
      margin-bottom: 0.75rem;
    }

    .showcase-desc {
      font-size: 0.9375rem;
      line-height: 1.45;
      margin-bottom: 1.5rem;
      max-width: 320px;
    }

    .showcase-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      margin-top: auto;
    }

    .showcase-visual {
      margin-top: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }

    .visual-badge-foil {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: var(--radius-pill);
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(12px);
      color: #fbbf24;
      font-size: 0.8125rem;
      font-weight: 600;
      border: 1px solid rgba(251, 191, 36, 0.3);
    }

    .visual-badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: var(--radius-pill);
      background: rgba(0, 0, 0, 0.04);
      color: var(--text-secondary);
      font-size: 0.8125rem;
      font-weight: 600;

      .material-icons-outlined {
        color: var(--primary-color);
        font-size: 1.1rem;
      }
    }

    // ─── Metrics Shelf ────────────────────────────────────────────────────────────
    .apple-metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    // ─── Apple Orders Card Container ──────────────────────────────────────────────
    .apple-orders-card {
      background: #ffffff;
      border-radius: 22px;
      border: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
      overflow: hidden;
    }

    .apple-orders-card-header {
      padding: 1.5rem 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      flex-wrap: wrap;
      gap: 1rem;
    }

    .orders-card-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1d1d1f;
      letter-spacing: -0.015em;
    }

    .orders-card-sub {
      font-size: 0.8125rem;
      color: #86868b;
      margin-top: 0.125rem;
    }

    .apple-table-wrap {
      border: none;
      border-radius: 0;
    }

    .empty-apple-state {
      padding: 3.5rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;

      .empty-icon-wrap {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: #e8f2ff;
        color: var(--primary-color);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 1rem;

        .material-icons-outlined { font-size: 2rem; }
      }

      h3 { font-size: 1.125rem; font-weight: 700; margin-bottom: 0.25rem; color: #1d1d1f; }
      p  { color: #86868b; font-size: 0.875rem; max-width: 360px; }
    }

    // ─── Help is Here Shelf (Apple Specialist Cards) ──────────────────────────────
    .help-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .help-card {
      background: #ffffff;
      border-radius: 20px;
      border: 1px solid rgba(0, 0, 0, 0.06);
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
      transition: transform 0.25s ease, box-shadow 0.25s ease;

      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.07);
      }
    }

    .help-card-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #f5f5f7;
      color: var(--primary-color);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;

      .material-icons-outlined { font-size: 1.5rem; }
    }

    .help-tag {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #86868b;
      text-transform: uppercase;
      margin-bottom: 0.375rem;
      display: block;
    }

    .help-title {
      font-size: 1.125rem;
      font-weight: 700;
      letter-spacing: -0.015em;
      color: #1d1d1f;
      line-height: 1.25;
      margin-bottom: 0.5rem;
    }

    .help-desc {
      font-size: 0.8125rem;
      color: #515154;
      line-height: 1.45;
      margin-bottom: 1.25rem;
    }

    .help-link {
      font-size: 0.8125rem;
      color: var(--primary-color);
      font-weight: 600;
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }

    // ─── The PrintShop Difference (Value Props) ──────────────────────────────────
    .difference-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.75rem;
    }

    .difference-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      .diff-icon {
        font-size: 2.25rem;
        color: var(--primary-color);
        margin-bottom: 0.25rem;
      }

      h4 {
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: -0.012em;
        color: #1d1d1f;
      }

      p {
        font-size: 0.8125rem;
        color: #6e6e73;
        line-height: 1.45;
      }
    }
  `],
})
/**
 * Customer dashboard class handling reactive aggregation of client orders,
 * quotes, artwork approvals, and active promotional deals.
 */
export class CustomerDashboard implements OnInit {
  isLoading = true;
  totalOrders = 0;
  pendingOrders = 0;
  completedOrders = 0;
  pendingQuotations = 0;
  pendingDesigns = 0;
  recentOrders: any[] = [];
  offers: Offer[] = [];

  get firstName(): string {
    const u = this.authService.currentUser();
    if (!u) return 'there';
    if (u.full_name) return u.full_name.split(' ')[0];
    return u.email.split('@')[0];
  }

  constructor(
    private authService: AuthService,
    private orderService: OrderService,
    private quotationService: QuotationService,
    private designService: DesignService,
    private offerService: OfferService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.isLoading = true;
    this.cdr.markForCheck();

    forkJoin({
      orders:     this.orderService.getMyOrders(1, 20).pipe(catchError(() => of(null))),
      quotations: this.quotationService.getMyQuotations().pipe(catchError(() => of(null))),
      designs:    this.designService.getMyDesigns().pipe(catchError(() => of(null))),
      offers:     this.offerService.getAll(false).pipe(catchError(() => of(null))),
    }).subscribe({
      next: (results) => {
        if (results.offers?.success && Array.isArray(results.offers.data)) {
          this.offers = results.offers.data;
        }

        if (results.orders?.success) {
          const oData: any = results.orders.data;
          const allOrders: any[] = Array.isArray(oData) ? oData : (oData?.items ?? []);
          this.recentOrders = allOrders.slice(0, 5);
          this.totalOrders  = oData?.total ?? (results.orders as any)?.meta?.total ?? allOrders.length;
          
          this.pendingOrders = allOrders.filter(
            (o: any) => ['pending', 'quoted', 'confirmed', 'design_review'].includes((o.status || '').toLowerCase())
          ).length;

          this.completedOrders = allOrders.filter(
            (o: any) => ['completed', 'delivered'].includes((o.status || '').toLowerCase())
          ).length;
        }

        if (results.quotations?.success) {
          const qData: any = results.quotations.data;
          const qItems: any[] = Array.isArray(qData) ? qData : (qData?.items ?? []);
          this.pendingQuotations = qItems.filter(
            (q: any) => q.status === 'sent'
          ).length;
        }

        if (results.designs?.success) {
          const dData: any = results.designs.data;
          const dItems: any[] = Array.isArray(dData) ? dData : (dData?.items ?? []);
          this.pendingDesigns = dItems.filter(
            (d: any) => d.approval_status === 'under_review' || d.approval_status === 'pending'
          ).length;
        }

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }
}
