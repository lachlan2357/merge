/** How fast zooming in/out should be. */
export const zoomIncrement = 40;

/**
 * Function signature for any constructor.
 *
 * @template T The object class this constructor returns.
 */
export type Constructor<T> = new (...data: never[]) => T;
