import { defineOperationApp } from '@directus/extensions-sdk';

export default defineOperationApp({
	id: 'call_vonage_api',
	name: 'Call Vonage API',
	icon: 'box',
	description: 'Calls a vonage json api',
	overview: ({ endpoint, queryString }) => [
		{
			label: 'Vonage api path, excluding the base url',
			text: endpoint,
		},
		{
			label: 'URL query string',
			text: queryString,
		},
	],
	options: [
		{
			field: 'endpoint',
			name: 'Vonage api path',
			type: 'string',
			meta: {
				width: 'full',
				interface: 'input',
			},
		},
		{
			field: 'queryString',
			name: 'URL query string',
			type: 'string',
			meta: {
				width: 'full',
				interface: 'input',
			},
		}
	],
});
