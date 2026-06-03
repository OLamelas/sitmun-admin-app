import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, map, of } from 'rxjs';

import { BaseFormComponent } from '@app/components/base-form.component';
import { DataTableDefinition } from '@app/components/data-tables.util';
import { Configuration } from '@app/core/config/configuration';
import { MessagesInterceptorStateService } from '@app/core/interceptors/messages.interceptor';
import {
  CodeListService,
  Role,
  RoleService,
  Task,
  TaskAvailability,
  TaskAvailabilityProjection,
  TaskAvailabilityService,
  TaskGroup,
  TaskGroupService,
  TaskProjection,
  TaskService,
  TaskType,
  TaskTypeService,
  TerritoryProjection,
  TerritoryService,
  TranslationService,
} from '@app/domain';
import { onCreate, onDelete, onUpdatedRelation, Status } from '@app/frontend-gui/src/lib/data-grid/data-grid.component';
import { ErrorHandlerService } from '@app/services/error-handler.service';
import { LoadingOverlayService } from '@app/services/loading-overlay.service';
import { LoggerService } from '@app/services/logger.service';
import { UtilsService } from '@app/services/utils.service';
import { magic } from '@environments/constants';

interface DocumentExportTaskProperties {
  exportEngine?: string;
  downloadFormat?: string;
  downloadSource?: string;
}

@Component({
  selector: 'app-task-document-export-form',
  templateUrl: './task-document-export-form.component.html',
  styles: [],
  standalone: false,
})
export class TaskDocumentExportFormComponent extends BaseFormComponent<TaskProjection> {
  readonly config = Configuration.TASK_DOCUMENT_EXPORT;

  public override entityForm: FormGroup;

  protected readonly rolesTable: DataTableDefinition<Role, Role>;
  protected readonly availabilitiesTable: DataTableDefinition<TaskAvailabilityProjection, TerritoryProjection>;

  protected taskGroupList: TaskGroup[] = [];

  protected validationFieldLabels: Record<string, string> = {
    name: 'common.form.name',
    taskGroupId: 'entity.taskGroup.label',
    exportEngine: 'entity.task.documentExport.engine',
    output: 'entity.task.documentExport.output',
    sourcePath: 'entity.task.documentExport.sourcePath',
  };

  private taskType: TaskType = null;

  constructor(
    dialog: MatDialog,
    translateService: TranslateService,
    translationService: TranslationService,
    codeListService: CodeListService,
    loggerService: LoggerService,
    errorHandler: ErrorHandlerService,
    activatedRoute: ActivatedRoute,
    router: Router,
    loadingService: LoadingOverlayService,
    messagesInterceptorState: MessagesInterceptorStateService,
    protected taskService: TaskService,
    protected taskTypeService: TaskTypeService,
    protected taskGroupService: TaskGroupService,
    protected roleService: RoleService,
    protected territoryService: TerritoryService,
    protected taskAvailabilityService: TaskAvailabilityService,
    protected utils: UtilsService,
  ) {
    super(
      dialog,
      translateService,
      translationService,
      codeListService,
      loggerService,
      errorHandler,
      activatedRoute,
      router,
      loadingService,
      messagesInterceptorState,
    );

    this.rolesTable = this.defineRolesTable();
    this.availabilitiesTable = this.defineAvailabilitiesTable();
  }

  override async preFetchData(): Promise<void> {
    this.dataTables.register(this.rolesTable).register(this.availabilitiesTable);
    this.initTranslations('Task', ['name']);
    await this.initCodeLists(['documentExport.engine', 'documentExport.output']);

    const [taskTypes, taskGroups] = await Promise.all([
      firstValueFrom(this.taskTypeService.getAllEx()),
      firstValueFrom(this.taskGroupService.getAllEx()),
    ]);

    this.taskType = taskTypes.find((taskType) => taskType.id === magic.taskDocumentExportTypeId) ?? null;
    if (!this.taskType) {
      this.loggerService.warn(`Document export task type ${magic.taskDocumentExportTypeId} not found yet in backend catalog`);
    }

    this.taskGroupList = taskGroups;
  }

  override async fetchRelatedData(): Promise<void> {
    return this.loadTranslations(this.entityToEdit);
  }

  override fetchOriginal(): Promise<TaskProjection> {
    return firstValueFrom(this.taskService.getProjection(TaskProjection, this.entityID));
  }

  override fetchCopy(): Promise<TaskProjection> {
    return firstValueFrom(
      this.taskService.getProjection(TaskProjection, this.duplicateID).pipe(
        map((copy: TaskProjection) => {
          copy.name = this.translateService.instant('copy_') + copy.name;
          return copy;
        }),
      ),
    );
  }

  override empty(): TaskProjection {
    return new TaskProjection();
  }

  override postFetchData(): void {
    const properties = this.getDocumentExportProperties(this.entityToEdit?.properties);

    this.entityForm = new FormGroup({
      name: new FormControl(this.entityToEdit.name, {
        validators: [Validators.required],
        nonNullable: true,
      }),
      taskGroupId: new FormControl(this.entityToEdit.groupId, {
        validators: [Validators.required],
        nonNullable: true,
      }),
      exportEngine: new FormControl(properties.exportEngine ?? null, {
        validators: [Validators.required],
      }),
      output: new FormControl(properties.downloadFormat ?? null, {
        validators: [Validators.required],
      }),
      sourcePath: new FormControl(properties.downloadSource ?? '', {
        nonNullable: true,
      }),
    });
  }

  override async createEntity(): Promise<number> {
    const entityToCreate = this.createObject();
    const entityCreated = await firstValueFrom(this.taskService.create(entityToCreate));

    if (this.taskType) {
      await firstValueFrom(entityCreated.updateRelationEx('type', this.taskType));
    }

    const groupId = this.entityForm.get('taskGroupId')?.value;
    if (typeof groupId === 'number') {
      await firstValueFrom(entityCreated.updateRelationEx('group', this.taskGroupService.createProxy(groupId)));
    }

    return entityCreated.id;
  }

  override async updateEntity(): Promise<void> {
    const entityToUpdate = this.createObject(this.entityID);
    await firstValueFrom(this.taskService.update(entityToUpdate));

    const groupId = this.entityForm.get('taskGroupId')?.value;
    if (typeof groupId === 'number') {
      await firstValueFrom(this.entityToEdit.updateRelationEx('group', this.taskGroupService.createProxy(groupId)));
    }
  }

  override async updateDataRelated(_isDuplicated: boolean): Promise<void> {
    await this.saveTranslations(this.entityToEdit);
  }

  createObject(id: number = null): Task {
    let safeToEdit = TaskProjection.fromObject(this.entityToEdit);
    const values = this.entityForm.getRawValue();
    const properties: DocumentExportTaskProperties = {
      exportEngine: values.exportEngine ?? undefined,
      downloadFormat: values.output ?? undefined,
    };
    const normalizedSourcePath = this.normalizeOptionalText(values.sourcePath);
    if (normalizedSourcePath) {
      properties.downloadSource = normalizedSourcePath;
    }

    safeToEdit = Object.assign(safeToEdit, {
      id,
      name: values.name,
      properties,
    });

    return Task.fromObject(safeToEdit);
  }

  private getDocumentExportProperties(raw: unknown): DocumentExportTaskProperties {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {};
    }
    return { ...(raw as DocumentExportTaskProperties) };
  }

  private normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : undefined;
  }

  private defineRolesTable(): DataTableDefinition<Role, Role> {
    return DataTableDefinition.builder<Role, Role>(this.dialog, this.errorHandler, this.loadingService)
      .withRelationsColumns([
        this.utils.getSelCheckboxColumnDef(),
        this.utils.getRouterLinkColumnDef('common.form.name', 'name', '/role/:id/roleForm', { id: 'id' }),
        this.utils.getNonEditableColumnDef('common.form.description', 'description'),
        this.utils.getStatusColumnDef(),
      ])
      .withRelationsOrder('name')
      .withRelationsFetcher(() => {
        if (this.isNew()) {
          return of([]);
        }
        return this.entityToEdit.getRelationArrayEx(Role, 'roles', { projection: 'view' });
      })
      .withRelationsUpdater(async (roles: (Role & Status)[]) => {
        await onUpdatedRelation(roles).forAll((item) => this.entityToEdit.substituteAllRelation('roles', item));
      })
      .withTargetsColumns([
        this.utils.getSelCheckboxColumnDef(),
        this.utils.getNonEditableColumnDef('common.form.name', 'name'),
        this.utils.getNonEditableColumnDef('common.form.description', 'description'),
      ])
      .withTargetsOrder('name')
      .withTargetsFetcher(() => this.roleService.getAll())
      .withTargetsTitle(this.translateService.instant('entity.task.roles.title'))
      .build();
  }

  private defineAvailabilitiesTable(): DataTableDefinition<TaskAvailabilityProjection, TerritoryProjection> {
    return DataTableDefinition.builder<TaskAvailabilityProjection, TerritoryProjection>(this.dialog, this.errorHandler, this.loadingService)
      .withRelationsColumns([
        this.utils.getSelCheckboxColumnDef(),
        this.utils.getRouterLinkColumnDef('common.form.name', 'territoryName', '/territory/:id/territoryForm', { id: 'territoryId' }),
        this.utils.getNonEditableColumnDef('common.form.code', 'territoryCode'),
        this.utils.getNonEditableColumnDef('common.form.type', 'territoryTypeName'),
        this.utils.getNonEditableDateColumnDef('common.form.created', 'createdDate'),
        this.utils.getStatusColumnDef(),
      ])
      .withRelationsOrder('territoryName')
      .withRelationsFetcher(() => {
        if (!this.isNew()) {
          return this.entityToEdit.getRelationArrayEx(TaskAvailabilityProjection, 'availabilities', { projection: 'view' });
        }
        return of([]);
      })
      .withRelationsUpdater(async (availabilities: (TaskAvailabilityProjection & Status)[]) => {
        await onDelete(availabilities).forEach((item) => this.taskAvailabilityService.delete(this.taskAvailabilityService.createProxy(item.id)));
        await onCreate(availabilities)
          .map((item) => TaskAvailability.of(this.taskService.createProxy(this.entityID), this.territoryService.createProxy(item.territoryId)))
          .forEach((item) => this.taskAvailabilityService.create(item));
        availabilities.forEach((item) => {
          item.newItem = false;
        });
      })
      .withTargetsColumns([
        this.utils.getSelCheckboxColumnDef(),
        this.utils.getNonEditableColumnDef('common.form.name', 'name'),
        this.utils.getNonEditableColumnDef('common.form.code', 'code'),
        this.utils.getNonEditableColumnDef('common.form.type', 'typeName'),
      ])
      .withTargetsOrder('name')
      .withTargetsFetcher(() => this.territoryService.getAllProjection(TerritoryProjection))
      .withTargetInclude((availabilities: TaskAvailabilityProjection[]) => (item: TerritoryProjection) => {
        return !availabilities.some((availability) => availability.territoryId === item.id);
      })
      .withTargetToRelation((items: TerritoryProjection[]) => items.map((item) => TaskAvailabilityProjection.of(this.entityToEdit, item)))
      .withTargetsTitle(this.translateService.instant('entity.task.territories.title'))
      .build();
  }
}