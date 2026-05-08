import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';

import { Observable } from 'rxjs';

/** Interceptor for authentication cookie in API requests */
export class AuthInterceptor implements HttpInterceptor {

    /** constructor*/
    // Empty constructor - no dependencies needed

    /** request handler */
    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        request = request.clone({
            withCredentials: true
        });

        return next.handle(request);
    }

}
