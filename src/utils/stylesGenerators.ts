import { toCamelCase, toPascalCase } from './string';
import { generateHeaderComment } from './utilsGenerators';

type TextStyleBoundVariable = {
  id: string;
  type: 'VARIABLE_ALIAS' | 'primitive';
};

type TextStyle = {
  boundVariables?: {
    fontFamily?: TextStyleBoundVariable;
    fontSize?: TextStyleBoundVariable;
    fontStyle?: TextStyleBoundVariable;
    lineHeight?: TextStyleBoundVariable;
  };
} & globalThis.TextStyle;

/**
 * Generates the Dart code for `figma_styles.dart`.
 * @returns The generated Dart code as a string.
 */
export function generateStylesDartCode(): string {
  const textStyles: TextStyle[] = figma.getLocalTextStyles();
  let dartFile = generateHeaderComment();
  dartFile += `import 'figma_styles_internal.dart' show TextStyles;\n\n`;  
  dartFile += `final textStyles = TextStyles();\n`;
  return dartFile;
}

/**
 * Generates the internal Dart code for `figma_styles_internal.dart`.
 * @returns The generated internal Dart code as a string.
 */
export function generateInternalStylesDartCode(): string {
  const textStyles = figma.getLocalTextStyles();
  let dartFile = generateHeaderComment();
  dartFile += `import 'package:flutter/material.dart';\n`;
  dartFile += `import 'figma_utils.dart';\n`;
  dartFile += `import 'figma_variables.dart';\n\n`;
  dartFile += `final class TextStyles {\n`;
	dartFile += `  const TextStyles();\n`;
  const groupedTextStyles = groupTextStyles(textStyles);
  Object.keys(groupedTextStyles).forEach((groupName) => {
    const groupNameCamelCase = toCamelCase(groupName);
    const groupNamePascalCase = toPascalCase(groupName);
    dartFile += `\n`;
    dartFile += `  static final _${groupNameCamelCase} = ${groupNamePascalCase}();\n`;
    dartFile += `  ${groupNamePascalCase} get ${groupNameCamelCase} => _${groupNameCamelCase};\n`;
  });
  dartFile += `}\n`;
  Object.keys(groupedTextStyles).forEach((groupName) => {
    const groupClassName = toPascalCase(groupName);
    dartFile += `\n`;
    dartFile += `final class ${groupClassName} {\n`;
    dartFile += `  const ${groupClassName}();\n`;
    groupedTextStyles[groupName].forEach((style) => {
      dartFile += generateTextStyleDartCode(style);
    });
    dartFile += `}\n`;
  });
  return dartFile;
}

/**
 * Groups text styles by their hierarchical name.
 * @param textStyles - The list of text styles.
 * @returns An object with grouped text styles.
 */
function groupTextStyles(textStyles: TextStyle[]): Record<string, TextStyle[]> {
  return textStyles.reduce((groups: Record<string, TextStyle[]>, style: TextStyle) => {
    const parts = style.name.split('/');
    const groupName = parts.slice(0, -1).join('_') || '__root__';
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(style);
    return groups;
  }, {});
}

/**
 * Generates Dart code for an individual text style.
 * @param style - The text style to generate code for.
 * @returns The generated Dart code as a string.
 */
function generateTextStyleDartCode(style: TextStyle): string {
  const styleName = style.name.split('/').pop();
  let dartCode = `\n`;

  if (styleName) {
    const styleNameCamelCase = toCamelCase(styleName);
    dartCode += `  static final _${styleNameCamelCase} = TextStyle(\n`;

    dartCode += generateTextStyleProperty('fontFamily', style.boundVariables?.fontFamily, style.fontName.family);
    dartCode += generateTextStyleProperty('fontSize', style.boundVariables?.fontSize, style.fontSize.toString());
    dartCode += generateTextStyleProperty('fontWeight', style.boundVariables?.fontStyle, style.fontName.style);
    
    if (style.lineHeight.unit !== "AUTO") {
      const heightFactor = style.lineHeight.value / style.fontSize;
      dartCode += generateTextStyleHeight(style.boundVariables?.lineHeight, style.boundVariables?.fontSize, heightFactor.toString());
    }
    
    dartCode += `  );\n`;
    dartCode += `  TextStyle get ${styleNameCamelCase} => _${styleNameCamelCase};\n`;  
  }

  return dartCode;
}


/**
 * Generates Dart code for TextStyle height property.
 * If bound variable exists for line height and font size, it uses variable references.
 * Otherwise, it uses the provided fallback value.
 * @param propertyName - The name of the property.
 * @param boundVariable - The bound variable reference.
 * @param fallbackValue - The fallback value if no bound variable is found.
 * @returns The generated Dart code for the property.
 */
function generateTextStyleHeight(
  lineHeightBoundVariable: TextStyleBoundVariable | undefined,
  fontSizeBoundVariable: TextStyleBoundVariable | undefined,
  fallbackValue: string
): string {
  if (lineHeightBoundVariable && lineHeightBoundVariable.type === 'VARIABLE_ALIAS' &&
    fontSizeBoundVariable && fontSizeBoundVariable.type === 'VARIABLE_ALIAS') {
    const lineHeightVariable = figma.variables.getVariableById(lineHeightBoundVariable.id);
    const lineHeightReference = generateVariableReference(lineHeightVariable);
    const fontSizeVariable = figma.variables.getVariableById(fontSizeBoundVariable.id);
    const fontSizeReference = generateVariableReference(fontSizeVariable);
    if (lineHeightReference && fontSizeReference) {
      const value = `getHeight(${lineHeightReference}, ${fontSizeReference})`;
      return `    height: ${value},\n`;
    }
  }
  const value = fallbackValue;
  return `    height: ${value},\n`;
}

/**
 * Generates Dart code for a specific text style property.
 * If a bound variable exists, it uses the variable reference.
 * Otherwise, it uses the provided fallback value.
 * @param propertyName - The name of the property.
 * @param boundVariable - The bound variable reference.
 * @param fallbackValue - The fallback value if no bound variable is found.
 * @returns The generated Dart code for the property.
 */
function generateTextStyleProperty(
  propertyName: string,
  boundVariable: TextStyleBoundVariable | undefined,
  fallbackValue: string
): string {
  if (boundVariable && boundVariable.type === 'VARIABLE_ALIAS') {
    const variable = figma.variables.getVariableById(boundVariable.id);
    const variableReference = generateVariableReference(variable);
    if (variableReference) {
      const value = propertyName === 'fontWeight' ? `getFontWeight(${variableReference})` : variableReference;
      return `    ${propertyName}: ${value},\n`;
    }
  }
  const value = propertyName === 'fontWeight' ? `getFontWeight(${fallbackValue})` : fallbackValue;
  return `    ${propertyName}: ${value},\n`;
}

/**
 * Generates the reference string for a variable.
 * Includes the collection name as the first part of the reference.
 * @param variable - The variable for which the reference is generated.
 * @returns The generated reference string.
 */
function generateVariableReference(variable: Variable | null) {
  if (variable) {
    const parts = variable.name.split('/');

    const collection = figma.variables
		.getLocalVariableCollections()
		.find((collection) => collection.id === variable.variableCollectionId);
    let referenceParts;
    if (collection) {
      const collectionName = toCamelCase(collection.name);
      referenceParts = [collectionName, ...parts.map(part => toCamelCase(part))];
    } else {
      referenceParts = [...parts.map(part => toCamelCase(part))];
    }
    return referenceParts.join('.'); // Join all parts with a dot to form the reference
  }
  return null;
}