import { Injectable, Injector } from '@angular/core';

import { RestService } from '@app/core/hal/rest/rest.service';

import { TaskRelation } from '../models/task-relation.model';

/** TaskRelation manager service */
@Injectable()
export class TaskRelationService extends RestService<TaskRelation> {
  constructor(injector: Injector) {
    super(TaskRelation, 'task-relations', injector);
  }
}
