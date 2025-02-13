/**
 * Maximum line length for Dart code.
 */
const MAX_LINE_LENGTH = 80;

/**
 * Formats a line to ensure it does not exceed the maximum line length.
 * If the line exceeds the maximum length, it wraps the content to the next line with the specified indentation.
 * @param line - The line to format.
 * @param indentSpaces - The number of spaces to use for the wrapped content.
 * @returns The formatted line.
 */
export function formatLine(line: string, indentSpaces: number): string {
  if (line.length <= MAX_LINE_LENGTH) {
    return line;
  }

  const indent = ' '.repeat(indentSpaces);
  const parts = line.split(',');
  let formattedLine = '';
  let currentLine = '';

  parts.forEach((part, index) => {
    const trimmedPart = part.trim();
    if ((currentLine + trimmedPart).length > MAX_LINE_LENGTH) {
      formattedLine += currentLine.trim() + '\n' + indent;
      currentLine = '';
    }
    currentLine += trimmedPart + (index < parts.length - 1 ? ', ' : '');
  });

  formattedLine += currentLine.trim();
  return formattedLine;
}