type ErrorLogEntry = {
  type: 'MISSING_ALIAS' | 'RESERVED_WORD';
  originalName: string;
  newName?: string;
  details: string;
};

class ErrorLogger {
  private errors: ErrorLogEntry[] = [];

  logMissingAlias(variableName: string, aliasId: string, fallbackValue: string): void {
    // Check if this exact error already exists
    const details = `Variable "${variableName}" references missing alias ID: ${aliasId}. Using fallback: ${fallbackValue}`;
    let existingError = false;
    for (let i = 0; i < this.errors.length; i++) {
      if (this.errors[i].type === 'MISSING_ALIAS' && 
          this.errors[i].originalName === variableName && 
          this.errors[i].details === details) {
        existingError = true;
        break;
      }
    }
    
    if (!existingError) {
      this.errors.push({
        type: 'MISSING_ALIAS',
        originalName: variableName,
        details
      });
    }
  }

  logReservedWord(originalName: string, newName: string): void {
    // Check if this exact error already exists
    const details = `"${originalName}" is a Dart reserved word, renamed to "${newName}"`;
    let existingError = false;
    for (let i = 0; i < this.errors.length; i++) {
      if (this.errors[i].type === 'RESERVED_WORD' && 
          this.errors[i].originalName === originalName && 
          this.errors[i].details === details) {
        existingError = true;
        break;
      }
    }
    
    if (!existingError) {
      this.errors.push({
        type: 'RESERVED_WORD',
        originalName,
        newName,
        details
      });
    }
  }

  getErrors(): ErrorLogEntry[] {
    return this.errors;
  }

  getErrorCount(): number {
    return this.errors.length;
  }

  generateLogText(): string {
    if (this.errors.length === 0) {
      return 'No issues found during code generation.';
    }

    let logText = `Figma Variables to Code - Generation Log\n`;
    logText += `Generated: ${new Date().toLocaleString()}\n`;
    logText += `Total Issues: ${this.errors.length}\n\n`;

    this.errors.forEach((error, index) => {
      logText += `${index + 1}. [${error.type}] ${error.details}\n`;
    });

    return logText;
  }

  clear(): void {
    this.errors = [];
  }
}

export const errorLogger = new ErrorLogger();
export type { ErrorLogEntry }; 