import { FormControl, FormGroup } from '@angular/forms';

import { describe, expect, it } from '@jest/globals';

import { TaskProjection } from '@app/domain';

import { TaskBasicFormComponent } from './task-basic-form.component';

describe('TaskBasicFormComponent (properties contract)', () => {
  it('keeps opaque properties unchanged on createObject', () => {
    const component = Object.create(TaskBasicFormComponent.prototype) as TaskBasicFormComponent;
    component.entityToEdit = TaskProjection.fromObject({
      id: 30,
      name: 'basic',
      properties: {
        parameters: [{ name: 'id', type: 'number', value: '1' }],
        futureKey: { nested: true }
      }
    });
    component.entityForm = new FormGroup({
      name: new FormControl('basic'),
      uiId: new FormControl(null),
      taskGroupId: new FormControl(null)
    });

    const result = component.createObject(30);

    expect(result.properties?.parameters).toEqual([{ name: 'id', type: 'number', value: '1' }]);
    expect(result.properties?.futureKey).toEqual({ nested: true });
  });

  it('adds an empty parameters array on createObject when properties are empty', () => {
    const component = Object.create(TaskBasicFormComponent.prototype) as TaskBasicFormComponent;
    component.entityToEdit = TaskProjection.fromObject({
      id: null,
      name: 'basic',
      properties: null
    });
    component.entityForm = new FormGroup({
      name: new FormControl('basic'),
      uiId: new FormControl(16),
      taskGroupId: new FormControl(1)
    });

    const result = component.createObject();

    expect(result.properties?.parameters).toEqual([]);
  });
});
