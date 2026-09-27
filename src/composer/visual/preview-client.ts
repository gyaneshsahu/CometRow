import '../../../docs/prototypes/editor-p0/lab.css';
import '../../../docs/prototypes/editor-p0/styles.css';
import './preview.css';
import { mountVisualPreview } from './preview.js';
for (const data of document.querySelectorAll<HTMLScriptElement>(
  'script[data-visual-document]',
))
  mountVisualPreview(
    data.previousElementSibling as HTMLElement,
    JSON.parse(data.textContent!),
  );
