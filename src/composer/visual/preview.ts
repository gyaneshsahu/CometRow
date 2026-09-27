import {
  renderSection,
  measureSection,
} from '../../../docs/prototypes/editor-p0/lab-render.js';
import { breakpoint } from '../../../docs/prototypes/editor-p0/lab-model.js';
import { visualSchema, ENGINE_VERSION, type VisualData } from './document.js';
export function mountVisualPreview(host: HTMLElement, raw: VisualData) {
  const value = visualSchema.parse(raw);
  if (value.layoutEngineVersion !== ENGINE_VERSION)
    throw Error('Unsupported saved layout engine.');
  function draw() {
    const width = host.clientWidth;
    if (!width) return;
    const b = breakpoint(width),
      section = renderSection(value.document, b, width);
    section.dataset.visualScreen = b;
    host.replaceChildren(section);
    measureSection(section, value.document, b);
    for (const a of section.querySelectorAll('a')) {
      a.removeAttribute('href');
      a.setAttribute('aria-disabled', 'true');
    }
  }
  const observer = new ResizeObserver(draw);
  observer.observe(host);
  draw();
  return () => observer.disconnect();
}
