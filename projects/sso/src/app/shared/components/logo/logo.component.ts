import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="logo" [class.light]="light">
      <img src="images/poulina.png" alt="Poulina Group Holding" class="logo-img" />
    </div>
  `,
  styles: [
    `
      .logo {
        display: flex;
        align-items: center;
      }
      .logo-img {
        height: 40px;
        width: auto;
        display: block;
      }
    `,
  ],
})
export class LogoComponent {
  @Input() light = false;
}
