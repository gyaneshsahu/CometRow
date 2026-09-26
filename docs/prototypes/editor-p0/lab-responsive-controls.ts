import {
  type LabDocument,
  type ResponsiveGroup,
  uid,
  primaryScreen,
} from './lab-model.js';
import { type Command } from './lab-commands.js';
import { inferredRole, layoutGraph, graphLeaves } from './lab-layout-graph.js';
import { measureText } from './lab-render.js';
import { element } from './lab-render.js';

// Relationships describe responsive intent only; they do not contain or move
// the freeform Primary elements. Membership is a tree and order is explicit.
export function responsiveControls(
  d: LabDocument,
  selected: string,
  commit: (c: Command) => unknown,
) {
  const root = element('details');
  root.open = true;
  root.append(element('summary', 'Responsive relationships'));
  root.append(
    element(
      'small',
      'Auto follows your Primary design. Clarify only what it cannot infer. Custom placements stay protected.',
    ),
  );
  const r = structuredClone(
    d.sections[0]!.responsive ?? { groups: [], roles: {} },
  );
  const save = () =>
    commit({ type: 'SetResponsiveRelationships', relationships: r });
  const button = (label: string, action: () => void) => {
    const b = element('button', label);
    b.type = 'button';
    b.onclick = action;
    return b;
  };
  const select = (
    label: string,
    value: string,
    options: { id: string; name: string }[],
    change: (v: string) => void,
  ) => {
    const l = element('label', label),
      s = element('select');
    for (const option of options) {
      const o = element('option', option.name);
      o.value = option.id;
      s.append(o);
    }
    s.value = value;
    s.onchange = () => change(s.value);
    l.append(s);
    root.append(l);
    return s;
  };
  const role = inferredRole(d, selected);
  const graph = layoutGraph(d, measureText).root;
  const relationship = (g: typeof graph): typeof graph | undefined =>
    g.children.some((c) => c.id === selected)
      ? g
      : g.children.map(relationship).find(Boolean);
  const found = relationship(graph);
  root.append(
    element(
      'small',
      `Inferred: ${role.role}. ${role.reason}. ${found ? found.mode + ' with ' + (graphLeaves(found).length - 1) + ' related elements.' : ''}`,
    ),
  );
  const labelFor = (id: string) => {
    const n = d.nodes[id]!;
    return (
      n.name +
      ': ' +
      (n.type === 'button'
        ? n.content.label
        : n.type === 'heading' || n.type === 'paragraph'
          ? n.content.text
          : n.type
      ).slice(0, 40)
    );
  };
  const peers = [
    { id: '', name: 'Choose an element' },
    ...d.sections[0]!.childIds.filter((id) => id !== selected).map((id) => ({
      id,
      name: labelFor(id),
    })),
  ];
  for (const [label, mode] of [
    ['Keep together with', 'row'],
    ['Overlay with', 'overlay'],
    ['Place before', 'stack'],
  ] as const) {
    select(label, '', peers, (id) => {
      if (!id) return;
      // A simple correction persists through the same validated, undoable command
      // as advanced relationships. It never edits a Primary rectangle.
      for (const g of r.groups)
        g.children = g.children.filter((key) => key !== id && key !== selected);
      r.groups.push({
        id: uid(),
        name:
          label === 'Place before' ? 'Reading sequence' : 'Related elements',
        layout: mode,
        children:
          mode === 'row'
            ? [selected, id].sort(
                (a, b) =>
                  d.sections[0]!.layouts[primaryScreen(d)].placements[a]!.x -
                  d.sections[0]!.layouts[primaryScreen(d)].placements[b]!.x,
              )
            : [selected, id],
      });
      if (mode === 'overlay') {
        r.roles[id] = 'content';
        r.roles[selected] = 'content';
      }
      save();
    });
  }
  const roles =
    d.nodes[selected]!.type === 'button'
      ? ['Automatic', 'Content']
      : ['Automatic', 'Content', 'Decoration'];
  select(
    'Responsive role',
    r.roles[selected] ?? '',
    roles.map((name, i) => ({ name, id: ['', 'content', 'decoration'][i]! })),
    (v) => {
      if (v) r.roles[selected] = v as 'content' | 'decoration';
      else delete r.roles[selected];
      save();
    },
  );
  const simple = root;
  const advanced = element('details');
  advanced.append(element('summary', 'Advanced relationships'));
  simple.append(advanced);
  // Keep graph construction available without requiring it for ordinary drafts.
  const simpleCount = root.children.length;
  const owner = r.groups.find((g) => g.children.includes(selected));
  select(
    'Responsive group',
    owner?.id ?? '',
    [
      { id: '', name: 'Automatic relationships' },
      ...r.groups.map((g) => ({ id: g.id, name: g.name })),
    ],
    (v) => {
      for (const g of r.groups)
        g.children = g.children.filter((id) => id !== selected);
      r.groups.find((g) => g.id === v)?.children.push(selected);
      save();
    },
  );
  const label = element('label', 'New group name'),
    name = element('input');
  name.value = 'Related content';
  name.maxLength = 80;
  label.append(name);
  root.append(label);
  for (const mode of ['row', 'stack', 'overlay'] as const)
    root.append(
      button('Create ' + mode + ' group', () => {
        for (const g of r.groups)
          g.children = g.children.filter((id) => id !== selected);
        r.groups.push({
          id: uid(),
          name: name.value.trim() || 'Related content',
          layout: mode,
          children: [selected],
        });
        save();
      }),
    );
  // Editing groups here supports nested card stacks inside a row, with no new
  // canvas object type or replacement of the existing layer/reading-order UI.
  for (const g of r.groups) {
    const box = element('fieldset'),
      legend = element('legend', g.name);
    box.append(legend);
    const mode = element('select');
    mode.setAttribute('aria-label', g.name + ' layout');
    for (const value of ['row', 'stack', 'overlay']) {
      const o = element('option', value);
      o.value = value;
      mode.append(o);
    }
    mode.value = g.layout;
    mode.onchange = () => {
      g.layout = mode.value as ResponsiveGroup['layout'];
      save();
    };
    box.append(mode);
    const groupParent = r.groups.find((other) => other.children.includes(g.id));
    const parent = element('select');
    parent.setAttribute('aria-label', g.name + ' parent');
    const choices = [
      { id: '', name: 'Automatic placement' },
      ...r.groups.filter((other) => other.id !== g.id),
    ];
    for (const c of choices) {
      const o = element('option', c.name);
      o.value = c.id;
      parent.append(o);
    }
    parent.value = groupParent?.id ?? '';
    parent.onchange = () => {
      for (const other of r.groups)
        other.children = other.children.filter((id) => id !== g.id);
      r.groups.find((other) => other.id === parent.value)?.children.push(g.id);
      save();
    };
    box.append(parent);
    for (const [index, id] of g.children.entries()) {
      const node = d.nodes[id];
      const copy =
        node?.type === 'button'
          ? node.content.label
          : node?.type === 'heading' || node?.type === 'paragraph'
            ? node.content.text
            : '';
      const text = node
        ? node.name + (copy ? ': ' + copy.slice(0, 40) : '')
        : (r.groups.find((other) => other.id === id)?.name ?? id);
      const row = element('div', `${index + 1}. ${text} `);
      for (const delta of [-1, 1]) {
        const b = button(
          `${text} ${delta < 0 ? 'earlier' : 'later'} in ${g.name}`,
          () => {
            const other = index + delta;
            [g.children[index], g.children[other]] = [g.children[other]!, id];
            save();
          },
        );
        b.disabled = index + delta < 0 || index + delta >= g.children.length;
        row.append(b);
      }
      row.append(
        button('Remove ' + text + ' from ' + g.name, () => {
          g.children = g.children.filter((child) => child !== id);
          save();
        }),
      );
      box.append(row);
    }
    box.append(
      button('Ungroup ' + g.name, () => {
        for (const other of r.groups) {
          const at = other.children.indexOf(g.id);
          if (at >= 0) other.children.splice(at, 1, ...g.children);
        }
        r.groups = r.groups.filter((other) => other.id !== g.id);
        save();
      }),
    );
    root.append(box);
  }
  while (root.children.length > simpleCount)
    advanced.append(root.children[simpleCount]!);
  return root;
}
