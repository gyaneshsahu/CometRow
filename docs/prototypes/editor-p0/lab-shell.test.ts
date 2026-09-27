import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shellPreferences, shellMarkup } from './lab-shell.js';

test('shell preferences recover safely and constrain panel dimensions', () => {
  assert.equal(shellPreferences(null).width, 270);
  assert.equal(shellPreferences({ width: -100 }).width, 220);
  assert.equal(shellPreferences({ width: 99999 }).width, 380);
  assert.equal(shellPreferences({ width: NaN }).width, 270);
  assert.deepEqual(
    shellPreferences({
      tab: 'unknown',
      accordions: { Content: true, Bad: 'yes' },
    }),
    {
      width: 270,
      collapsed: false,
      tab: 'layout',
      accordions: { Content: true },
    },
  );
});

test('shell preferences survive serialization without campaign state', () => {
  const prefs = shellPreferences({
    width: 330,
    collapsed: true,
    tab: 'assets',
    accordions: { Responsive: true },
  });
  assert.deepEqual(shellPreferences(JSON.parse(JSON.stringify(prefs))), prefs);
  assert.deepEqual(Object.keys(prefs).sort(), [
    'accordions',
    'collapsed',
    'tab',
    'width',
  ]);
});

test('shared shell retains editor entry controls without unsupported actions', () => {
  for (const id of [
    'lab-add',
    'lab-undo',
    'lab-redo',
    'lab-preview',
    'lab-zoom',
    'lab-import',
    'lab-export',
    'lab-status',
  ])
    assert.equal(shellMarkup.split('id="' + id + '"').length, 2, id);
  assert.doesNotMatch(shellMarkup, /Publish|Share|iframe|3002|Isolated P0/);
  assert.match(shellMarkup, /role="separator" tabindex="0"/);
  for (const name of ['layout', 'structure', 'assets'])
    assert.match(
      shellMarkup,
      new RegExp('aria-controls="lab-panel-' + name + '"'),
    );
});
