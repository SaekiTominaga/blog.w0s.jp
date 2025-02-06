import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

/**
 * 記事リスト
 */

interface Param {
	page: number;
}

export const param = validator('param', (value): Param => {
	const { page } = value;

	if (page === undefined) {
		throw new HTTPException(400, { message: 'The `page` parameter is required' });
	}

	return {
		page: Number(page),
	};
});
