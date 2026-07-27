import { mergeAttributes } from '@tiptap/core';
import { createColGroup, Table } from '@tiptap/extension-table';
import { DOMOutputSpec } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';

interface PreservedColgroup {
  attributes: Record<string, string>;
  columns: Array<Record<string, string>>;
}

function readAttributes(element: Element): Record<string, string> {
  return Object.fromEntries(Array.from(element.attributes).map((attribute) => [attribute.name, attribute.value]));
}

function countColumns(node: Parameters<typeof createColGroup>[0]): number {
  const row = node.firstChild;
  if (!row) {
    return 0;
  }
  let columns = 0;
  row.forEach((cell) => {
    columns += Number(cell.attrs['colspan']) || 1;
  });
  return columns;
}

export const LayoutPreservingTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      preservedColgroup: {
        default: null,
        rendered: false,
        parseHTML: (table: HTMLElement): PreservedColgroup | null => {
          const colgroup = Array.from(table.children).find((child) => child.tagName.toLowerCase() === 'colgroup');
          if (!colgroup) {
            return null;
          }
          return {
            attributes: readAttributes(colgroup),
            columns: Array.from(colgroup.children)
              .filter((child) => child.tagName.toLowerCase() === 'col')
              .map(readAttributes),
          };
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const preservedColgroup = node.attrs['preservedColgroup'] as PreservedColgroup | null;
    const generated = createColGroup(node, this.options.cellMinWidth);
    const generatedColumns = Array.isArray(generated.colgroup)
      ? generated.colgroup.slice(2)
      : [];
    const colgroup: DOMOutputSpec = preservedColgroup
      ? [
          'colgroup',
          preservedColgroup.attributes,
          ...generatedColumns.map((generatedColumn, index): DOMOutputSpec => {
            const generatedAttributes = Array.isArray(generatedColumn)
              ? generatedColumn[1] || {}
              : {};
            return [
              'col',
              mergeAttributes(generatedAttributes, preservedColgroup.columns[index] || {}),
            ];
          }),
        ]
      : generated.colgroup;
    const tableAttributes = preservedColgroup
      ? mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)
      : mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          style: generated.tableWidth
            ? `width: ${generated.tableWidth}`
            : `min-width: ${generated.tableMinWidth}`,
        });
    const table: DOMOutputSpec = ['table', tableAttributes, colgroup, ['tbody', 0]];

    return this.options.renderWrapper ? ['div', { class: 'tableWrapper' }, table] : table;
  },

  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() || []),
      new Plugin({
        key: new PluginKey('sitmunClearStaleColgroup'),
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }
          const transaction = newState.tr;
          let changed = false;
          newState.doc.descendants((node, position) => {
            const preserved = node.type.name === this.name
              ? node.attrs['preservedColgroup'] as PreservedColgroup | null
              : null;
            if (preserved && preserved.columns.length !== countColumns(node)) {
              transaction.setNodeMarkup(position, undefined, {
                ...node.attrs,
                preservedColgroup: null,
              });
              changed = true;
            }
          });
          return changed ? transaction : null;
        },
      }),
    ];
  },
});
