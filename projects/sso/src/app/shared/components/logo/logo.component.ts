import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="logo" [class.light]="light">
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="20" cy="20" rx="18" ry="18" stroke="currentColor" stroke-width="2"/>
        <path d="M12 28 C12 20 20 12 28 14" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round"/>
        <path d="M20 10 C20 18 28 22 28 30" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round"/>
      </svg>
      <div class="logo-text">
        <strong>POULINA</strong>
        <span>Group Holding</span>
      </div>
    </div>
  `,
})
export class LogoComponent {
  @Input() light = false;
}
