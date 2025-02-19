/**
 * Maximum line length for Dart code.
 */
const MAX_LINE_LENGTH = 80;

/**
 * Checks if a string contains a function call.
 * Looks for pattern: something(arguments)
 */
function isFunctionCall(content: string): boolean {
  return /\w+\s*\([^)]*\)/.test(content);
}

/**
 * Extracts the full prefix (everything before the function arguments) and parameters
 * from a full line of code.
 */
function extractLineParts(line: string): { 
  fullPrefix: string, 
  parameters: string[] 
} | null {
  // Match everything up to the first open parenthesis
  const match = line.match(/^(.*?\()(.*)(\))$/);
  if (!match) return null;

  const [, fullPrefix, paramsString] = match;
  
  // Parse parameters respecting nested structures
  const parameters: string[] = [];
  let currentParam = '';
  let nestedLevel = 0;

  for (const char of paramsString) {
    if (char === '(' || char === '{' || char === '[') {
      nestedLevel++;
      currentParam += char;
    } else if (char === ')' || char === '}' || char === ']') {
      nestedLevel--;
      currentParam += char;
    } else if (char === ',' && nestedLevel === 0) {
      parameters.push(currentParam.trim());
      currentParam = '';
    } else {
      currentParam += char;
    }
  }
  
  if (currentParam) {
    parameters.push(currentParam.trim());
  }

  return { fullPrefix, parameters };
}

/**
 * Formats a line to ensure it does not exceed the maximum line length.
 * @param line - The line to format.
 * @param indentSpaces - The number of spaces to use for additional indentation.
 * @returns The formatted line.
 */
export function formatLine(line: string, indentSpaces: number): string {
  if (line.length <= MAX_LINE_LENGTH) {
    return line;
  }

  const leadingWhitespace = line.match(/^\s*/)?.[0] || '';
  const content = line.slice(leadingWhitespace.length);

  if (isFunctionCall(content)) {
    const parts = extractLineParts(content);
    if (parts) {
      const { fullPrefix, parameters } = parts;
      const paramIndent = ' '.repeat(indentSpaces);
      const newLineIndent = leadingWhitespace + paramIndent;
      
      // Check if parameters fit on a single line with newLineIndent
      const combinedParams = parameters.join(', ');
      const combinedLine = `${newLineIndent}${combinedParams}),`;
      if (combinedLine.length <= MAX_LINE_LENGTH) {
        return `${leadingWhitespace}${fullPrefix.trimEnd()}\n${combinedLine}`;
      }

      // Split parameters into separate lines
      const paramLines = parameters.map((param, index) => {
        const isLast = index === parameters.length - 1;
        return `${newLineIndent}${param}${isLast ? '' : ','}`;
      });
      const lines = [
        `${leadingWhitespace}${fullPrefix.trimEnd()}`,
        ...paramLines
      ];
      return lines.join('\n') + '),';
    }
  }

  // Default handling for non-function content
  const parts = content.split(',');
  let formattedLine = '';
  let currentLine = leadingWhitespace;

  parts.forEach((part, index) => {
    const trimmedPart = part.trim();
    const isLastPart = index === parts.length - 1;
    const partWithComma = isLastPart ? trimmedPart : trimmedPart + ',';

    if (currentLine.length + partWithComma.length > MAX_LINE_LENGTH && currentLine !== leadingWhitespace) {
      formattedLine += currentLine.trimEnd() + '\n';
      currentLine = leadingWhitespace + ' '.repeat(indentSpaces) + partWithComma + ' ';
    } else {
      currentLine += partWithComma + ' ';
    }
  });

  formattedLine += currentLine.trimEnd();
  return formattedLine;
}