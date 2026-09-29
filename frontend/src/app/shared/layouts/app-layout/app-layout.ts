import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { TopNav } from '../top-nav/top-nav';
import { ToastComponent } from '../../components/toast/toast.component';

@Component({
  selector: 'app-app-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar, TopNav, ToastComponent],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
})
export class AppLayout {}
