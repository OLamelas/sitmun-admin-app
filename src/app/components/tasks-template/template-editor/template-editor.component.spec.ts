import { Editor } from '@tiptap/core';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import { TextSelection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';

import { HtmlAttributesExtension } from './html-attributes.extension';
import { LayoutPreservingTable } from './layout-preserving-table.extension';
import { normalizeEditorColorValue, normalizeHandlebarsMarkup, protectStructuralHandlebarsBlocks, protectTableHandlebarsBlocks, resolveSelectedPdfRegionNode, TemplateEditorComponent, updateHtmlClass } from './template-editor.component';
import { TemplateHtmlValidatorService } from './template-html-validator.service';

const createSpyObj = (methods: string[]): Record<string, jest.Mock> =>
  methods.reduce((acc, methodName) => {
    acc[methodName] = jest.fn();
    return acc;
  }, {} as Record<string, jest.Mock>);

describe('TemplateEditorComponent', () => {
  let component: TemplateEditorComponent;
  let translateService: Record<string, jest.Mock>;

  beforeEach(() => {
    translateService = createSpyObj(['instant']);
    const validator = new TemplateHtmlValidatorService(translateService as any);
    component = new TemplateEditorComponent(validator, translateService as any, { detectChanges: jest.fn() } as any);
    component.html = '<p>Hello</p>';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should strip html tags from inside Handlebars placeholders', () => {
    expect(normalizeHandlebarsMarkup('<p>{{task.<span>name</span>}}</p>')).toBe('<p>{{task.name}}</p>');
  });

  it('should normalize rgb colors for color inputs', () => {
    expect(normalizeEditorColorValue('rgb(255, 0, 128)', '#000000')).toBe('#ff0080');
  });

  it('should normalize short hex colors for color inputs', () => {
    expect(normalizeEditorColorValue('#0f8', '#000000')).toBe('#00ff88');
  });

  it('should update reserved classes without changing custom classes', () => {
    expect(updateHtmlClass('custom sitmun-pdf-footer', 'sitmun-pdf-header', ['sitmun-pdf-header', 'sitmun-pdf-footer']))
      .toBe('custom sitmun-pdf-header');
    expect(updateHtmlClass('custom sitmun-pdf-header', null, ['sitmun-pdf-header'])).toBe('custom');
    expect(updateHtmlClass(
      'custom sitmun-pdf-header',
      'sitmun-pdf-header-full-bleed',
      ['sitmun-pdf-header', 'sitmun-pdf-header-full-bleed'],
    )).toBe('custom sitmun-pdf-header-full-bleed');
  });

  it('should resolve a marked nested block before its table ancestors', () => {
    const editor = new Editor({
      extensions: [StarterKit, LayoutPreservingTable, TableRow, TableHeader, TableCell, HtmlAttributesExtension],
      content: '<table><tbody><tr><td><p class="sitmun-pdf-header custom">Header</p></td></tr></tbody></table>',
    });
    let markedPosition = -1;
    editor.state.doc.descendants((node, position) => {
      if (String(node.attrs['class'] || '').includes('sitmun-pdf-header')) {
        markedPosition = position;
      }
    });

    const selected = resolveSelectedPdfRegionNode(
      TextSelection.create(editor.state.doc, markedPosition + 1),
    );

    expect(selected?.pos).toBe(markedPosition);
    expect(selected?.node.attrs['class']).toContain('sitmun-pdf-header');
    editor.destroy();
  });

  it('should replace an existing header variant through the Tiptap transaction', () => {
    const editor = new Editor({
      extensions: [StarterKit, HtmlAttributesExtension],
      content: '<p class="sitmun-pdf-header custom">First</p><p>Second</p>',
    });
    (component as any).editor = editor;
    component.componentFocusedWithin = true;
    let secondParagraphPosition = -1;
    editor.state.doc.descendants((node, position) => {
      if (node.type.name === 'paragraph' && node.textContent === 'Second') {
        secondParagraphPosition = position;
      }
    });
    editor.commands.setNodeSelection(secondParagraphPosition);

    component.togglePdfFullBleedHeader();

    const document = new DOMParser().parseFromString(editor.getHTML(), 'text/html');
    expect(document.querySelectorAll('.sitmun-pdf-header')).toHaveLength(0);
    expect(document.querySelectorAll('.sitmun-pdf-header-full-bleed')).toHaveLength(1);
    expect(document.querySelector('.sitmun-pdf-header-full-bleed')?.textContent).toBe('Second');
    expect(document.querySelector('.custom')?.textContent).toBe('First');
    editor.destroy();
    (component as any).editor = null;
  });

  it('should preserve table IDs and authored colgroup metadata', () => {
    const editor = new Editor({
      extensions: [StarterKit, LayoutPreservingTable, TableRow, TableHeader, TableCell, HtmlAttributesExtension],
      content: '<table id="layout" style="width: 768px"><colgroup id="columns" class="custom-cols">'
        + '<col id="left-column" style="width: 100px"><col style="width: 668px"></colgroup>'
        + '<tbody><tr><td>A</td><td>B</td></tr></tbody></table>',
    });

    const document = new DOMParser().parseFromString(editor.getHTML(), 'text/html');
    const table = document.querySelector('table');
    const colgroup = document.querySelector('colgroup');

    expect(table?.id).toBe('layout');
    expect(table?.getAttribute('style')).toContain('width: 768px');
    expect(colgroup?.id).toBe('columns');
    expect(colgroup?.classList.contains('custom-cols')).toBe(true);
    expect(colgroup?.querySelectorAll('col')).toHaveLength(2);
    expect(colgroup?.querySelector('col')?.id).toBe('left-column');
    expect(colgroup?.querySelector('col')?.getAttribute('style')).toContain('width: 100px');

    let firstCellParagraphPosition = -1;
    editor.state.doc.descendants((node, position) => {
      if (firstCellParagraphPosition < 0 && node.type.name === 'paragraph') {
        firstCellParagraphPosition = position;
      }
    });
    editor.commands.setTextSelection(firstCellParagraphPosition + 1);
    expect(editor.commands.addColumnAfter()).toBe(true);
    const expandedDocument = new DOMParser().parseFromString(editor.getHTML(), 'text/html');
    expect(expandedDocument.querySelectorAll('colgroup col')).toHaveLength(3);
    expect(expandedDocument.querySelector('#left-column')).toBeNull();
    expect(editor.commands.deleteColumn()).toBe(true);
    const reducedDocument = new DOMParser().parseFromString(editor.getHTML(), 'text/html');
    expect(reducedDocument.querySelectorAll('colgroup col')).toHaveLength(2);
    editor.destroy();
  });

  it.each([
    ['bulletList', '<ul><li><p>Item</p></li></ul>'],
    ['orderedList', '<ol><li><p>Item</p></li></ol>'],
  ])('should select the %s container from a cursor inside its paragraph', (expectedType, content) => {
    const editor = new Editor({ extensions: [StarterKit, HtmlAttributesExtension], content });
    let paragraphPosition = -1;
    editor.state.doc.descendants((node, position) => {
      if (node.type.name === 'paragraph') {
        paragraphPosition = position;
      }
    });

    const selected = resolveSelectedPdfRegionNode(
      TextSelection.create(editor.state.doc, paragraphPosition + 1),
    );

    expect(selected?.node.type.name).toBe(expectedType);
    editor.destroy();
  });

  it('should protect structural Handlebars blocks inside tables', () => {
    const protectedHtml = protectTableHandlebarsBlocks('<table><tbody><tr><td>A</td></tr>{{#each AllHits}}<tr><td>{{this.Player}}</td></tr>{{/each}}</tbody></table>');

    expect(protectedHtml).toContain('data-sitmun-handlebars-block="%7B%7B%23each%20AllHits%7D%7D"');
    expect(protectedHtml).toContain('data-sitmun-handlebars-block="%7B%7B%2Feach%7D%7D"');
  });

  it('should protect structural Handlebars blocks outside tables', () => {
    const protectedHtml = protectStructuralHandlebarsBlocks('{{#each AllHits}}<p>{{this.Player}}</p>{{/each}}');

    expect(protectedHtml).toContain('<div data-sitmun-handlebars-block="%7B%7B%23each%20AllHits%7D%7D">{{#each AllHits}}</div>');
    expect(protectedHtml).toContain('<div data-sitmun-handlebars-block="%7B%7B%2Feach%7D%7D">{{/each}}</div>');
    expect(protectedHtml).toContain('<p>{{this.Player}}</p>');
  });

  it('should switch to html mode without editor instance', () => {
    component.setEditorMode('html');

    expect(component.editorMode).toBe('html');
  });

  it('should emit valid html changes in source mode', () => {
    const emitted: string[] = [];
    component.htmlChange.subscribe((value) => emitted.push(value));

    component.onHtmlSourceChanged('<p>Hello</p><table><tbody><tr><td>{{value}}</td></tr></tbody></table>');

    expect(emitted).toEqual(['<p>Hello</p><table><tbody><tr><td>{{value}}</td></tr></tbody></table>']);
    expect(component.validationErrors).toEqual([]);
  });

  it('should keep invalid html local and report errors', () => {
    const emitted: string[] = [];
    component.htmlChange.subscribe((value) => emitted.push(value));

    translateService.instant.mockReturnValue('No se permite la etiqueta <script>.');
    component.onHtmlSourceChanged('<script>alert(1)</script>');

    expect(emitted).toEqual([]);
    expect(component.validationErrors).toContain('No se permite la etiqueta <script>.');
  });

  it('should format valid html in source mode', () => {
    const emitted: string[] = [];
    component.htmlChange.subscribe((value) => emitted.push(value));

    component.onHtmlSourceChanged('<div><p>Hello</p><p>World</p></div>');
    component.formatHtmlSource();

    expect(component.htmlSource).toContain('\n');
    expect(emitted.at(-1)).toBe(component.htmlSource);
  });
});
