/**
 * Converts an RGBA object to a Dart hexadecimal color string.
 * @param obj - The RGBA object.
 * @returns The Dart hexadecimal color string.
 */
export function rgbaObjectToDartHexaString(obj: {
	r: number;
	g: number;
	b: number;
	a: number;
}): string {
	const { r, g, b, a } = obj;
	const rgbaString = rgba2hex(
		`rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(
			b * 255
		)}, ${a})`
	);
	return `Color(0x${rgbaString.substring(7)}${rgbaString.substring(1, 7)})`;
}

/**
 * Converts an RGBA color string to a hexadecimal color string.
 * @param orig - The RGBA color string.
 * @returns The hexadecimal color string.
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
