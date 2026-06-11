import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

export interface SharedAuthConfig {
  /** URL de base de l'API backend — ex: http://localhost:5095 */
  apiUrl: string;
}

export const SHARED_AUTH_CONFIG = new InjectionToken<SharedAuthConfig>('shared-auth.config');

/** À appeler dans app.config.ts de chaque application */
export function provideSharedAuth(config: SharedAuthConfig): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: SHARED_AUTH_CONFIG, useValue: config }]);
}
