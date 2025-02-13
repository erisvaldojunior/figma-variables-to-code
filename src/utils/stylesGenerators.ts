import { formatLine } from './dartFormat';
import { formatModeNameForFile, formatModeNameForVariable, toCamelCase, toPascalCase } from './string';
import { generateHeaderComment } from './utilsGenerators';
import { getUniqueModes } from './variablesModes';

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
 * Generates the Dart file `figma_styles.dart`.
 * @returns The generated Dart file as a string.
 */
export function generateStylesFile(): string {
  const collections = figma.variables.getLocalVariableCollections();
  let dartFile = generateHeaderComment();
  // Get all modes and sort them alphabetically by their file names
  const uniqueModes = getUniqueModes(collections);
  const sortedImports = [
    ...uniqueModes.map(mode => ({
      name: formatModeNameForFile(mode.name),
      alias: `${formatModeNameForFile(mode.name)}_mode`
    })),
    { name: 'default', alias: 'default_mode' }  // Add default mode to the list
  ].sort((a, b) => a.name.localeCompare(b.name));  // Sort everything alphabetically
  // Generate imports in alphabetical order
  sortedImports.forEach(({ name, alias }) => {
    dartFile += `import 'figma_styles_${name}.dart' as ${alias} show TextStyles;\n`;
  });
  dartFile += '\n';
  // Expose default mode directly
  dartFile += `final textStyles = default_mode.TextStyles();\n`;
  dartFile += '\n';
  // Create typed wrapper class
  dartFile += '// Create typed wrapper for other modes\n';
  dartFile += 'class ModeWrapper<TextStyles> {\n';
  dartFile += '  const ModeWrapper({\n';
  dartFile += `    required this.textStyles,\n`;
  dartFile += '  });\n';  
  dartFile += `  final TextStyles textStyles;\n`;
  dartFile += '}\n\n';
  // Create instances for each mode
  uniqueModes.forEach((mode, index) => {
    const modeName = formatModeNameForFile(mode.name);
    const modeVarName = formatModeNameForVariable(mode.name) + 'Mode';    
    dartFile += `final ${modeVarName} = ModeWrapper<${modeName}_mode.TextStyles>(\n`;    
    dartFile += `  textStyles: ${modeName}_mode.TextStyles(),\n`;
    // Add single newline if it's not the last mode
    dartFile += `);\n${index < uniqueModes.length - 1 ? '\n' : ''}`;
  });
  return dartFile;  
}

/**
 * Generates the styles file for each mode from Figma Variables.
 * @returns An object containing the generated style file for each mode.
 */
export function generateStylesModesFiles(): Record<string, string> {
  const collections = figma.variables.getLocalVariableCollections();
  const modeCodes: Record<string, string> = {};  
  collections.forEach((collection) => {
    collection.modes.forEach((mode) => {
      const modeName = mode.modeId === collection.defaultModeId ? 
        'default' : 
        formatModeNameForFile(mode.name);
        
      if (!modeCodes[modeName]) {
        modeCodes[modeName] = generateStyleCodeForMode(
          mode.name
        );
      }
    });
  });
  
  return modeCodes;
}

/**
 * Generates the internal Dart code for `figma_styles_internal.dart`.
 * @returns The generated internal Dart code as a string.
 */
export function generateStyleCodeForMode(modeName: string): string {
  const modeVarPrefix = modeName === 'Mode 1' ? '' : formatModeNameForVariable(modeName) + 'Mode' + '.';

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
      dartFile += generateTextStyleDartCode(modeVarPrefix, style);
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
function generateTextStyleDartCode(modeVarPrefix: string, style: TextStyle): string {
  const styleName = style.name.split('/').pop();
  let dartCode = `\n`;

  if (styleName) {
    const styleNameCamelCase = toCamelCase(styleName);
    dartCode += `  static final _${styleNameCamelCase} = TextStyle(\n`;

    dartCode += generateTextStyleProperty('fontFamily', modeVarPrefix, style.boundVariables?.fontFamily, style.fontName.family);
    dartCode += generateTextStyleProperty('fontSize', modeVarPrefix, style.boundVariables?.fontSize, style.fontSize.toString());
    dartCode += generateTextStyleProperty('fontWeight', modeVarPrefix, style.boundVariables?.fontStyle, style.fontName.style);
    
    if (style.lineHeight.unit !== "AUTO") {
      const heightFactor = style.lineHeight.value / style.fontSize;
      dartCode += generateTextStyleHeight(modeVarPrefix, style.boundVariables?.lineHeight, style.boundVariables?.fontSize, heightFactor.toString());
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
 * @returns The generated Dart code for the property.
 */
function generateTextStyleHeight(
  modeVarPrefix: string,
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
      const value = `getHeight(${modeVarPrefix}${lineHeightReference}, ${modeVarPrefix}${fontSizeReference})`;
      return `    height: ${formatLine(value, 4)},\n`;
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
 * @param modeName - Figma Variable Mode name.
 * @param boundVariable - The bound variable reference.
 * @param fallbackValue - The fallback value if no bound variable is found.
 * @returns The generated Dart code for the property.
 */
function generateTextStyleProperty(
  propertyName: string,
  modeVarPrefix: string,
  boundVariable: TextStyleBoundVariable | undefined,
  fallbackValue: string
): string {
  if (boundVariable && boundVariable.type === 'VARIABLE_ALIAS') {
    const variable = figma.variables.getVariableById(boundVariable.id);
    const variableReference = generateVariableReference(variable);
    if (variableReference) {
      const value = propertyName === 'fontWeight' ? `getFontWeight(${modeVarPrefix}${variableReference})` : `${modeVarPrefix}${variableReference}`;
      return `    ${propertyName}: ${value},\n`;
    }
  }
  let value;
  if (propertyName === 'fontFamily') {
    value = `'${fallbackValue}'`;
  } else if (propertyName === 'fontWeight') {
    value = `getFontWeight('${fallbackValue}')`;
  } else {
    // fontSize or height
    value = fallbackValue;
  }
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