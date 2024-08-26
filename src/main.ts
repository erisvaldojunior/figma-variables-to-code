import { showUI } from '@create-figma-plugin/utilities'

export default function () {

  showUI({
    height: 160,
    width: 240
  })

/* Prepare variables for code generation */
const dartFile = generateDartCode();

/* Sends to the UI the code generation */
figma.ui.postMessage({ dartFile });

/* Catches event when code copied to clipboard and notify the user */
figma.ui.onmessage = (message) => {
	if (message.type === 'code-copied-dart') {
		figma.notify('Dart code successfully copied to clipboard');
	}
};

}

function removeSpacesAndConcatenate(str: string): string {
	return str.trim().split(/\s+/).join('');
}

/*
 ** Converts a string to camelCase and adds prefix 'n' if the name starts with a digit
 */
function toCamelCase(str: string): string {
	const convertedStr = removeSpacesAndConcatenate(str)
		.replace(/[-_\s]+(.)?/g, (_, chr) => (chr ? chr.toUpperCase() : ''))
		.replace(/^\d/, (chr) => `n${chr}`);
	const camelCaseStr = convertedStr[0].toLowerCase() + convertedStr.slice(1);
	return camelCaseStr;
}

function toPascalCase(str: string): string {
	// Remove underscores, hyphens, and convert the string to camelCase first
	const camelCaseString = removeSpacesAndConcatenate(str)
		.replace(/[-_]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
		.replace(/^(.)/, (char) => char.toLowerCase());
	// Convert the first character to uppercase to make it PascalCase
	return camelCaseString.charAt(0).toUpperCase() + camelCaseString.slice(1);
}

/*
 ** Converts a rgba color to hex
 */
function rgba2hex(orig: any) {
	let a;
	const rgb = orig
			.replace(/\s/g, '')
			.match(/^rgba?\((\d+),(\d+),(\d+),?([^,\s)]+)?/i),
		alpha = ((rgb && rgb[4]) || '').trim();
	let hex = rgb
		? (rgb[1] | (1 << 8)).toString(16).slice(1) +
      (rgb[2] | (1 << 8)).toString(16).slice(1) +
      (rgb[3] | (1 << 8)).toString(16).slice(1)
		: orig;

	if (alpha !== '') {
		a = alpha;
	} else {
		a = 0o1;
	}
	a = ((a * 255) | (1 << 8)).toString(16).slice(1);
	hex = hex + a;

	return '#' + hex.toUpperCase();
}

function getDartType(variableType: VariableResolvedDataType): string {
	if (variableType === 'BOOLEAN') return 'bool';
	if (variableType === 'COLOR') return 'Color';
	if (variableType === 'FLOAT') return 'double';
	if (variableType === 'STRING') return 'String';
	throw new Error('Unknown variable type');
}

function convertQuotes(input: string): string {
	if (input.startsWith('"') && input.endsWith('"') && input.length > 1) {
		return `'${input.slice(1, -1)}'`;
	}
	return input;
}

/*
 ** =================
 ** Utils - Converters
 ** =================
 */

/*
 ** Converts a rgba object to a Dart hex string
 */
function rgbaObjectToDartHexaString(obj: {
  r: number;
  g: number;
  b: number;
  a: number;
}): string {
	const { r, g, b, a } = obj;
	const rgbaString = rgba2hex(
		`rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(
			b * 255,
		)}, ${a})`,
	);
	return `Color(0x${rgbaString.substring(7)}${rgbaString.substring(1, 7)})`;
}

function isVariableAlias(value: any): value is VariableAlias {
	return (
		value && value.type === 'VARIABLE_ALIAS' && typeof value.id === 'string'
	);
}

/*
 ** =================
 ** Utils - Generators
 ** =================
 */

type ValueType = {
  valueContent: string;
  valueType: 'alias' | 'color' | 'primitive' | undefined;
};

/*
 ** Converts a value to a Dart string representation
 */
function generateDartValueString(
	variable: Variable,
	figmaVariables: Variable[],
): ValueType {
	const variableId = variable.id;
	const variableObject = <Variable>(
    figmaVariables.find((obj) => obj.id === variableId)
  );
	const variableValueObject = variableObject.valuesByMode;
	if (variableValueObject) {
		const variableValueKey = Object.keys(variableValueObject)[0];
		if (variableValueKey) {
			const value: VariableValue = variableValueObject[variableValueKey];
			if (value) {
				if (isVariableAlias(value)) {
					const variableAlias = value as VariableAlias;
					const relatedVariableObject = figmaVariables.find(
						(obj) => obj.id === variableAlias.id,
					);
					if (relatedVariableObject) {
						return {
							valueContent: `FigmaVariables.${generateDartKeyString(relatedVariableObject)}`,
							valueType: 'alias',
						};
					}
				} else if (variableObject.resolvedType === 'COLOR') {
					return {
						valueContent: rgbaObjectToDartHexaString(value as RGBA),
						valueType: 'color',
					};
				} else {
					// Assuming 'value' is a primitive (number, string, etc)
					return {
						valueContent: JSON.stringify(variableValueObject[variableValueKey]),
						valueType: 'primitive',
					};
				}
			}
		}
	}
	return { valueContent: '0', valueType: 'primitive' };
}

/*
 ** Generates a Dart key string for a variable, including the full class path
 */
function generateDartKeyString(variable: Variable): string {
	const parts = variable.name.split('/');
	let transformedVariableName = '';
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i].trim();
		const capitalizedPart =
      (i > 0 ? part.charAt(0).toUpperCase() : part.charAt(0)) + part.slice(1);
		transformedVariableName += capitalizedPart;
	}
	// Generate the full path based on the collection and groups
	const collection = figma.variables
		.getLocalVariableCollections()
		.find((collection) => collection.id === variable.variableCollectionId);
	if (!collection) return transformedVariableName;
	const collectionName = toCamelCase(collection.name);
	const groupPath = parts.slice(0, -1);
	let transformedGroupPath = '';
	for (let i = 0; i < groupPath.length; i++) {
		const part = parts[i].trim();
		const capitalizedPart =
      (i > 0 ? part.charAt(0).toUpperCase() : part.charAt(0)) + part.slice(1);
		transformedGroupPath += capitalizedPart;
	}
	const fullPath =
    groupPath.length > 0
    	? `${collectionName}.${transformedGroupPath}`
    	: collectionName;
	const tokenName = parts[parts.length - 1];
	// Prefix with 'n' if starts with a number
	return /^\d/.test(tokenName)
		? `${fullPath}.n${tokenName}`
		: `${fullPath}.${tokenName}`;
}

/*
 ** Generates Dart code for a variable
 */
function generateDartCodeForVariable(
	variable: Variable,
	figmaVariables: Variable[],
): string {
	const variableObject = <Variable>(
    figmaVariables.find((obj) => obj.id === variable.id)
  );
	const dartKey = generateDartKeyString(variable);
	const { valueContent, valueType } = generateDartValueString(
		variable,
		figmaVariables,
	);
	const resolvedType = variableObject.resolvedType;
	let doubleKeyPlusSpace = '';
	let value = valueContent;
	if (resolvedType === 'STRING') {
		value = convertQuotes(valueContent);
	} else if (resolvedType === 'FLOAT') {
		doubleKeyPlusSpace = 'double ';
	}
	let dartCode = '\n';
	dartCode += `  static ${valueType === 'primitive' ? 'const' : 'final'} ${doubleKeyPlusSpace}_${dartKey} = ${value};\n`;
	dartCode += `  ${getDartType(resolvedType)} get ${dartKey} => _${dartKey};\n`;
	return dartCode;
}

function generateDartCodeForCollection(
	collection: VariableCollection,
	variables: Variable[],
	figmaVariables: Variable[],
): string {
	// Converts collection name to PascalCase
	const collectionName = toPascalCase(collection.name);
	// Start creating the Dart class with PascalCase class name
	let dartCode = `final class ${collectionName} {\n`;
	// Create class constructor
	dartCode += `  const ${collectionName}();\n`;
	// Group variables by their group name
	const groupedVariables = variables.reduce(
		(acc: Record<string, Variable[]>, variable: Variable) => {
			const parts = variable.name.split('/');
			const groupName =
        parts.length > 1 ? toCamelCase(parts.slice(0, -1).join('_')) : '';
			const variableName = toCamelCase(parts[parts.length - 1]);
			if (!groupName) {
				// Variables in the root of the collection
				if (!acc['__root__']) {
					acc['__root__'] = [];
				}
				acc['__root__'].push({ ...variable, name: variableName });
			} else {
				if (!acc[groupName]) {
					acc[groupName] = [];
				}
				acc[groupName].push({ ...variable, name: variableName });
			}
			return acc;
		},
		{},
	);
	// Iterate over the grouped variables and generate Dart code
	Object.keys(groupedVariables).forEach((groupName) => {
		if (groupName === '__root__') {
			// Generate Dart code for variables in the root of the collection
			groupedVariables[groupName].forEach((variable) => {
				dartCode += generateDartCodeForVariable(variable, figmaVariables);
			});
		} else {
			const groupNameCamelCase = toCamelCase(groupName);
			const groupNamePascalCase = toPascalCase(groupName);
			dartCode += '\n';
			dartCode += `  static const _${groupNameCamelCase} = ${groupNamePascalCase}();\n`;
			dartCode += `  ${groupNamePascalCase} get ${groupNameCamelCase} => _${groupNameCamelCase};\n`;
		}
	});
	// Close the Dart class
	dartCode += '}\n';
	// Generate separate classes for each group outside the parent class
	Object.keys(groupedVariables).forEach((groupName) => {
		if (groupName !== '__root__') {
			dartCode += '\n';
			dartCode += `final class ${toPascalCase(groupName)} {\n`;
			dartCode += `  const ${toPascalCase(groupName)}();\n`;
			groupedVariables[groupName].forEach((variable) => {
				dartCode += generateDartCodeForVariable(variable, figmaVariables);
			});
			dartCode += '}\n';
		}
	});
	return dartCode;
}

/*
 ** Generates the complete Dart code for all collections
 */
function generateDartCode(): string {
	const collections = figma.variables.getLocalVariableCollections();
	const variables = figma.variables.getLocalVariables();
	// Import dart:ui, needed for Dart Color class
	// eslint-disable-next-line quotes
	let dartFile = `// WARNING: This file is auto-generated by the figma-variables-to-dart plugin.
// DO NOT manually modify this file. Any manual changes will be overwritten
// during the next generation process.\n`;
	// eslint-disable-next-line quotes
	dartFile += "import 'dart:ui';\n\n";
	// Generate a root abstract class for Figma Variables
	dartFile += 'abstract final class FigmaVariables {\n';
	collections.forEach((collection) => {
		dartFile += `  static const ${toCamelCase(collection.name)} = ${toPascalCase(collection.name)}();\n`;
	});
	dartFile += '}\n';
	// Generate a class for each collection
	collections.forEach((collection) => {
		dartFile += '\n';
		const collectionVariables = variables.filter(
			(variable) => variable.variableCollectionId === collection.id,
		);
		dartFile += generateDartCodeForCollection(
			collection,
			collectionVariables,
			variables,
		);
	});
	return dartFile;
}
