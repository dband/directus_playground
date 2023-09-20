import { defineOperationApi } from '@directus/extensions-sdk';
import { createError } from '@directus/errors';


type Options = {
	endpoint: string;
	queryString: string
};

interface VonageError{
	status: number;
	status_message: string;
}

const messageConstructor = (extensions: VonageError) => {
	return `Status code: ${extensions.status}. Message: ${extensions.status_message}`;
}

const options = {
	headers: new Headers({'content-type': 'application/json'}),
};

/**
 * The vonage api documentation is available here:
 * https://developer.vonage.com/en/api/number-insight?source=number-insight
 */
export default defineOperationApi<Options>({
	id: 'call_vonage_api',
	handler: async ({ endpoint, queryString }, { env }) => {
		if (!env.VONAGE_BASE_URL || !env.VONAGE_API_KEY || !env.VONAGE_API_SECRET) {
			const VonageError = createError<VonageError>('VONAGE_ERROR', messageConstructor, 500);
	
			throw new VonageError({
			  status: 4,
			  status_message: 'Api credentials missing from request. Check extension call_vonage_api.'
			});
		}

		const url = `${env.VONAGE_BASE_URL}/${endpoint}/json?${queryString}`;
		const fullUrl = `${url}&api_key=${env.VONAGE_API_KEY}&api_secret=${env.VONAGE_API_SECRET}`;

		const result = await fetch(fullUrl, options);
		const body = await result.json();

		if (body.status != 0) {
			const VonageError = createError<VonageError>('VONAGE_ERROR', messageConstructor, 500);
			throw new VonageError(body);
		}

		return body;
	},
});
