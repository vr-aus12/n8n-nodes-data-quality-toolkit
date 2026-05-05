import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

import {
	cleanValue,
	cloneValue,
	compareObjects,
	DataObject,
	DataValue,
	FieldRule,
	getPath,
	isEmpty,
	isObject,
	setPath,
	validateType,
} from './DataQualityToolkit.helpers';
export class DataQualityToolkit implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Data Quality Toolkit',
		name: 'dataQualityToolkit',
		icon: 'file:dataQualityToolkit.svg',
		group: ['transform'],
		version: 1,
		description: 'Validate, clean, compare, and score workflow data without runtime dependencies',
		defaults: {
			name: 'Data Quality Toolkit',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'validateFields',
				options: [
					{ name: 'Validate Fields', value: 'validateFields', description: 'Validate required fields and basic data types', action: 'Validate fields' },
					{ name: 'Clean Object', value: 'cleanObject', description: 'Trim strings, collapse whitespace, and remove empty fields', action: 'Clean object' },
					{ name: 'Find Missing Values', value: 'findMissingValues', description: 'Return required fields that are missing or empty', action: 'Find missing values' },
					{ name: 'Compare Records', value: 'compareRecords', description: 'Compare two objects and return changed fields', action: 'Compare records' },
					{ name: 'Generate Quality Report', value: 'qualityReport', description: 'Validate fields and return a simple data quality score', action: 'Generate quality report' },
				],
			},
			{
				displayName: 'Fields to Validate',
				name: 'fieldRules',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				displayOptions: { show: { operation: ['validateFields', 'qualityReport'] } },
				default: {},
				placeholder: 'Add Field Rule',
				options: [
					{
						name: 'rules',
						displayName: 'Rules',
						values: [
							{ displayName: 'Field Name', name: 'fieldName', type: 'string', default: '', required: true, description: 'Dot path, for example customer.email' },
							{ displayName: 'Required', name: 'required', type: 'boolean', default: true },
							{ displayName: 'Allow Empty String', name: 'allowEmpty', type: 'boolean', default: false },
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								default: 'any',
								options: [
									{ name: 'Any', value: 'any' },
									{ name: 'String', value: 'string' },
									{ name: 'Number', value: 'number' },
									{ name: 'Boolean', value: 'boolean' },
									{ name: 'Email', value: 'email' },
									{ name: 'URL', value: 'url' },
									{ name: 'Date', value: 'date' },
									{ name: 'Phone', value: 'phone' },
								],
							},
						],
					},
				],
			},
			{
				displayName: 'Required Field Names',
				name: 'requiredFields',
				type: 'string',
				displayOptions: { show: { operation: ['findMissingValues'] } },
				default: '',
				placeholder: 'customer.name, customer.email, order.id',
				description: 'Comma-separated dot paths to check',
			},
			{
				displayName: 'Before Object Path',
				name: 'beforePath',
				type: 'string',
				displayOptions: { show: { operation: ['compareRecords'] } },
				default: 'before',
				description: 'Dot path to the old/source object',
			},
			{
				displayName: 'After Object Path',
				name: 'afterPath',
				type: 'string',
				displayOptions: { show: { operation: ['compareRecords'] } },
				default: 'after',
				description: 'Dot path to the new/target object',
			},
			{
				displayName: 'Trim Strings',
				name: 'trimStrings',
				type: 'boolean',
				displayOptions: { show: { operation: ['cleanObject'] } },
				default: true,
			},
			{
				displayName: 'Collapse Whitespace',
				name: 'collapseWhitespace',
				type: 'boolean',
				displayOptions: { show: { operation: ['cleanObject'] } },
				default: true,
			},
			{
				displayName: 'Remove Empty Fields',
				name: 'removeEmptyFields',
				type: 'boolean',
				displayOptions: { show: { operation: ['cleanObject'] } },
				default: false,
			},
			{
				displayName: 'Continue On Validation Failure',
				name: 'continueOnFailure',
				type: 'boolean',
				displayOptions: { show: { operation: ['validateFields', 'qualityReport'] } },
				default: true,
				description: 'When disabled, the node throws an error if validation fails',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const operation = this.getNodeParameter('operation', itemIndex) as string;
			const itemJson = cloneValue(items[itemIndex].json) as DataObject;

			if (operation === 'cleanObject') {
				const trimStrings = this.getNodeParameter('trimStrings', itemIndex) as boolean;
				const collapseWhitespace = this.getNodeParameter('collapseWhitespace', itemIndex) as boolean;
				const removeEmptyFields = this.getNodeParameter('removeEmptyFields', itemIndex) as boolean;
				returnData.push({ json: cleanValue(itemJson, { trimStrings, collapseWhitespace, removeEmptyFields }) as DataObject, pairedItem: { item: itemIndex } });
				continue;
			}

			if (operation === 'findMissingValues') {
				const requiredFields = (this.getNodeParameter('requiredFields', itemIndex) as string)
					.split(',')
					.map((field) => field.trim())
					.filter(Boolean);
				const missingFields = requiredFields.filter((field) => isEmpty(getPath(itemJson, field)));
				returnData.push({ json: { ...itemJson, dataQuality: { valid: missingFields.length === 0, missingFields } }, pairedItem: { item: itemIndex } });
				continue;
			}

			if (operation === 'compareRecords') {
				const beforePath = this.getNodeParameter('beforePath', itemIndex) as string;
				const afterPath = this.getNodeParameter('afterPath', itemIndex) as string;
				const before = getPath(itemJson, beforePath);
				const after = getPath(itemJson, afterPath);
				if (!isObject(before) || !isObject(after)) {
					throw new NodeOperationError(this.getNode(), 'Before Object Path and After Object Path must both resolve to objects.', { itemIndex });
				}
				const changes = compareObjects(before, after);
				returnData.push({ json: { ...itemJson, dataQuality: { changed: changes.length > 0, changeCount: changes.length, changes } }, pairedItem: { item: itemIndex } });
				continue;
			}

			if (operation === 'validateFields' || operation === 'qualityReport') {
				const fieldRulesParam = this.getNodeParameter('fieldRules', itemIndex, {}) as { rules?: FieldRule[] };
				const rules = fieldRulesParam.rules ?? [];
				const continueOnFailure = this.getNodeParameter('continueOnFailure', itemIndex) as boolean;
				const errors: Array<{ field: string; message: string; expectedType?: string }> = [];

				for (const rule of rules) {
					const value = getPath(itemJson, rule.fieldName);
					if (rule.required && isEmpty(value)) {
						errors.push({ field: rule.fieldName, message: 'Required field is missing or empty', expectedType: rule.type });
						continue;
					}
					if (!rule.allowEmpty && typeof value === 'string' && value.trim() === '') {
						errors.push({ field: rule.fieldName, message: 'Empty string is not allowed', expectedType: rule.type });
						continue;
					}
					if (!isEmpty(value) && !validateType(value, rule.type)) {
						errors.push({ field: rule.fieldName, message: `Value does not match expected type: ${rule.type ?? 'any'}`, expectedType: rule.type });
					}
				}

				const valid = errors.length === 0;
				if (!valid && !continueOnFailure) {
					throw new NodeOperationError(this.getNode(), `Validation failed with ${errors.length} error(s).`, { itemIndex });
				}

				const checked = rules.length;
				const score = checked === 0 ? 100 : Math.round(((checked - errors.length) / checked) * 100);
				const dataQuality = operation === 'qualityReport'
					? { valid, score, checkedFields: checked, errorCount: errors.length, errors }
					: { valid, errors };
				const output = cloneValue(itemJson) as DataObject;
				setPath(output, 'dataQuality', dataQuality as unknown as DataValue);
				returnData.push({ json: output, pairedItem: { item: itemIndex } });
				continue;
			}

			throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, { itemIndex });
		}

		return [returnData];
	}
}
