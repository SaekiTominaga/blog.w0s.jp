import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

/**
 * カテゴリー
 */

interface Param {
	categoryName: string;
}

export const param = validator('param', (value): Param => {
	const { categoryName } = value;

	if (categoryName === undefined) {
		throw new HTTPException(400, { message: 'The `categoryName` parameter is required' });
	}

	return {
		categoryName,
	};
});
