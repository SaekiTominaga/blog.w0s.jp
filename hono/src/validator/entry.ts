import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

/**
 * 記事
 */

interface Param {
	entryId: number;
}

export const param = validator('param', (value): Param => {
	const { entryId } = value;

	if (entryId === undefined) {
		throw new HTTPException(400, { message: 'The `entryId` parameter is required' });
	}

	return {
		entryId: Number(entryId),
	};
});
