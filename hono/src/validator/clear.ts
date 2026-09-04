import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

/**
 * キャッシュクリア
 */

type Response = 'json' | 'text';

interface RequestBody {
	response: Response | undefined;
}

export const form = validator('form', (value): RequestBody => {
	const { response } = value;

	if (response !== undefined) {
		if (Array.isArray(response)) {
			throw new HTTPException(400, { message: 'The `response` parameter can only be singular' });
		}
		if (typeof response === 'object' || !['json', 'text'].includes(response)) {
			throw new HTTPException(400, { message: 'The `response` parameter is invalid' });
		}
	}

	return {
		response: response as Response | undefined,
	};
});
