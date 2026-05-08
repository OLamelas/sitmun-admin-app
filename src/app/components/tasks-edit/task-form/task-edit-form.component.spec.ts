import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';

import { describe, expect, it } from '@jest/globals';

import { TaskProjection } from '@app/domain';

import { TaskEditFormComponent } from './task-edit-form.component';

describe('TaskEditFormComponent', () => {
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

    return TestBed.runInInjectionContext(() => new TaskEditFormComponent(
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
      utilsService as any,
      createSpyObj(['getAllEx']) as any,
      createSpyObj(['getAllEx']) as any,
      createSpyObj(['getAllEx']) as any,
      createSpyObj(['getAllProjection']) as any,
      createSpyObj(['create']) as any,
      createSpyObj(['getAllEx']) as any,
      createSpyObj(['getAllEx']) as any,
    ));
  };

  it('preserves unknown properties keys on createObject while updating scope', () => {
    const component = Object.create(TaskEditFormComponent.prototype) as TaskEditFormComponent;
    component.entityToEdit = TaskProjection.fromObject({
      id: 20,
      name: 'edit',
      properties: {
        scope: 'old-scope',
        fields: [{ name: 'title' }],
        customFlag: 'keep-me'
      }
    });
    component.entityForm = new FormGroup({
      name: new FormControl('edit'),
      scope: new FormControl('new-scope'),
      connectionId: new FormControl(null),
      cartographyId: new FormControl(null),
      taskGroupId: new FormControl(null)
    });

    const result = component.createObject(20);

    expect(result.properties?.scope).toBe('new-scope');
    expect(result.properties?.fields).toEqual([{ name: 'title' }]);
    expect(result.properties?.customFlag).toBe('keep-me');
  });

  it('includes correct columns in parameters grid (name, label, value, type, required, provided, status)', () => {
    const component = createComponent();
    (component as any).newParameterDialog = {} as any;

    const fields = (component as any).parametersTable.relationsColumnsDefs.map((column: any) => column.field);

    expect(fields).toContain('name');
    expect(fields).toContain('label');
    expect(fields).toContain('value');
    expect(fields).toContain('type');
    expect(fields).toContain('required');
    expect(fields).toContain('provided');
    expect(fields).toContain('status');
    
    // Ensure no duplicate 'type' column (should only appear once)
    const typeCount = fields.filter((f: string) => f === 'type').length;
    expect(typeCount).toBe(1);
  });

  it('includes provided on edit parameter dialog form', () => {
    const component = createComponent();
    (component as any).newParameterDialog = {} as any;

    const dialog = (component as any).parametersTable.templateDialog('newParameterDialog');

    expect(dialog.form.contains('provided')).toBe(true);
  });
});
