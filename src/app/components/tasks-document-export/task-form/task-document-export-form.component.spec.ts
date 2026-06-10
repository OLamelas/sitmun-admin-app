import { FormControl, FormGroup } from '@angular/forms';
import { of } from 'rxjs';

import { TaskProjection } from '@app/domain';
import { magic } from '@environments/constants';

import { TaskDocumentExportFormComponent } from './task-document-export-form.component';

describe('TaskDocumentExportFormComponent', () => {
  it('postFetchData initializes document export controls from properties', () => {
    const component = Object.create(TaskDocumentExportFormComponent.prototype) as TaskDocumentExportFormComponent;
    component.entityToEdit = TaskProjection.fromObject({
      id: 10,
      name: 'Export task',
      groupId: 4,
      properties: {
        exportEngine: 'openhtmltopdf',
        downloadFormat: 'pdf',
        downloadSource: 'reports/export.jrxml',
      },
    });

    component.postFetchData();

    expect(component.entityForm.get('name')?.value).toBe('Export task');
    expect(component.entityForm.get('taskGroupId')?.value).toBe(4);
    expect(component.entityForm.get('exportEngine')?.value).toBe('openhtmltopdf');
    expect(component.entityForm.get('output')?.value).toBe('pdf');
    expect(component.entityForm.get('sourcePath')?.value).toBe('reports/export.jrxml');
    expect(component.entityForm.get('name')?.hasError('required')).toBe(false);
    component.entityForm.get('name')?.setValue('');
    expect(component.entityForm.get('name')?.hasError('required')).toBe(true);
  });

  it('createObject maps form values into document export properties', () => {
    const component = Object.create(TaskDocumentExportFormComponent.prototype) as TaskDocumentExportFormComponent;
    component.entityToEdit = TaskProjection.fromObject({
      id: 12,
      name: 'Old export',
      properties: { custom: 'lost-on-purpose' },
    });
    component.entityForm = new FormGroup({
      name: new FormControl('New export'),
      taskGroupId: new FormControl(3),
      exportEngine: new FormControl('openhtmltopdf'),
      output: new FormControl('pdf'),
      sourcePath: new FormControl(' reports/export.jrxml '),
    });

    const result = component.createObject(12);

    expect(result.id).toBe(12);
    expect(result.name).toBe('New export');
    expect(result.properties).toEqual({
      exportEngine: 'openhtmltopdf',
      downloadFormat: 'pdf',
      downloadSource: 'reports/export.jrxml',
    });
  });

  it('createObject omits blank optional sourcePath for pdf output', () => {
    const component = Object.create(TaskDocumentExportFormComponent.prototype) as TaskDocumentExportFormComponent;
    component.entityToEdit = TaskProjection.fromObject({ id: 13, name: 'Export', properties: null });
    component.entityForm = new FormGroup({
      name: new FormControl('Export'),
      taskGroupId: new FormControl(3),
      exportEngine: new FormControl('openhtmltopdf'),
      output: new FormControl('pdf'),
      sourcePath: new FormControl('   '),
    });

    const result = component.createObject(13);

    expect(result.properties).toEqual({
      exportEngine: 'openhtmltopdf',
      downloadFormat: 'pdf',
    });
  });

  it('keeps sourcePath optional for pdf output', () => {
    const component = Object.create(TaskDocumentExportFormComponent.prototype) as TaskDocumentExportFormComponent;
    component.entityToEdit = TaskProjection.fromObject({
      id: 14,
      name: 'PDF export',
      groupId: 3,
      properties: {
        exportEngine: 'openhtmltopdf',
        downloadFormat: 'pdf',
      },
    });

    component.postFetchData();

    const sourcePathControl = component.entityForm.get('sourcePath');
    expect(sourcePathControl?.hasError('required')).toBe(false);
    sourcePathControl?.setValue('');
    expect(sourcePathControl?.valid).toBe(true);
  });

  it('requires sourcePath for xml output', () => {
    const component = Object.create(TaskDocumentExportFormComponent.prototype) as TaskDocumentExportFormComponent;
    component.entityToEdit = TaskProjection.fromObject({
      id: 15,
      name: 'XML export',
      groupId: 3,
      properties: {
        exportEngine: 'openhtmltopdf',
        downloadFormat: 'xml',
      },
    });

    component.postFetchData();

    const sourcePathControl = component.entityForm.get('sourcePath');
    sourcePathControl?.setValue('');
    expect(sourcePathControl?.hasError('required')).toBe(true);
    sourcePathControl?.setValue('reports/export.jrxml');
    expect(sourcePathControl?.valid).toBe(true);
  });

  it('marks form invalid for xml output until sourcePath is provided', () => {
    const component = Object.create(TaskDocumentExportFormComponent.prototype) as TaskDocumentExportFormComponent;
    component.entityToEdit = TaskProjection.fromObject({
      id: 17,
      name: 'XML export',
      groupId: 3,
      properties: {
        exportEngine: 'openhtmltopdf',
        downloadFormat: 'xml',
      },
    });

    component.postFetchData();

    expect(component.entityForm.valid).toBe(false);
    component.entityForm.get('sourcePath')?.setValue('reports/export.jrxml');
    expect(component.entityForm.valid).toBe(true);
  });

  it('toggles sourcePath required validator when output changes', () => {
    const component = Object.create(TaskDocumentExportFormComponent.prototype) as TaskDocumentExportFormComponent;
    component.entityToEdit = TaskProjection.fromObject({
      id: 16,
      name: 'Switch export',
      groupId: 3,
      properties: {
        exportEngine: 'openhtmltopdf',
        downloadFormat: 'pdf',
      },
    });

    component.postFetchData();

    const outputControl = component.entityForm.get('output');
    const sourcePathControl = component.entityForm.get('sourcePath');
    sourcePathControl?.setValue('');
    expect(sourcePathControl?.valid).toBe(true);

    outputControl?.setValue('xml');
    expect(sourcePathControl?.hasError('required')).toBe(true);

    outputControl?.setValue('pdf');
    expect(sourcePathControl?.hasError('required')).toBe(false);
    expect(sourcePathControl?.valid).toBe(true);
  });

  it('fetchCopy prefixes translated copy marker', async () => {
    const getProjection = jest.fn().mockReturnValue(
      of(TaskProjection.fromObject({ id: 22, name: 'Original export' })),
    );
    const component = Object.create(TaskDocumentExportFormComponent.prototype) as TaskDocumentExportFormComponent;
    (component as any).taskService = { getProjection };
    (component as any).translateService = { instant: jest.fn().mockReturnValue('copy_') };
    component.duplicateID = 22;

    const result = await component.fetchCopy();

    expect(result.name).toBe('copy_Original export');
  });

  it('createEntity creates task and updates type and group relations', async () => {
    const updateType = jest.fn().mockReturnValue(of(undefined));
    const updateGroup = jest.fn().mockReturnValue(of(undefined));
    const createdEntity = { id: 55, updateRelationEx: jest.fn()
      .mockImplementationOnce(() => updateType())
      .mockImplementationOnce(() => updateGroup()) };
    const create = jest.fn().mockReturnValue(of(createdEntity));
    const createProxy = jest.fn().mockReturnValue({ id: 4 });
    const component = Object.create(TaskDocumentExportFormComponent.prototype) as TaskDocumentExportFormComponent;
    component.entityToEdit = TaskProjection.fromObject({ id: null, name: 'Export', properties: null });
    component.entityForm = new FormGroup({
      name: new FormControl('Export'),
      taskGroupId: new FormControl(4),
      exportEngine: new FormControl('openhtmltopdf'),
      output: new FormControl('pdf'),
      sourcePath: new FormControl(''),
    });
    (component as any).taskService = { create };
    (component as any).taskGroupService = { createProxy };
    (component as any).taskType = { id: magic.taskDocumentExportTypeId };

    const result = await component.createEntity();

    expect(result).toBe(55);
    expect(create).toHaveBeenCalled();
    expect(createdEntity.updateRelationEx).toHaveBeenNthCalledWith(1, 'type', { id: magic.taskDocumentExportTypeId });
    expect(createProxy).toHaveBeenCalledWith(4);
    expect(createdEntity.updateRelationEx).toHaveBeenNthCalledWith(2, 'group', { id: 4 });
  });

  it('updateEntity updates group relation after saving task', async () => {
    const update = jest.fn().mockReturnValue(of(undefined));
    const updateRelationEx = jest.fn().mockReturnValue(of(undefined));
    const createProxy = jest.fn().mockReturnValue({ id: 8 });
    const component = Object.create(TaskDocumentExportFormComponent.prototype) as TaskDocumentExportFormComponent;
    component.entityID = 44;
    component.entityToEdit = TaskProjection.fromObject({ id: 44, name: 'Export', properties: null }) as any;
    (component.entityToEdit as any).updateRelationEx = updateRelationEx;
    component.entityForm = new FormGroup({
      name: new FormControl('Export'),
      taskGroupId: new FormControl(8),
      exportEngine: new FormControl('openhtmltopdf'),
      output: new FormControl('xml'),
      sourcePath: new FormControl('reports/export.jrxml'),
    });
    (component as any).taskService = { update };
    (component as any).taskGroupService = { createProxy };

    await component.updateEntity();

    expect(update).toHaveBeenCalled();
    expect(createProxy).toHaveBeenCalledWith(8);
    expect(updateRelationEx).toHaveBeenCalledWith('group', { id: 8 });
  });
});
