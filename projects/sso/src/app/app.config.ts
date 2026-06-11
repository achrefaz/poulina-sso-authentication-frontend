import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { bearerInterceptor, provideSharedAuth } from 'shared-auth';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([bearerInterceptor])),
    provideSharedAuth({ apiUrl: 'http://localhost:5095' }),
  ],
};
