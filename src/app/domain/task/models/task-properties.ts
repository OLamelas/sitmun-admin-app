/**
 * Opaque task properties storage.
 *
 * The backend persists this as a schemaless map, so the admin app should only
 * read/write known keys through this helper and preserve unknown keys.
 */
export type TaskProperties = Record<string, unknown>;

/**
 * Accessor and updater utilities for task properties.
 */
export class TaskPropertiesContract {
  private static readonly SCOPE = 'scope';
  private static readonly COMMAND = 'command';
  private static readonly PARAMETERS = 'parameters';
  private static readonly FIELDS = 'fields';
  private static readonly MIME_TYPE = 'mimeType';
  private static readonly FILENAME = 'filename';
  private static readonly TEMPLATE_HTML = 'templateHtml';
  private static readonly TEMPLATE_EDITOR_STATE = 'templateEditorState';

  /**
   * Normalizes unknown input into a safe properties record.
   */
  public static fromRaw(raw: unknown): TaskProperties {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {};
    }
    return { ...(raw as TaskProperties) };
  }

  /**
   * Clones properties to plain JSON-serializable object.
   */
  public static toRaw(properties: TaskProperties | null | undefined): TaskProperties {
    return { ...TaskPropertiesContract.fromRaw(properties) };
  }

  /**
   * Gets task scope.
   */
  public static getScope(properties: TaskProperties | null | undefined): string | null {
    const value = TaskPropertiesContract.fromRaw(properties)[TaskPropertiesContract.SCOPE];
    return typeof value === 'string' ? value : null;
  }

  /**
   * Gets task MIME type.
   */
  public static getMimeType(properties: TaskProperties | null | undefined): string | null {
    const value = TaskPropertiesContract.fromRaw(properties)[TaskPropertiesContract.MIME_TYPE];
    return typeof value === 'string' ? value : null;
  }

  /**
   * Gets task resource filename.
   */
  public static getFilename(properties: TaskProperties | null | undefined): string | null {
    const value = TaskPropertiesContract.fromRaw(properties)[TaskPropertiesContract.FILENAME];
    return typeof value === 'string' ? value : null;
  }

  public static getTemplateHtml(properties: TaskProperties | null | undefined): string | null {
    const value = TaskPropertiesContract.fromRaw(properties)[TaskPropertiesContract.TEMPLATE_HTML];
    return typeof value === 'string' ? value : null;
  }

  public static getTemplateEditorState(properties: TaskProperties | null | undefined): unknown {
    return TaskPropertiesContract.fromRaw(properties)[TaskPropertiesContract.TEMPLATE_EDITOR_STATE] ?? null;
  }

  /**
   * Gets task command.
   */
  public static getCommand(properties: TaskProperties | null | undefined): string | null {
    const value = TaskPropertiesContract.fromRaw(properties)[TaskPropertiesContract.COMMAND];
    return typeof value === 'string' ? value : null;
  }

  /**
   * Gets task parameters list.
   */
  public static getParameters(
    properties: TaskProperties | null | undefined
  ): Array<Record<string, unknown>> {
    const value = TaskPropertiesContract.fromRaw(properties)[TaskPropertiesContract.PARAMETERS];
    return Array.isArray(value)
      ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      : [];
  }

  /**
   * Gets task fields list.
   */
  public static getFields(
    properties: TaskProperties | null | undefined
  ): Array<Record<string, unknown>> {
    const value = TaskPropertiesContract.fromRaw(properties)[TaskPropertiesContract.FIELDS];
    return Array.isArray(value)
      ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      : [];
  }

  /**
   * Sets task scope preserving unknown keys.
   */
  public static withScope(
    properties: TaskProperties | null | undefined,
    scope: string | null
  ): TaskProperties {
    return {
      ...TaskPropertiesContract.fromRaw(properties),
      [TaskPropertiesContract.SCOPE]: scope
    };
  }

  /**
   * Sets task command preserving unknown keys.
   */
  public static withCommand(
    properties: TaskProperties | null | undefined,
    command: string | null
  ): TaskProperties {
    return {
      ...TaskPropertiesContract.fromRaw(properties),
      [TaskPropertiesContract.COMMAND]: command
    };
  }

  /**
   * Sets task parameters preserving unknown keys.
   */
  public static withParameters(
    properties: TaskProperties | null | undefined,
    parameters: object[]
  ): TaskProperties {
    return {
      ...TaskPropertiesContract.fromRaw(properties),
      [TaskPropertiesContract.PARAMETERS]: [...parameters]
    };
  }

  /**
   * Sets task fields preserving unknown keys.
   */
  public static withFields(
    properties: TaskProperties | null | undefined,
    fields: object[]
  ): TaskProperties {
    return {
      ...TaskPropertiesContract.fromRaw(properties),
      [TaskPropertiesContract.FIELDS]: [...fields]
    };
  }

  public static withTemplateHtml(
    properties: TaskProperties | null | undefined,
    templateHtml: string | null
  ): TaskProperties {
    return {
      ...TaskPropertiesContract.fromRaw(properties),
      [TaskPropertiesContract.TEMPLATE_HTML]: templateHtml
    };
  }

  public static withTemplateEditorState(
    properties: TaskProperties | null | undefined,
    templateEditorState: unknown
  ): TaskProperties {
    return {
      ...TaskPropertiesContract.fromRaw(properties),
      [TaskPropertiesContract.TEMPLATE_EDITOR_STATE]: templateEditorState
    };
  }
}
