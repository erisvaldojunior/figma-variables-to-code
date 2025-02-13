import { formatLine } from './dartFormat';
import { rgbaObjectToDartHexaString } from './converters';
import { formatModeNameForFile, formatModeNameForVariable, toCamelCase, toPascalCase, toSingleQuotes } from './string';
import { generateHeaderComment } from './utilsGenerators';
import { getUniqueModes } from './variablesModes';

type VariableValueType = {
	valueContent: string;
	valueType: 'alias' | 'color' | 'primitive' | undefined;
};

/**
 * Generates figma_variables.dart file.
 * @returns The generated Dart code (entire file).
 */
export function generateVariablesFile(): string {
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
		dartFile += `import 'figma_variables_${name}.dart' as ${alias};\n`;
	});
	dartFile += '\n';
	
	// Expose default mode directly
	collections.forEach((collection) => {
		const name = toCamelCase(collection.name);
		const className = toPascalCase(collection.name);
		dartFile += `final ${name} = default_mode.${className}();\n`;
	});
	dartFile += '\n';
	
	// Create typed wrapper class
	dartFile += '// Create typed wrapper for other modes\n';
	let modeWrapperLine = 'class ModeWrapper<';
	collections.forEach((collection, index) => {
		const className = toPascalCase(collection.name);
		modeWrapperLine += `${className}${index === collections.length - 1 ? '>' : ', '}`;
	});
	dartFile += formatLine(modeWrapperLine, 4) + ' {\n';
	dartFile += '  const ModeWrapper({\n';
	collections.forEach((collection) => {
		const name = toCamelCase(collection.name);
		dartFile += `    required this.${name},\n`;
	});
	dartFile += '  });\n';
	
	collections.forEach((collection) => {
		const name = toCamelCase(collection.name);
		const className = toPascalCase(collection.name);
		dartFile += `  final ${className} ${name};\n`;
	});
	dartFile += '}\n\n';
	
	// Create instances for each mode
	uniqueModes.forEach((mode, index) => {
		const modeName = formatModeNameForFile(mode.name);
		const modeVarName = formatModeNameForVariable(mode.name) + 'Mode';
		
		dartFile += `final ${modeVarName} = ModeWrapper<\n`;
		collections.forEach((collection, index) => {
			const className = toPascalCase(collection.name);
			dartFile += `    ${modeName}_mode.${className}${index === collections.length - 1 ? '>' : ',\n'}`;
		});
		dartFile += '(\n';
		
		collections.forEach((collection) => {
			const name = toCamelCase(collection.name);
			const className = toPascalCase(collection.name);
			dartFile += `  ${name}: ${modeName}_mode.${className}(),\n`;
		});
		// Add single newline if it's not the last mode
		dartFile += `);\n${index < uniqueModes.length - 1 ? '\n' : ''}`;
	});
	
	return dartFile;
}

/**
 * Generates the Dart file for each mode from Figma Variables.
 * @returns An object containing the generated Dart file for each mode.
 */
export function generateVariablesModesFiles(): Record<string, string> {
	const collections = figma.variables.getLocalVariableCollections();
	const variables = figma.variables.getLocalVariables();
	const modeCodes: Record<string, string> = {};
	
	collections.forEach((collection) => {
		collection.modes.forEach((mode) => {
			const modeName = mode.modeId === collection.defaultModeId ? 
				'default' : 
				formatModeNameForFile(mode.name);
				
			if (!modeCodes[modeName]) {
				modeCodes[modeName] = generateDartCodeForMode(
					variables,
					mode.modeId
				);
			}
		});
	});
	
	return modeCodes;
}

/**
 * Generates the Dart code for a specific mode
 */
function generateDartCodeForMode(
	variables: Variable[],
	modeId: string
): string {
	let dartFile = generateHeaderComment();
	dartFile += "import 'dart:ui';\n";
	
	// Generate code for each collection
	const collections = figma.variables.getLocalVariableCollections();
	collections.forEach((collection) => {
		const collectionVariables = variables.filter(
			(variable) => variable.variableCollectionId === collection.id
		);
		
		if (collectionVariables.length > 0) {
			dartFile += generateDartCodeForCollection(
				collection,
				collectionVariables,
				variables,
				modeId
			);
		}
	});
	
	return dartFile;
}

/*
 ** Converts a value to a Dart string representation
 */
function generateDartValueString(
	variable: Variable,
	figmaVariables: Variable[],
	modeId: string
): VariableValueType {
	const variableId = variable.id;
	const variableObject = figmaVariables.find((obj) => obj.id === variableId);
	
	if (!variableObject) {
		return { valueContent: '0', valueType: 'primitive' };
	}
	
	const value = variableObject.valuesByMode[modeId];
	
	if (!value) {
		// If there's no value for this mode, use the default mode value
		const defaultModeId = figma.variables
			.getLocalVariableCollections()
			.find(c => c.id === variableObject.variableCollectionId)
			?.defaultModeId;
			
		if (defaultModeId) {
			const defaultValue = variableObject.valuesByMode[defaultModeId];
			if (defaultValue) {
				if (isVariableAlias(defaultValue)) {
					const aliasVariable = figmaVariables.find(v => v.id === defaultValue.id);
					if (aliasVariable) {
						return {
							valueContent: generateDartKeyString(aliasVariable),
							valueType: 'alias',
						};
					}
				} else if (variableObject.resolvedType === 'COLOR') {
					return {
						valueContent: rgbaObjectToDartHexaString(defaultValue as RGBA),
						valueType: 'color',
					};
				}
				// For primitive values, use JSON.stringify
				return {
					valueContent: JSON.stringify(defaultValue),
					valueType: 'primitive',
				};
			}
		}
		// If no value is found in default mode, return 0
		return { valueContent: '0', valueType: 'primitive' };
	}
	
	if (isVariableAlias(value)) {
		const aliasVariable = figmaVariables.find(v => v.id === value.id);
		if (aliasVariable) {
			return {
				valueContent: generateDartKeyString(aliasVariable),
				valueType: 'alias',
			};
		}
	} else if (variableObject.resolvedType === 'COLOR') {
		return {
			valueContent: rgbaObjectToDartHexaString(value as RGBA),
			valueType: 'color',
		};
	}
	
	// For primitive values, convert number to string directly
	return {
		valueContent: typeof value === 'number' ? 
			value.toString() : 
			typeof value === 'string' ? 
				value : 
				JSON.stringify(value),
		valueType: 'primitive',
	};
}

/**
 * Generates a Dart key string for a variable, including the full class path.
 * @param variable - The variable to generate the key for.
 * @returns The generated Dart key string.
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
	const collectionName = toPascalCase(collection.name);
	const groupPath = parts.slice(0, -1);
	let transformedGroupPath = '';
	for (let i = 0; i < groupPath.length; i++) {
		const part = parts[i].trim();
		const capitalizedPart =
			(i > 0 ? part.charAt(0).toUpperCase() : part.charAt(0)) + part.slice(1);
		transformedGroupPath += collectionName + toPascalCase(capitalizedPart);
	}
	const fullPath =
		groupPath.length > 0
			? `${transformedGroupPath}`
			: collectionName;
	const tokenName = toCamelCase(parts[parts.length - 1]);
	// Prefix with 'n' if starts with a number
	return /^\d/.test(tokenName)
		? `${fullPath}._n${tokenName}`
		: `${fullPath}._${tokenName}`;
}

/**
 * Generates Dart code for a variable.
 * @param variable - The variable to generate code for.
 * @param figmaVariables - The list of all Figma variables.
 * @param modeId - The mode ID to generate code for.
 * @returns The generated Dart code as a string.
 */
function generateDartCodeForVariable(
	variable: Variable,
	figmaVariables: Variable[],
	modeId: string
): string {
	const variableObject = <Variable>(
		figmaVariables.find((obj) => obj.id === variable.id)
	);
	const dartKey = generateDartKeyString(variable);
	const { valueContent, valueType } = generateDartValueString(
		variable,
		figmaVariables,
		modeId
	);
	const resolvedType = variableObject.resolvedType;
	let doubleKeyPlusSpace = '';
	let value = valueContent;
	if (resolvedType === 'STRING') {
		value = toSingleQuotes(valueContent);
	} else if (resolvedType === 'FLOAT') {
		doubleKeyPlusSpace = 'double ';
	}
	let dartCode = '\n';
	dartCode += `  static ${valueType === 'primitive' ? 'const' : 'final'} ${doubleKeyPlusSpace}_${dartKey} = ${value};\n`;
	dartCode += `  ${getDartType(resolvedType)} get ${dartKey} => _${dartKey};\n`;
	return dartCode;
}

/**
 * Generates Dart code for a collection of variables.
 * @param collection - The collection of variables.
 * @param variables - The list of variables in the collection.
 * @param figmaVariables - The list of all Figma variables.
 * @returns The generated Dart code for the collection.
 */
function generateDartCodeForCollection(
	collection: VariableCollection,
	variables: Variable[],
	figmaVariables: Variable[],
	modeId: string
): string {
	// Converts collection name to PascalCase
	const collectionName = toPascalCase(collection.name);
	// Start creating the Dart class with PascalCase class name
	let dartCode = `\nfinal class ${collectionName} {\n`;
	// Create class constructor
	dartCode += `  const ${collectionName}();\n`;
	// Group variables by their group name
	// FIXME: nested level groups (subgroups) should generate new classes
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
		{}
	);
	// Iterate over the grouped variables and generate Dart code
	Object.keys(groupedVariables).forEach((groupName) => {
		if (groupName === '__root__') {
			// Generate Dart code for variables in the root of the collection
			groupedVariables[groupName].forEach((variable) => {
				dartCode += generateDartCodeForVariable(variable, figmaVariables, modeId);
			});
		} else {
			const groupNameCamelCase = toCamelCase(groupName);
			const groupNamePascalCase = collectionName + toPascalCase(groupName);
			dartCode += '\n';
			dartCode += `  static final _${groupNameCamelCase} = ${groupNamePascalCase}();\n`;
			dartCode += `  ${groupNamePascalCase} get ${groupNameCamelCase} => _${groupNameCamelCase};\n`;
		}
	});
	// Close the Dart class
	dartCode += '}\n';
	// Generate separate classes for each group outside the parent class
	Object.keys(groupedVariables).forEach((groupName) => {
		if (groupName !== '__root__') {
			const groupNamePascalCase = collectionName + toPascalCase(groupName);
			dartCode += '\n';
			dartCode += `final class ${groupNamePascalCase} {\n`;
			dartCode += `  const ${groupNamePascalCase}();\n`;
			groupedVariables[groupName].forEach((variable) => {
				dartCode += generateDartCodeForVariable(variable, figmaVariables, modeId);
			});
			dartCode += '}\n';
		}
	});
	return dartCode;
}

/**
 * Gets the Dart type for a given variable type.
 * @param variableType - The variable type to convert.
 * @returns The corresponding Dart type as a string.
 */
function getDartType(variableType: VariableResolvedDataType): string {
	if (variableType === 'BOOLEAN') return 'bool';
	if (variableType === 'COLOR') return 'Color';
	if (variableType === 'FLOAT') return 'double';
	if (variableType === 'STRING') return 'String';
	throw new Error('Unknown variable type');
}

function isVariableAlias(value: any): value is VariableAlias {
	return (
		value && value.type === 'VARIABLE_ALIAS' && typeof value.id === 'string'
	);
}

