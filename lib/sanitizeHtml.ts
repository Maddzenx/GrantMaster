import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create a JSDOM window and cast it to the type DOMPurify expects
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window as any);

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty);
} 