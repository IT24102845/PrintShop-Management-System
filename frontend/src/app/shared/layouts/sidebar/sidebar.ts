import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { STAFF_NAV_ITEMS, CUSTOMER_NAV_ITEMS } from '../nav.config';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  isMobileOpen = signal(false);

  visibleNavItems = computed(() => {
    const role = this.authService.currentUser()?.role ?? '';
    if (role === 'customer') {
      return CUSTOMER_NAV_ITEMS;
    }
    return STAFF_NAV_ITEMS.filter(item => item.roles.includes(role));
  });

  userName = computed(() => {
    const u = this.authService.currentUser();
    return u?.full_name || u?.email || 'User';
  });

  userRole = computed(() => {
    return this.authService.currentUser()?.role?.replace(/_/g, ' ') || '';
  });

  userInitials = computed(() => {
    const u = this.authService.currentUser();
    if (!u) return '?';
    if (u.full_name) return u.full_name.substring(0, 2).toUpperCase();
    return u.email.substring(0, 2).toUpperCase();
  });

  constructor(public authService: AuthService) {}

  toggleMobile() { this.isMobileOpen.update(v => !v); }
  closeMobile()  { this.isMobileOpen.set(false); }
  logout()       { this.authService.logout(); }
}
