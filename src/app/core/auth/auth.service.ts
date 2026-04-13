import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Router} from '@angular/router';

import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {LoginMethod} from "@app/components/login/login.component";

import {ResourceService} from '../hal';

/** Authentication service*/
@Injectable()
export class AuthService {

  /** API resource path */
  public AUTH_API = 'authenticate';

  public LOGOUT_API = `${this.AUTH_API}/logout`;

  public AUTH_METHODS_API = 'auth/enabled-methods';

  /** constructor*/
  constructor(
    private readonly http: HttpClient,
    private readonly resourceService: ResourceService,
    private readonly router: Router
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

  /** logout operation */
  logout(): Observable<any> {
    this.http
      .post<void>(this.resourceService.getResourceUrl(this.LOGOUT_API),
        null,
        {observe: 'response', withCredentials: true})
      .subscribe(() => {
        this.router.navigate(['login']);
      });
    return new Observable((observer) => {
      observer.complete();
    });
  }

  getEnabledAuthMethods(): Observable<LoginMethod[]> {
    return this.http.get<any>(this.resourceService.getResourceUrl(this.AUTH_METHODS_API));
  }

}
