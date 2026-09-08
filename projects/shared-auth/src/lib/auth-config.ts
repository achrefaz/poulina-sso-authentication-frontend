import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

export interface SharedAuthConfig {

  apiUrl: string;
}

export const SHARED_AUTH_CONFIG = new InjectionToken<SharedAuthConfig>('shared-auth.config');


export function provideSharedAuth(config: SharedAuthConfig): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: SHARED_AUTH_CONFIG, useValue: config }]);
}
