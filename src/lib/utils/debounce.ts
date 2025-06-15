/**
 * Creates a debounced function that delays invoking the provided function
 * until after wait milliseconds have elapsed since the last time the debounced
 * function was invoked.
 *
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @returns The debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout>;

	return (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

/**
 * Creates a debounced function that also cancels the debounced execution
 *
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @returns Object with the debounced function and a cancel method
 */
export function debounceWithCancel<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): {
	debounced: (...args: Parameters<T>) => void;
	cancel: () => void;
} {
	let timeout: ReturnType<typeof setTimeout>;

	const debounced = (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};

	const cancel = () => {
		clearTimeout(timeout);
	};

	return { debounced, cancel };
}
