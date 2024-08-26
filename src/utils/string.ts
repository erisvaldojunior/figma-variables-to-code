/**
 * Converts a string to camelCase. Adds a prefix 'n' if the string starts with a digit.
 * @param str - The input string.
 * @returns The camelCase string.
 */
export function toCamelCase(str: string): string {
	const convertedStr = removeSpacesAndConcatenate(str)
		.replace(/[-_\s]+(.)?/g, (_, chr) => (chr ? chr.toUpperCase() : ''))
		.replace(/^\d/, (chr) => `n${chr}`);
	const camelCaseStr = convertedStr[0].toLowerCase() + convertedStr.slice(1);
	return camelCaseStr;
}

/**
 * Converts a string to PascalCase.
 * @param str - The input string.
 * @returns The PascalCase string.
 */
export function toPascalCase(str: string): string {
	// Remove underscores, hyphens, and convert the string to camelCase first
	const camelCaseString = removeSpacesAndConcatenate(str)
		.replace(/[-_]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
		.replace(/^(.)/, (char) => char.toLowerCase());
	// Convert the first character to uppercase to make it PascalCase
	return camelCaseString.charAt(0).toUpperCase() + camelCaseString.slice(1);
}

/**
 * Converts a string with double quotes to a string with single quotes, if it starts and ends with double quotes.
 * @param str - The input string to convert.
 * @returns The converted string with single quotes.
 */
export function toSingleQuotes(str: string): string {
	if (str.startsWith('"') && str.endsWith('"') && str.length > 1) {
		return `'${str.slice(1, -1)}'`;
	}
	return str;
}

/**
 * Removes all spaces from a string and concatenates the result.
 * @param str - The input string.
 * @returns The concatenated string with spaces removed.
 */
function removeSpacesAndConcatenate(str: string): string {
	return str.trim().split(/\s+/).join('');
}
