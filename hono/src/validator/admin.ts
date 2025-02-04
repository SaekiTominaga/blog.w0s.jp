import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

/**
 * 管理画面
 */

export interface RequestQuery {
	id: number | undefined;
}

export const query = validator('query', (value): RequestQuery => {
	const { id } = value;

	if (Array.isArray(id)) {
		throw new HTTPException(400, { message: 'The `id` parameter can only be singular' });
	}

	return {
		id: id !== undefined ? Number(id) : undefined,
	};
});
