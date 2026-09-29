import { Component, computed, signal } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ToastComponent } from '../../components/toast/toast.component';
import { CUSTOMER_NAV_ITEMS } from '../nav.config';

@Component({
  selector: 'app-customer-layout',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule, ToastComponent],
  templateUrl: './customer-layout.html',
  styleUrl: './customer-layout.scss',
})
export class CustomerLayout {
  isMobileMenuOpen = signal(false);

  navItems = CUSTOMER_NAV_ITEMS;

  userInitials = computed(() => {
    const u = this.authService.currentUser();
    if (!u) return '?';
    if (u.full_name) return u.full_name.substring(0, 2).toUpperCase();
    return u.email.substring(0, 2).toUpperCase();
  });

  userName = computed(() => {
    const u = this.authService.currentUser();
    return u?.full_name || u?.email || 'Customer';
  });

  constructor(public authService: AuthService) {}

  toggleMenu() { this.isMobileMenuOpen.update(v => !v); }
  closeMenu()  { this.isMobileMenuOpen.set(false); }
  logout()     { this.authService.logout(true, { portal: 'customer' }); }
}
