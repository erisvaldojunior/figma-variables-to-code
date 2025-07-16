import { formatLine } from './dartFormat';
import { rgbaObjectToDartHexaString } from './converters';
import { formatModeNameForFile, formatModeNameForVariable, toCamelCase, toPascalCase, toSingleQuotes } from './string';
import { generateHeaderComment } from './utilsGenerators';
import { getUniqueModes } from './variablesModes';
import { errorLogger } from './errorLogger';

type VariableValueType = {
	valueContent: string;
	valueType: 'alias' | 'color' | 'primitive' | undefined;
};

type ImportItem = {
  name: string;
  path: string;
  alias?: string;
};

/**
 * Generates figma_variables.dart file.
 * @returns The generated Dart code (entire file).
 */
export function generateVariablesFile(): string {
	const collections = figma.variables.getLocalVariableCollections();
	let dartFile = generateHeaderComment();
	
	// Generate imports
	const uniqueModes = getUniqueModes(collections);
	const sortedImports: ImportItem[] = [
		...uniqueModes.map(mode => ({
			name: formatModeNameForFile(mode.name),
			alias: `${formatModeNameForFile(mode.name)}_mode`,
			path: `figma_variables_${formatModeNameForFile(mode.name)}.dart`
		})),
		{ 
			name: 'default', 
			alias: 'default_mode',
			path: 'figma_variables_default.dart'
		},
		{
			name: 'variables_interface',
			path: 'figma_variables_interface.dart'
		}
	].sort((a, b) => a.path.localeCompare(b.path));

  	// Generate imports
  	sortedImports.forEach(({ path, alias }) => {
    	dartFile += alias ? 
      	`import '${path}' as ${alias};\n` : 
      	`import '${path}';\n`;
  	});
  	dartFile += '\n';	
	
	// Expose default mode variables directly
	collections.forEach((collection) => {
		const name = toCamelCase(collection.name);
		dartFile += `const ${name} = default_mode.${toPascalCase(collection.name)}();\n`;
	});
	dartFile += '\n';
	
	// Create typed wrapper class
	dartFile += '// Create typed wrapper for other modes\n';
	dartFile += 'class ModeWrapper<';
	collections.forEach((collection, index) => {
		const name = toPascalCase(collection.name);
		dartFile += `${name} extends I${name}${index === collections.length - 1 ? '>' : ', '}`;
	});
	dartFile += ' {\n';
	
	dartFile += '  const ModeWrapper({\n';
	collections.forEach((collection) => {
		const name = toCamelCase(collection.name);
		dartFile += `    required this.${name},\n`;
	});
	dartFile += '  });\n\n';
	
	collections.forEach((collection) => {
		const typeName = toPascalCase(collection.name);
		const variableName = toCamelCase(collection.name);
		dartFile += `  final ${typeName} ${variableName};\n`;
	});
	dartFile += '}\n\n';
	
	// Create instances for each mode
	uniqueModes.forEach((mode, index) => {
		const modeName = formatModeNameForFile(mode.name);
		const modeVarName = formatModeNameForVariable(mode.name) + 'Mode';
		
		dartFile += `const ${modeVarName} = ModeWrapper<\n`;
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
	dartFile += "import 'figma_variables_interface.dart';\n\n";
	
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
	let variableObject = null;
	for (let i = 0; i < figmaVariables.length; i++) {
		if (figmaVariables[i].id === variableId) {
			variableObject = figmaVariables[i];
			break;
		}
	}
	
	if (!variableObject) {
		return { valueContent: '0', valueType: 'primitive' };
	}
	
	const value = variableObject.valuesByMode[modeId];
	
	if (!value) {
		// If there's no value for this mode, use the default mode value
		const collections = figma.variables.getLocalVariableCollections();
		let defaultModeId = null;
		for (let i = 0; i < collections.length; i++) {
			if (collections[i].id === variableObject.variableCollectionId) {
				defaultModeId = collections[i].defaultModeId;
				break;
			}
		}
			
		if (defaultModeId) {
			const defaultValue = variableObject.valuesByMode[defaultModeId];
			if (defaultValue) {
				if (isVariableAlias(defaultValue)) {
					let aliasVariable = null;
					for (let i = 0; i < figmaVariables.length; i++) {
						if (figmaVariables[i].id === defaultValue.id) {
							aliasVariable = figmaVariables[i];
							break;
						}
					}
					if (aliasVariable) {
						return {
							valueContent: generateDartKeyString(aliasVariable),
							valueType: 'alias',
						};
					} else {
						// Handle case where alias variable is not found in default mode
						console.warn(`Default mode variable alias not found for ID: ${defaultValue.id}. Using fallback value.`);
						
						// Log the missing alias error
						const fallbackValue = variableObject.resolvedType === 'COLOR' ? 'Color(0xFF000000)' : 
							variableObject.resolvedType === 'FLOAT' ? '0.0' : 
							variableObject.resolvedType === 'STRING' ? "'missing-alias'" : 
							variableObject.resolvedType === 'BOOLEAN' ? 'false' : '0';
						errorLogger.logMissingAlias(variable.name, defaultValue.id, fallbackValue);
						
						// Provide type-appropriate fallback based on the variable's resolved type
						switch (variableObject.resolvedType) {
							case 'COLOR':
								return {
									valueContent: 'Color(0xFF000000)', // Black fallback
									valueType: 'color',
								};
							case 'FLOAT':
								return {
									valueContent: '0.0',
									valueType: 'primitive',
								};
							case 'STRING':
								return {
									valueContent: "'missing-alias'",
									valueType: 'primitive',
								};
							case 'BOOLEAN':
								return {
									valueContent: 'false',
									valueType: 'primitive',
								};
							default:
								return {
									valueContent: '0',
									valueType: 'primitive',
								};
						}
					}
				} else if (variableObject.resolvedType === 'COLOR') {
					return {
						valueContent: rgbaObjectToDartHexaString(defaultValue as RGBA),
						valueType: 'color',
					};
				}
				// For primitive values, ensure STRING types are quoted
				if (variableObject.resolvedType === 'STRING') {
					return {
						valueContent: typeof defaultValue === 'string' ? `'${defaultValue}'` : `'${String(defaultValue)}'`,
						valueType: 'primitive',
					};
				}
				
				return {
					valueContent: typeof defaultValue === 'number' ? 
						defaultValue.toString() : 
						String(defaultValue),
					valueType: 'primitive',
				};
			}
		}
		// If no value is found in default mode, return 0
		return { valueContent: '0', valueType: 'primitive' };
	}
	
	if (isVariableAlias(value)) {
		let aliasVariable = null;
		for (let i = 0; i < figmaVariables.length; i++) {
			if (figmaVariables[i].id === value.id) {
				aliasVariable = figmaVariables[i];
				break;
			}
		}
		if (aliasVariable) {
			return {
				valueContent: generateDartKeyString(aliasVariable),
				valueType: 'alias',
			};
		} else {
			// Handle case where alias variable is not found
			console.warn(`Variable alias not found for ID: ${value.id}. Using fallback value.`);
			
			// Log the missing alias error
			const fallbackValue = variableObject.resolvedType === 'COLOR' ? 'Color(0xFF000000)' : 
				variableObject.resolvedType === 'FLOAT' ? '0.0' : 
				variableObject.resolvedType === 'STRING' ? "'missing-alias'" : 
				variableObject.resolvedType === 'BOOLEAN' ? 'false' : '0';
			errorLogger.logMissingAlias(variable.name, value.id, fallbackValue);
			
			// Provide type-appropriate fallback based on the variable's resolved type
			switch (variableObject.resolvedType) {
				case 'COLOR':
					return {
						valueContent: 'Color(0xFF000000)', // Black fallback
						valueType: 'color',
					};
				case 'FLOAT':
					return {
						valueContent: '0.0',
						valueType: 'primitive',
					};
				case 'STRING':
					return {
						valueContent: "'missing-alias'",
						valueType: 'primitive',
					};
				case 'BOOLEAN':
					return {
						valueContent: 'false',
						valueType: 'primitive',
					};
				default:
					return {
						valueContent: '0',
						valueType: 'primitive',
					};
			}
		}
	} else if (variableObject.resolvedType === 'COLOR') {
		return {
			valueContent: rgbaObjectToDartHexaString(value as RGBA),
			valueType: 'color',
		};
	}
	
	// For primitive values, convert number to string directly
	if (variableObject.resolvedType === 'STRING') {
		return {
			valueContent: typeof value === 'string' ? `'${value}'` : `'${String(value)}'`,
			valueType: 'primitive',
		};
	}
	
	return {
		valueContent: typeof value === 'number' ? 
			value.toString() : 
			String(value),
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
	const collections = figma.variables.getLocalVariableCollections();
	let collection = null;
	for (let i = 0; i < collections.length; i++) {
		if (collections[i].id === variable.variableCollectionId) {
			collection = collections[i];
			break;
		}
	}
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

	// Se for um alias, precisamos pegar o tipo da variável original
	let resolvedType = variableObject.resolvedType;
	if (valueType === 'alias') {
		const modeValue = variableObject.valuesByMode[modeId];
		if (isVariableAlias(modeValue)) {
			const originalVariable = figmaVariables.find(v => v.id === modeValue.id);
			if (originalVariable) {
				resolvedType = originalVariable.resolvedType;
			}
		}
	}

	let doubleKeyPlusSpace = '';
	let value = valueContent;
	if (resolvedType === 'STRING') {
		// Ensure string values are properly quoted
		if (valueContent.charAt(0) !== "'" && valueContent.charAt(0) !== '"') {
			value = `'${valueContent}'`;
		} else {
			value = toSingleQuotes(valueContent);
		}
	} else if (resolvedType === 'FLOAT') {
		doubleKeyPlusSpace = 'double ';
	}

	let dartCode = '\n';
	dartCode += `  static const ${doubleKeyPlusSpace}_${dartKey} = ${value};\n`;
	dartCode += `  @override\n`;
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
	const collectionName = toPascalCase(collection.name);
	const interfaceName = `I${collectionName}`;
	
	// Start creating the Dart class
	let dartCode = `\nfinal class ${collectionName} implements ${interfaceName} {\n`;
	dartCode += `  const ${collectionName}();\n`;
	
	// Group variables
	const groupedVariables = variables.reduce(
		(acc: Record<string, Variable[]>, variable: Variable) => {
			const parts = variable.name.split('/');
			const groupName = parts.length > 1 ? toCamelCase(parts.slice(0, -1).join('_')) : '';
			const variableName = toCamelCase(parts[parts.length - 1]);
			
			if (!groupName) {
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
	
	// Generate root level variables
	if (groupedVariables['__root__']) {
		groupedVariables['__root__'].forEach((variable) => {
			dartCode += generateDartCodeForVariable(variable, figmaVariables, modeId);
		});
	}
	
	// Generate group getters
	Object.keys(groupedVariables).forEach(groupName => {
		if (groupName !== '__root__') {
			const groupInterfaceName = `I${collectionName}${toPascalCase(groupName)}`;
			dartCode += `\n  static const _${groupName} = ${collectionName}${toPascalCase(groupName)}();\n`;
			dartCode += `  @override\n`;
			dartCode += `  ${groupInterfaceName} get ${groupName} => _${groupName};\n`;
		}
	});
	
	dartCode += '}\n';
	
	// Generate group classes
	Object.keys(groupedVariables).forEach(groupName => {
		if (groupName !== '__root__') {
			const groupClassName = `${collectionName}${toPascalCase(groupName)}`;
			const groupInterfaceName = `I${groupClassName}`;
			
			dartCode += `\nfinal class ${groupClassName} implements ${groupInterfaceName} {\n`;
			dartCode += `  const ${groupClassName}();\n`;
			
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
	switch (variableType) {
		case 'BOOLEAN': return 'bool';
		case 'COLOR': return 'Color';
		case 'FLOAT': return 'double';
		case 'STRING': return 'String';
		default:
			throw new Error('Unknown variable type');
	}
}

function isVariableAlias(value: any): value is VariableAlias {
	return (
		value && value.type === 'VARIABLE_ALIAS' && typeof value.id === 'string'
	);
}

/**
 * Generates the variables interface file `figma_variables_interface.dart`.
 * @returns The generated interface file as a string.
 */
export function generateVariablesInterfaceFile(): string {
	let dartFile = generateHeaderComment();
	dartFile += "import 'dart:ui';\n\n";
	
	// Get all collections and their variables
	const collections = figma.variables.getLocalVariableCollections();
	const variables = figma.variables.getLocalVariables();
	
	// Generate interfaces for each collection
	collections.forEach(collection => {
		const collectionVariables = variables.filter(
			variable => variable.variableCollectionId === collection.id
		);
		
		if (collectionVariables.length > 0) {
			dartFile += generateInterfacesForCollection(collection, collectionVariables);
		}
	});
	
	return dartFile;
}

/**
 * Generates interfaces for a collection and its variable groups
 */
function generateInterfacesForCollection(
	collection: VariableCollection,
	variables: Variable[]
): string {
	let interfaceCode = '';
	const collectionName = toPascalCase(collection.name);
	
	// Group variables by their group path
	const groupedVariables = variables.reduce((groups: Record<string, Variable[]>, variable: Variable) => {
		const parts = variable.name.split('/');
		const groupName = parts.slice(0, -1).join('_') || '__root__';
		if (!groups[groupName]) {
			groups[groupName] = [];
		}
		groups[groupName].push(variable);
		return groups;
	}, {});
	
	// Generate main collection interface
	interfaceCode += `abstract interface class I${collectionName} {\n`;
	Object.keys(groupedVariables).forEach(groupName => {
		if (groupName === '__root__') {
			// Add root level variables directly to collection interface
			groupedVariables[groupName].forEach(variable => {
				const variableName = variable.name.split('/').pop();
				if (variableName) {
					const propertyName = toCamelCase(variableName);
					interfaceCode += `  ${getDartType(variable.resolvedType)} get ${propertyName};\n`;
				}
			});
		} else {
			// Add group getter to collection interface
			const groupInterfaceName = `I${collectionName}${toPascalCase(groupName)}`;
			const groupPropertyName = toCamelCase(groupName);
			interfaceCode += `  ${groupInterfaceName} get ${groupPropertyName};\n`;
		}
	});
	interfaceCode += '}\n\n';
	
	// Generate interfaces for each group
	Object.keys(groupedVariables).forEach(groupName => {
		if (groupName !== '__root__') {
			const groupInterfaceName = `I${collectionName}${toPascalCase(groupName)}`;
			interfaceCode += `abstract interface class ${groupInterfaceName} {\n`;
			
			groupedVariables[groupName].forEach(variable => {
				const variableName = variable.name.split('/').pop();
				if (variableName) {
					const propertyName = toCamelCase(variableName);
					interfaceCode += `  ${getDartType(variable.resolvedType)} get ${propertyName};\n`;
				}
			});
			
			interfaceCode += '}\n\n';
		}
	});
	
	return interfaceCode;
}

