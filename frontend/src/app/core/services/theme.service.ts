import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'printshop-theme';

  /** Reactive signal holding the current theme */
  theme = signal<Theme>(this._loadInitialTheme());

  isDark = signal<boolean>(this.theme() === 'dark');

  constructor() {
    // Apply theme to the DOM whenever it changes
    effect(() => {
      const t = this.theme();
      this.isDark.set(t === 'dark');
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem(this.STORAGE_KEY, t);
    });
  }

  toggle() {
    this.theme.update(t => (t === 'dark' ? 'light' : 'dark'));
  }

  private _loadInitialTheme(): Theme {
    const stored = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    if (stored === 'dark' || stored === 'light') return stored;
    // Respect OS preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
