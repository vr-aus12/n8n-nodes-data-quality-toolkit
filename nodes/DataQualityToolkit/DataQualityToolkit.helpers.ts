export type DataValue = string | number | boolean | null | undefined | DataObject | DataValue[];
export type DataObject = { [key: string]: DataValue };

export type FieldRule = {
	fieldName: string;
	type?: 'any' | 'string' | 'number' | 'boolean' | 'email' | 'url' | 'date' | 'phone';
	required?: boolean;
	allowEmpty?: boolean;
};

export type CompareResult = {
	field: string;
	before: DataValue;
	after: DataValue;
};

export function isObject(value: unknown): value is DataObject {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isEmpty(value: unknown): boolean {
	return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

export function getPath(source: DataObject, path: string): DataValue {
	if (!path) return source;
	return path.split('.').reduce<DataValue>((current, part) => {
		if (isObject(current) && Object.prototype.hasOwnProperty.call(current, part)) {
			return current[part];
		}
		return undefined;
	}, source);
}

export function setPath(target: DataObject, path: string, value: DataValue): void {
	const parts = path.split('.').filter(Boolean);
	if (parts.length === 0) return;
	let cursor = target;
	for (let index = 0; index < parts.length - 1; index++) {
		const part = parts[index];
		if (!isObject(cursor[part])) cursor[part] = {};
		cursor = cursor[part] as DataObject;
	}
	cursor[parts[parts.length - 1]] = value;
}

export function cloneValue<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

export function validateType(value: unknown, type: FieldRule['type']): boolean {
	if (!type || type === 'any') return true;
	if (type === 'string') return typeof value === 'string';
	if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
	if (type === 'boolean') return typeof value === 'boolean';
	if (type === 'date') return typeof value === 'string' && !Number.isNaN(Date.parse(value));
	if (type === 'email') return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
	if (type === 'url') {
		if (typeof value !== 'string') return false;
		try {
			const url = new URL(value);
			return url.protocol === 'http:' || url.protocol === 'https:';
		} catch {
			return false;
		}
	}
	if (type === 'phone') return typeof value === 'string' && /^[+()\d\s.-]{7,}$/.test(value);
	return true;
}

export function cleanValue(value: DataValue, options: { trimStrings: boolean; collapseWhitespace: boolean; removeEmptyFields: boolean }): DataValue {
	if (typeof value === 'string') {
		let output = value;
		if (options.trimStrings) output = output.trim();
		if (options.collapseWhitespace) output = output.replace(/\s+/g, ' ');
		return output;
	}
	if (Array.isArray(value)) {
		return value
			.map((entry) => cleanValue(entry, options))
			.filter((entry) => !(options.removeEmptyFields && isEmpty(entry)));
	}
	if (isObject(value)) {
		const output: DataObject = {};
		for (const [key, entry] of Object.entries(value)) {
			const cleaned = cleanValue(entry, options);
			if (options.removeEmptyFields && isEmpty(cleaned)) continue;
			output[key] = cleaned;
		}
		return output;
	}
	return value;
}

export function flattenObject(value: DataObject, prefix = ''): DataObject {
	const output: DataObject = {};
	for (const [key, entry] of Object.entries(value)) {
		const nextKey = prefix ? `${prefix}.${key}` : key;
		if (isObject(entry)) {
			Object.assign(output, flattenObject(entry, nextKey));
		} else {
			output[nextKey] = entry;
		}
	}
	return output;
}

export function compareObjects(before: DataObject, after: DataObject): CompareResult[] {
	const left = flattenObject(before);
	const right = flattenObject(after);
	const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort();
	const changes: CompareResult[] = [];
	for (const key of keys) {
		const beforeValue = left[key];
		const afterValue = right[key];
		if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
			changes.push({ field: key, before: beforeValue, after: afterValue });
		}
	}
	return changes;
}
