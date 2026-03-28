import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { MatIconRegistry } from '@angular/material/icon';
import { appRoutes } from './app.routes';
import { AuthService } from './core/services/auth.service';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Configure Material Icons ligature font globally (for lazy-loaded components)
    provideAppInitializer(() => {
      inject(MatIconRegistry).setDefaultFontSetClass('material-icons', 'mat-ligature-font');
    }),
    provideAppInitializer(() => inject(AuthService).initSession()),
  ],
};
