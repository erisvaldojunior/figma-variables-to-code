
/**
 * Gets unique modes from all collections
 */
export function getUniqueModes(collections: VariableCollection[]): { modeId: string, name: string }[] {
	const modesMap = new Map<string, { modeId: string, name: string }>();
	
	collections.forEach(collection => {
		collection.modes.forEach(mode => {
			if (mode.modeId !== collection.defaultModeId) {
				modesMap.set(mode.modeId, { modeId: mode.modeId, name: mode.name });
			}
		});
	});
	
	return Array.from(modesMap.values());
}