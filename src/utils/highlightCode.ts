import { codeToHtml } from 'shiki';

// Function to highlight Dart code using Shiki
export default async function highlightCode(code: string, setHighlightedCode: (highlighted: string) => void) {
  const highlighted = await codeToHtml(code, { lang: 'dart', theme: 'nord' });
  setHighlightedCode(highlighted);
}