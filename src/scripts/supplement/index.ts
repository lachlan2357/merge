// global values
export const zoomIncrement = 40;

export function nullish(value: unknown): value is null | undefined {
	return value === null || value === undefined;
}
