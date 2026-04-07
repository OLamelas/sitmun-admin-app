import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';

import {CookieService} from 'ngx-cookie-service';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {LoginMethod} from "@app/components/login/login.component";

import {ResourceService} from '../hal';

/** Authentication service*/
@Injectable()
export class AuthService {

  /** API resource path */
  public AUTH_API = 'authenticate';

  public AUTH_METHODS_API = 'auth/enabled-methods';

  /** constructor*/
  constructor(
    private readonly http: HttpClient,
    private readonly resourceService: ResourceService,
    private readonly cookieService: CookieService
  ) {
  }

  /** login operation */
  login(credentials): Observable<any> {
    const data = {
      username: credentials.username,
      password: credentials.password
    };

    return this.http.post(
      this.resourceService.getResourceUrl(this.AUTH_API),
      data,
      {observe: 'response', withCredentials: true}
    ).pipe(
      map(this.authenticateSuccess.bind(this))
    );
  }

  private authenticateSuccess(resp) {
    return resp.ok;
  }

  /** login operation with jwt token */
  loginWithToken(jwt) {
    if (jwt) {
      return Promise.resolve(jwt);
    } else {
      return Promise.reject(new Error('auth-jwt-service Promise reject'));
    }
  }

  /** logout operation */
  logout(): Observable<any> {
    return new Observable((observer) => {
      this.cookieService.delete('jwt_token', '/');
      observer.complete();
    });
  }

  getEnabledAuthMethods(): Observable<LoginMethod[]> {
    return this.http.get<any>(this.resourceService.getResourceUrl(this.AUTH_METHODS_API));
  }

}
