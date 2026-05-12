import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';

import { TaskProjection } from '@app/domain';

import { TaskQueryFormComponent } from './task-query-form.component';

describe('TaskQueryFormComponent', () => {
  const createSpyObj = (methods: string[]) => {
    return methods.reduce((acc, methodName) => {
      acc[methodName] = jest.fn();
      return acc;
    }, {} as Record<string, jest.Mock>);
  };

  const createComponent = () => {
    TestBed.configureTestingModule({});

    const translateService = createSpyObj(['instant']);
    translateService.instant.mockImplementation((key: string) => key);

    const utilsService = createSpyObj([
      'getSelCheckboxColumnDef',
      'getEditableColumnDef',
      'getRouterLinkColumnDef',
      'getNonEditableColumnDef',
      'getNonEditableColumnWithCodeListDef',
      'getBooleanColumnDef',
      'getStatusColumnDef',
      'addConditionToColumnDef',
      'getRouterLinkColumnDef',
      'getNonEditableDateColumnDef'
    ]);
    utilsService.getSelCheckboxColumnDef.mockReturnValue({ field: '_select' });
    utilsService.getEditableColumnDef.mockImplementation((_label: string, field: string) => ({ field }));
    utilsService.getRouterLinkColumnDef.mockImplementation((_label: string, field: string) => ({ field }));
    utilsService.getNonEditableColumnDef.mockImplementation((_label: string, field: string) => ({ field }));
    utilsService.getNonEditableColumnWithCodeListDef.mockImplementation((_label: string, field: string) => ({ field }));
    utilsService.getBooleanColumnDef.mockImplementation((_label: string, field: string) => ({ field }));
    utilsService.getStatusColumnDef.mockReturnValue({ field: 'status' });
    utilsService.addConditionToColumnDef.mockImplementation((column: any) => column);
    utilsService.getNonEditableDateColumnDef.mockImplementation((_label: string, field: string) => ({ field }));

    return TestBed.runInInjectionContext(() => new TaskQueryFormComponent(
      {} as any,
      translateService as any,
      createSpyObj(['getAllByNameAndEntity']) as any,
      createSpyObj(['getAllByName']) as any,
      createSpyObj(['error', 'warn', 'debug', 'info', 'trace']) as any,
      createSpyObj(['handleError']) as any,
      { params: new FormControl({}) } as any,
      createSpyObj(['navigate']) as any,
      createSpyObj(['show', 'hide']) as any,
      createSpyObj(['enable', 'disable']) as any,
      createSpyObj(['create', 'update', 'getProjection']) as any,
      createSpyObj(['getAll']) as any,
      utilsService as any,
      createSpyObj(['getAllEx']) as any,
      createSpyObj(['getAllEx']) as any,
      createSpyObj(['getAllEx']) as any,
      createSpyObj(['getAllProjection']) as any,
      createSpyObj(['create']) as any,
      createSpyObj(['getAllEx']) as any,
      createSpyObj(['getAllEx']) as any,
      createSpyObj(['get']) as any,
    ));
  };

  it('preserves unknown properties keys on createObject while updating scope/command', () => {
    const component = Object.create(TaskQueryFormComponent.prototype) as TaskQueryFormComponent;
    component.entityToEdit = TaskProjection.fromObject({
      id: 10,
      name: 'query',
      properties: {
        scope: 'old-scope',
        command: 'old-command',
        custom: { stable: true }
      }
    });
    component.entityForm = new FormGroup({
      name: new FormControl('query'),
      scope: new FormControl('new-scope'),
      command: new FormControl('new-command'),
      connectionId: new FormControl(null),
      cartographyId: new FormControl(null),
      taskGroupId: new FormControl(null)
    });

    const result = component.createObject(10);

    expect(result.properties?.scope).toBe('new-scope');
    expect(result.properties?.command).toBe('new-command');
    expect(result.properties?.custom).toEqual({ stable: true });
  });

  it('formats system variable help from loaded variables', () => {
    const component = Object.create(TaskQueryFormComponent.prototype) as TaskQueryFormComponent;
    (component as any).systemVariables = new Map([
      ['APP_ID', '#{application.id}'],
      ['TERR_COD', '#{territory.code}']
    ]);

    expect((component as any).getSystemVariablesHelp()).toBe('#{APP_ID}, #{TERR_COD}');
  });

  it('includes provided on query parameter dialog form and parameters grid', () => {
    const component = createComponent();
    (component as any).newParameterDialog = {} as any;

    const dialog = (component as any).parametersTable.templateDialog('newParameterDialog');
    const fields = (component as any).parametersTable.relationsColumnsDefs.map((column: any) => column.field);

    expect(dialog.form.contains('provided')).toBe(true);
    expect(fields).toContain('provided');
  });
});
