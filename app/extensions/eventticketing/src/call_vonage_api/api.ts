import { defineOperationApi } from '@directus/extensions-sdk';
import { createError } from '@directus/errors';


type Options = {
	endpoint: string;
	queryString: string
};

// https://developer.vonage.com/en/api/number-insight?source=number-insight

export default defineOperationApi<Options>({
	id: 'call_vonage_api',
	handler: async ({ endpoint, queryString }, { env, logger }) => {
		if (!env.VONAGE_BASE_URL || !env.VONAGE_API_KEY || !env.VONAGE_API_SECRET) {
			const InvalidCredentialsError = createError('INVALID_CREDENTIALS', "Missing Vonage API credentials", 500);
			throw new InvalidCredentialsError();
		}

		const fullUrl = `${env.VONAGE_BASE_URL}/${endpoint}/json?api_key=${env.VONAGE_API_KEY}&api_secret=${env.VONAGE_API_SECRET}&${queryString}`;

		const result = await fetch(fullUrl);
		return await result.json();
	},
});
