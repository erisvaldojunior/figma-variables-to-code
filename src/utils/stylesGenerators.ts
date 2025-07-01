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

type ImportItem = {
  name: string;
  path: string;
  alias?: string;
};

/**
 * Generates the Dart file `figma_styles.dart`.
 * @returns The generated Dart file as a string.
 */
export function generateStylesFile(): string {
  const collections = figma.variables.getLocalVariableCollections();
  let dartFile = generateHeaderComment();
  // Get all modes and sort them alphabetically by their file names
  const uniqueModes = getUniqueModes(collections);
  const sortedImports: ImportItem[] = [
    ...uniqueModes.map(mode => ({
      name: formatModeNameForFile(mode.name),
      alias: `${formatModeNameForFile(mode.name)}_mode`,
      path: `figma_styles_${formatModeNameForFile(mode.name)}.dart`
    })),
    { 
      name: 'default', 
      alias: 'default_mode',
      path: 'figma_styles_default.dart'
    },
    {
      name: 'styles_interface',
      path: 'figma_styles_interface.dart'
    }
  ].sort((a, b) => a.path.localeCompare(b.path));
  
  // Generate imports
  sortedImports.forEach(({ path, alias }) => {
    dartFile += alias ? 
      `import '${path}' as ${alias} show TextStyles;\n` : 
      `import '${path}';\n`;
  });
  dartFile += '\n';
  
  // Expose default mode directly
  dartFile += `const textStyles = default_mode.TextStyles();\n\n`;
  
  // Create typed wrapper class
  dartFile += '// Create typed wrapper for other modes\n';
  dartFile += 'class ModeWrapper<T extends ITextStyles> {\n';
  dartFile += '  const ModeWrapper({\n';
  dartFile += `    required this.textStyles,\n`;
  dartFile += '  });\n';
  dartFile += `  final T textStyles;\n`;
  dartFile += '}\n\n';
  
  // Create instances for each mode
  uniqueModes.forEach((mode, index) => {
    const modeName = formatModeNameForFile(mode.name);
    const modeVarName = formatModeNameForVariable(mode.name) + 'Mode';    
    dartFile += `const ${modeVarName} = ModeWrapper<${modeName}_mode.TextStyles>(\n`;    
    dartFile += `  textStyles: ${modeName}_mode.TextStyles(),\n`;
    dartFile += `);\n${index < uniqueModes.length - 1 ? '\n' : ''}`;
  });
  
  return dartFile;
}

/**
 * Generates the styles interface file `figma_styles_interface.dart`.
 * @returns The generated interface file as a string.
 */
export function generateStylesInterfaceFile(): string {
  let dartFile = generateHeaderComment();
  dartFile += `import 'package:flutter/material.dart';\n\n`;
  
  // Generate base interface for text styles
  dartFile += '// Base interface for text styles across all modes\n';
  dartFile += 'abstract interface class ITextStyles {\n';
  
  // Generate dynamic interface based on actual text styles
  const textStyles = figma.getLocalTextStyles();
  const groupedStyles = groupTextStyles(textStyles);
  
  Object.keys(groupedStyles).forEach(groupName => {
    if (groupName !== '__root__') {
      const groupNameCamelCase = toCamelCase(groupName);
      const groupNamePascalCase = toPascalCase(groupName);
      dartFile += `  I${groupNamePascalCase} get ${groupNameCamelCase};\n`;
    }
  });
  
  dartFile += '}\n\n';
  
  // Generate interfaces for each style group (reuse existing variables)
  
  Object.keys(groupedStyles).forEach(groupName => {
    const interfaceName = `I${toPascalCase(groupName)}`;
    dartFile += `abstract interface class ${interfaceName} {\n`;
    
    groupedStyles[groupName].forEach(style => {
      const styleName = style.name.split('/').pop();
      if (styleName) {
        const propertyName = toCamelCase(styleName);
        dartFile += `  TextStyle get ${propertyName};\n`;
      }
    });
    
    dartFile += '}\n\n';
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
  dartFile += `import 'figma_styles_interface.dart';\n`;
  dartFile += `import 'figma_utils.dart';\n`;
  dartFile += `import 'figma_variables.dart';\n\n`;
  
  // Make TextStyles implement ITextStyles
  dartFile += `final class TextStyles implements ITextStyles {\n`;
  dartFile += `  const TextStyles();\n`;
  
  const groupedTextStyles = groupTextStyles(textStyles);
  Object.keys(groupedTextStyles).forEach((groupName) => {
    const groupNameCamelCase = toCamelCase(groupName);
    const groupNamePascalCase = toPascalCase(groupName);
    dartFile += `\n`;
    dartFile += `  static const _${groupNameCamelCase} = ${groupNamePascalCase}();\n`;
    dartFile += `  @override\n`;
    dartFile += `  I${groupNamePascalCase} get ${groupNameCamelCase} => _${groupNameCamelCase};\n`;
  });
  dartFile += `}\n`;
  
  // Make each style group implement its interface
  Object.keys(groupedTextStyles).forEach((groupName) => {
    const groupClassName = toPascalCase(groupName);
    dartFile += `\n`;
    dartFile += `final class ${groupClassName} implements I${groupClassName} {\n`;
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
    dartCode += `  @override\n`;
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
      const line = `    height: getHeight(${modeVarPrefix}${lineHeightReference}, ${modeVarPrefix}${fontSizeReference}),`;
      return formatLine(line, 4) + '\n';
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

    const collections = figma.variables.getLocalVariableCollections();
    let collection = null;
    for (let i = 0; i < collections.length; i++) {
      if (collections[i].id === variable.variableCollectionId) {
        collection = collections[i];
        break;
      }
    }
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