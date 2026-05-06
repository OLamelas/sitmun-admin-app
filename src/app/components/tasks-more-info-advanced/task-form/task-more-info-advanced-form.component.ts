import {Component} from '@angular/core';
import {FormControl, FormGroup, FormGroupDirective, NgForm, Validators} from '@angular/forms';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {ErrorStateMatcher} from '@angular/material/core';
import {MatDialog} from '@angular/material/dialog';
import {ActivatedRoute, Router} from '@angular/router';

import {TranslateService} from '@ngx-translate/core';
import {firstValueFrom, map, Observable, of, startWith} from 'rxjs';

import {BaseFormComponent} from '@app/components/base-form.component';
import {DataTableDefinition} from '@app/components/data-tables.util';
import {Configuration} from '@app/core/config/configuration';
import {MessagesInterceptorStateService} from '@app/core/interceptors/messages.interceptor';
import {
  Cartography,
  CartographyService,
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
  TranslationService
} from '@app/domain';
import {
  onCreate,
  onDelete,
  onUpdatedRelation,
  Status
} from '@app/frontend-gui/src/lib/data-grid/data-grid.component';
import {ErrorHandlerService} from '@app/services/error-handler.service';
import {LoadingOverlayService} from '@app/services/loading-overlay.service';
import {LoggerService} from '@app/services/logger.service';
import {UtilsService} from '@app/services/utils.service';
import {magic} from '@environments/constants';
import {constants} from '@environments/constants';

/**
 * Properties stored in task.properties for an MIA task.
 * An MIA task is always a container/grouper.
 */
interface MiaTaskProperties {
  parentLayout?: string;
  childTaskOrderIds?: number[];
  moreInfoAdvanced?: boolean;
  parameters?: unknown[];
}

@Component({
  selector: 'app-task-more-info-advanced-form',
  templateUrl: './task-more-info-advanced-form.component.html',
  styleUrl: './task-more-info-advanced-form.component.scss',
  standalone: false
})
export class TaskMoreInfoAdvancedFormComponent extends BaseFormComponent<TaskProjection> {
  readonly config = Configuration.TASK_MORE_INFO_ADVANCED;

  public override entityForm: FormGroup;

  protected readonly rolesTable: DataTableDefinition<Role, Role>;
  protected readonly availabilitiesTable: DataTableDefinition<TaskAvailabilityProjection, TerritoryProjection>;

  private taskType: TaskType = null;
  private readonly taskTypeId = magic.taskMoreInfoAdvancedTypeId;

  /** Task type IDs allowed as children of an MIA task: query (5) + template (15) */
  private readonly allowedChildTypeIds = [magic.taskQueryTypeId, magic.taskTemplateTypeId]; // 5, 15

  /** Scope to exclude within query tasks: cartography queries cannot be included */
  private readonly excludedScope = constants.codeValue.queryTaskScope.cartographyQuery;

  protected taskTypeNameTranslated: string = null;
  protected taskGroups: TaskGroup[] = [];
  protected cartographies: Cartography[] = [];

  /** All candidate tasks that can be included as children */
  private allCandidateTasks: TaskProjection[] = [];

  /** Currently included tasks in display order */
  protected includedTasks: TaskProjection[] = [];

  // Cartography autocomplete
  protected cartographySearchControl = new FormControl<string | Cartography>('', {
    validators: [Validators.required, this.cartographyValidator.bind(this)],
    nonNullable: true
  });
  protected filteredCartographies: Observable<Cartography[]> = of([]);
  protected cartographyErrorMatcher = new CartographyErrorStateMatcher();

  // Add task autocomplete
  protected addTaskControl = new FormControl<string | TaskProjection>('');
  protected filteredAvailableTasks: Observable<TaskProjection[]> = of([]);

  protected readonly parentLayouts: Array<{ value: string, key: string }> = [
    {value: 'tabs', key: 'tasksMoreInfoAdvancedEntity.parentLayout.tabs'},
    {value: 'scroll', key: 'tasksMoreInfoAdvancedEntity.parentLayout.scroll'}
  ];

  protected validationFieldLabels: Record<string, string> = {
    'name': 'entity.task.label',
    'taskGroupId': 'tasksMoreInfoAdvancedEntity.taskGroup',
    'cartographyId': 'tasksMoreInfoAdvancedEntity.cartography'
  };

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
    protected cartographyService: CartographyService,
    protected utils: UtilsService,
    protected roleService: RoleService,
    protected territoryService: TerritoryService,
    protected taskAvailabilityService: TaskAvailabilityService
  ) {
    super(dialog, translateService, translationService, codeListService, loggerService, errorHandler, activatedRoute, router, loadingService, messagesInterceptorState);
    this.rolesTable = this.defineRolesTable();
    this.availabilitiesTable = this.defineAvailabilitiesTable();
  }

  override async preFetchData(): Promise<void> {
    this.dataTables.register(this.rolesTable)
      .register(this.availabilitiesTable);

    this.initTranslations('Task', ['name']);

    const [taskTypes, taskGroups, cartographies, candidateTasks] = await Promise.all([
      firstValueFrom(this.taskTypeService.getAllEx()),
      firstValueFrom(this.taskGroupService.getAllEx()),
      firstValueFrom(this.cartographyService.getAll()),
      this.fetchCandidateChildTasks()
    ]);

    this.taskType = taskTypes.find(t => t.id === this.taskTypeId);
    if (!this.taskType) {
      this.loggerService.error(`Task type ${this.taskTypeId} not found`);
    }

    this.taskTypeNameTranslated = this.translateService.instant('entity.task.moreInfoAdvanced.label');
    this.taskGroups = (taskGroups || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    this.cartographies = cartographies;
    this.allCandidateTasks = candidateTasks;
  }

  override async fetchRelatedData(): Promise<void> {
    return this.loadTranslations(this.entityToEdit);
  }

  override fetchOriginal(): Promise<TaskProjection> {
    return firstValueFrom(this.taskService.getProjection(TaskProjection, this.entityID));
  }

  override fetchCopy(): Promise<TaskProjection> {
    return firstValueFrom(this.taskService.getProjection(TaskProjection, this.duplicateID).pipe(map((copy: TaskProjection) => {
      copy.name = this.translateService.instant('copy_') + copy.name;
      return copy;
    })));
  }

  override empty(): TaskProjection {
    return new TaskProjection();
  }

  override postFetchData(): void {
    const properties = this.getMiaProperties(this.entityToEdit?.properties);

    this.entityForm = new FormGroup({
      name: new FormControl(this.entityToEdit.name, {
        validators: [Validators.required],
        nonNullable: true
      }),
      taskGroupId: new FormControl(this.entityToEdit.groupId, {
        validators: [Validators.required],
        nonNullable: true
      }),
      cartographyId: new FormControl(this.entityToEdit.cartographyId, {
        validators: [Validators.required],
        nonNullable: true
      }),
      parentLayout: new FormControl(properties.parentLayout || 'tabs', {
        nonNullable: true
      })
    });

    // Restore included tasks from stored order
    this.restoreIncludedTasks(properties);

    // Cartography autocomplete setup
    const selectedCartography = this.cartographies.find(c => c.id === this.entityToEdit.cartographyId);
    this.cartographySearchControl.setValue(selectedCartography || '');
    this.filteredCartographies = this.cartographySearchControl.valueChanges.pipe(
      startWith(this.cartographySearchControl.value),
      map(value => {
        const searchValue = typeof value === 'string' ? value : value?.name || '';
        return this.filterCartographies(searchValue);
      })
    );

    // Add task autocomplete setup
    this.filteredAvailableTasks = this.addTaskControl.valueChanges.pipe(
      startWith(''),
      map(value => {
        const searchValue = typeof value === 'string' ? value : '';
        return this.filterAvailableTasks(searchValue);
      })
    );
  }

  override async createEntity(): Promise<number> {
    const entityToCreate = this.createObject();
    const entityCreated = await firstValueFrom(this.taskService.create(entityToCreate));

    await firstValueFrom(entityCreated.updateRelationEx('type', this.taskType));

    const groupId = this.entityForm.get('taskGroupId')?.value;
    if (typeof groupId === 'number') {
      const proxyGroup = this.taskGroupService.createProxy(groupId);
      await firstValueFrom(entityCreated.updateRelationEx('group', proxyGroup));
    }

    return entityCreated.id;
  }

  override async updateEntity(): Promise<void> {
    const entityToUpdate = this.createObject(this.entityID);
    await firstValueFrom(this.taskService.update(entityToUpdate));

    const groupId = this.entityForm.get('taskGroupId')?.value;
    if (typeof groupId === 'number') {
      const proxyGroup = this.taskGroupService.createProxy(groupId);
      await firstValueFrom(this.entityToEdit.updateRelationEx('group', proxyGroup));
    }
  }

  override async updateDataRelated(_isDuplicated: boolean): Promise<void> {
    await this.saveTranslations(this.entityToEdit);

    const cartographyId = this.entityForm.get('cartographyId')?.value;
    if (typeof cartographyId === 'number') {
      await firstValueFrom(this.entityToEdit.updateRelationEx('cartography', this.cartographyService.createProxy(cartographyId)));
    } else {
      await firstValueFrom(this.entityToEdit.deleteAllRelation('cartography'));
    }
  }

  createObject(id: number = null): Task {
    let safeToEdit = TaskProjection.fromObject(this.entityToEdit);
    const values = this.entityForm.getRawValue();

    const properties: MiaTaskProperties = {
      parentLayout: values.parentLayout,
      childTaskOrderIds: this.includedTasks.map(t => t.id),
      moreInfoAdvanced: true,
      parameters: []
    };

    safeToEdit = Object.assign(safeToEdit, {
      id,
      name: values.name,
      cartographyId: values.cartographyId,
      properties
    });

    return Task.fromObject(safeToEdit);
  }

  // --- Cartography helpers ---

  onCartographySelected(event: MatAutocompleteSelectedEvent): void {
    const cartography = event.option.value as Cartography;
    if (cartography?.id) {
      this.entityForm.get('cartographyId')?.setValue(cartography.id);
      this.entityForm.markAsDirty();
      this.cartographySearchControl.updateValueAndValidity();
    }
  }

  displayCartography(cartography: Cartography | string): string {
    if (typeof cartography === 'string') {
      return cartography;
    }
    return cartography?.name || '';
  }

  clearCartography(): void {
    this.cartographySearchControl.setValue('');
    this.entityForm.get('cartographyId')?.setValue(null);
    this.entityForm.markAsDirty();
  }

  // --- Included tasks management ---

  onTaskSelected(event: MatAutocompleteSelectedEvent): void {
    const task = event.option.value as TaskProjection;
    if (task?.id && !this.includedTasks.some(t => t.id === task.id)) {
      this.includedTasks = [...this.includedTasks, task];
      this.entityForm.markAsDirty();
    }
    // Clear the input after selection
    this.addTaskControl.setValue('');
  }

  displayTask(task: TaskProjection | string): string {
    if (typeof task === 'string') {
      return task;
    }
    return '';
  }

  moveTaskUp(index: number): void {
    if (index <= 0) return;
    const tasks = [...this.includedTasks];
    [tasks[index - 1], tasks[index]] = [tasks[index], tasks[index - 1]];
    this.includedTasks = tasks;
    this.entityForm.markAsDirty();
  }

  moveTaskDown(index: number): void {
    if (index >= this.includedTasks.length - 1) return;
    const tasks = [...this.includedTasks];
    [tasks[index], tasks[index + 1]] = [tasks[index + 1], tasks[index]];
    this.includedTasks = tasks;
    this.entityForm.markAsDirty();
  }

  removeTask(index: number): void {
    this.includedTasks = this.includedTasks.filter((_, i) => i !== index);
    this.entityForm.markAsDirty();
  }

  getTaskTypeName(task: TaskProjection): string {
    return task.typeName || this.translateService.instant('common.form.unknown');
  }

  // --- Private helpers ---

  private async fetchCandidateChildTasks(): Promise<TaskProjection[]> {
    const allTasks = await firstValueFrom(
      this.taskService.getAllProjection(TaskProjection)
    );
    return (allTasks || []).filter(task =>
      this.allowedChildTypeIds.includes(task.typeId) &&
      !(task.typeId === magic.taskQueryTypeId && task.properties?.['scope'] === this.excludedScope) &&
      task.id !== this.entityID
    );
  }

  private getMiaProperties(raw: unknown): MiaTaskProperties {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {};
    }
    return {...(raw as MiaTaskProperties)};
  }

  private restoreIncludedTasks(properties: MiaTaskProperties): void {
    const storedIds = this.normalizeIds(properties.childTaskOrderIds);
    const byId = new Map(this.allCandidateTasks.map(t => [t.id, t]));
    this.includedTasks = storedIds
      .map(id => byId.get(id))
      .filter((t): t is TaskProjection => !!t);
  }

  private normalizeIds(ids: unknown): number[] {
    if (!Array.isArray(ids)) {
      return [];
    }
    return ids
      .filter(id => typeof id === 'number')
      .filter((id, index, arr) => arr.indexOf(id) === index);
  }

  private filterCartographies(value?: string): Cartography[] {
    const filterValue = (value || '').toLowerCase();
    return this.cartographies.filter(c => (c.name || '').toLowerCase().includes(filterValue));
  }

  private filterAvailableTasks(searchValue: string): TaskProjection[] {
    const includedIds = new Set(this.includedTasks.map(t => t.id));
    const available = this.allCandidateTasks.filter(t => !includedIds.has(t.id));

    if (!searchValue || searchValue.trim().length === 0) {
      return available.slice(0, 50); // Limit initial display
    }

    const filter = searchValue.toLowerCase();
    return available.filter(t =>
      (t.name || '').toLowerCase().includes(filter) ||
      String(t.id).includes(filter)
    ).slice(0, 50);
  }

  private cartographyValidator(control: FormControl): { [key: string]: any } | null {
    const value = control.value;
    if (!value) {
      return null;
    }

    if (typeof value === 'object' && value?.id) {
      setTimeout(() => {
        if (this.entityForm) {
          this.entityForm.get('cartographyId')?.setValue(value.id, {emitEvent: false});
          this.entityForm.markAsDirty();
        }
      });
      return null;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const match = this.cartographies.find(
        c => c.name?.toLowerCase() === value.trim().toLowerCase()
      );
      if (match) {
        setTimeout(() => {
          if (this.entityForm) {
            this.entityForm.get('cartographyId')?.setValue(match.id, {emitEvent: false});
            this.entityForm.markAsDirty();
          }
        });
        return null;
      }
      return {invalidCartography: true};
    }

    return null;
  }

  // --- Table definitions (roles & territories) ---

  private defineRolesTable(): DataTableDefinition<Role, Role> {
    return DataTableDefinition.builder<Role, Role>(this.dialog, this.errorHandler, this.loadingService)
      .withRelationsColumns([
        this.utils.getSelCheckboxColumnDef(),
        this.utils.getRouterLinkColumnDef(
          'common.form.name',
          'name',
          '/role/:id/roleForm',
          {id: 'id'}
        ),
        this.utils.getNonEditableColumnDef('common.form.description', 'description'),
        this.utils.getStatusColumnDef()
      ])
      .withRelationsOrder('name')
      .withRelationsFetcher(() => {
        if (this.isNew()) {
          return of([]);
        }
        return this.entityToEdit.getRelationArrayEx(Role, 'roles', {projection: 'view'});
      })
      .withRelationsUpdater(async (roles: (Role & Status)[]) => {
        await onUpdatedRelation(roles).forAll(item => this.entityToEdit.substituteAllRelation('roles', item));
      })
      .withTargetsColumns([
        this.utils.getSelCheckboxColumnDef(),
        this.utils.getNonEditableColumnDef('common.form.name', 'name'),
        this.utils.getNonEditableColumnDef('common.form.description', 'description')
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
        this.utils.getRouterLinkColumnDef(
          'common.form.name',
          'territoryName',
          '/territory/:id/territoryForm',
          {id: 'territoryId'}
        ),
        this.utils.getNonEditableColumnDef('common.form.code', 'territoryCode'),
        this.utils.getNonEditableColumnDef('common.form.type', 'territoryTypeName'),
        this.utils.getNonEditableDateColumnDef('common.form.created', 'createdDate'),
        this.utils.getStatusColumnDef()
      ])
      .withRelationsOrder('territoryName')
      .withRelationsFetcher(() => {
        if (!this.isNew()) {
          return this.entityToEdit.getRelationArrayEx(TaskAvailabilityProjection, 'availabilities', {projection: 'view'});
        }
        return of([]);
      })
      .withRelationsUpdater(async (availabilities: (TaskAvailabilityProjection & Status)[]) => {
        await onDelete(availabilities).forEach(item => this.taskAvailabilityService.delete(this.taskAvailabilityService.createProxy(item.id)));
        await onCreate(availabilities)
          .map(item => TaskAvailability.of(this.taskService.createProxy(this.entityID), this.territoryService.createProxy(item.territoryId)))
          .forEach(item => this.taskAvailabilityService.create(item));
        availabilities.forEach(item => item.newItem = false);
      })
      .withTargetsColumns([
        this.utils.getSelCheckboxColumnDef(),
        this.utils.getNonEditableColumnDef('common.form.name', 'name'),
        this.utils.getNonEditableColumnDef('common.form.code', 'code'),
        this.utils.getNonEditableColumnDef('common.form.type', 'typeName')
      ])
      .withTargetsOrder('name')
      .withTargetsFetcher(() => this.territoryService.getAllProjection(TerritoryProjection))
      .withTargetInclude((availabilities: (TaskAvailabilityProjection)[]) => (item: TerritoryProjection) => {
        return !availabilities.some((availability) => availability.territoryId === item.id);
      })
      .withTargetToRelation((items: TerritoryProjection[]) => {
        return items.map(item => TaskAvailabilityProjection.of(this.entityToEdit, item));
      })
      .withTargetsTitle(this.translateService.instant('entity.task.territories.title'))
      .build();
  }
}

class CartographyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, _form: FormGroupDirective | NgForm | null): boolean {
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
