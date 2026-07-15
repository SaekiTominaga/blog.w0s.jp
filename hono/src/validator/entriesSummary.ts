import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

/**
 * 記事概要
 */

interface Query {
	ids: number[];
}

export const query = validator('query', (value): Query => {
	const { id } = value;

	if (id === undefined) {
		throw new HTTPException(400, { message: 'The `id` parameter is required' });
	}
	const ids = Array.isArray(id) ? id : [id];

	return {
		ids: ids.map(Number),
	};
});
