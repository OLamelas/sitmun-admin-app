import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';

import {Principal} from '@app/core/auth/principal.service';

/** Functional guard to protect authenticated routes */
export const authGuard: CanActivateFn = async () => {
  const principal = inject(Principal);
  const router = inject(Router);

  if (await principal.identity()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};


