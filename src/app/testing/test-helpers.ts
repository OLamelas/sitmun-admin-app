import { Provider } from '@angular/core';

import { ErrorHandlerService } from '@app/services/error-handler.service';
import { LogLevel } from '@app/services/log-level.enum';
import { LoggerService } from '@app/services/logger.service';

/**
 * Test helper to configure LoggerService for tests.
 * Sets log level to Error so Debug/Info/Warning are not printed and tests stay quiet.
 *
 * @param loggerService - The LoggerService instance from TestBed
 */
export function configureLoggerForTests(loggerService: LoggerService): void {
  loggerService.setLogLevel(LogLevel.Error);
}

/**
 * TestBed provider that replaces {@link ErrorHandlerService} with no-op mocks.
 *
 * <p>Form components extending {@code BaseFormComponent} run {@code fetchData()} from
 * {@code ngOnInit}; without a backend, HTTP fails and the real handler opens {@code MatSnackBar},
 * which schedules overlay work after the test fixture is destroyed (NG0406 / NG0205, "Cannot log
 * after tests are done").
 */
export function provideErrorHandlerForTests(): Provider {
  const noop = (): null => null;
  return {
    provide: ErrorHandlerService,
    useFactory: (): ErrorHandlerService =>
      ({
        handleError: noop,
        handleDataNotFound: noop,
        missingRequiredFields: noop
      }) as unknown as ErrorHandlerService
  };
}
