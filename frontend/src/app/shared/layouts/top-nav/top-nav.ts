import { Component, computed, ElementRef, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { STAFF_NAV_ITEMS } from '../nav.config';

@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './top-nav.html',
  styleUrl: './top-nav.scss',
})
export class TopNav {
  themeService = inject(ThemeService);
  showProfileMenu = signal(false);


  user = computed(() => this.authService.currentUser());

  visibleNavItems = computed(() => {
    const role = this.user()?.role ?? '';
    return STAFF_NAV_ITEMS.filter(item => item.roles.includes(role));
  });

  userInitials = computed(() => {
    const u = this.user();
    if (!u) return '?';
    if (u.full_name) {
      const parts = u.full_name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return u.full_name.substring(0, 2).toUpperCase();
    }
    return u.email.substring(0, 2).toUpperCase();
  });

  userRole = computed(() => {
    return this.user()?.role?.replace(/_/g, ' ') || '';
  });

  constructor(
    public authService: AuthService,
    private router: Router,
    private elementRef: ElementRef
  ) {}

  toggleProfile() {
    this.showProfileMenu.update(v => !v);
  }

  closeProfile() {
    this.showProfileMenu.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showProfileMenu()) {
      const profileEl = this.elementRef.nativeElement.querySelector('.profile-wrapper');
      if (profileEl && !profileEl.contains(event.target as Node)) {
        this.closeProfile();
      }
    }
  }

  toggleSidebar() {
    document.querySelector('.sidebar')?.classList.toggle('mobile-open');
    document.querySelector('.sidebar-overlay')?.classList.toggle('active');
  }

  goToCustomerPortal() {
    this.closeProfile();
    this.authService.logout(true, { portal: 'customer', returnUrl: '/customer/dashboard' });
  }

  logout() {
    this.authService.logout();
  }
}

