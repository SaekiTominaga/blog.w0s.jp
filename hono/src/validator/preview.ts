import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

/**
 * 本文プレビュー
 */

interface RequestBody {
	markdown: string;
}

export const json = validator('json', (value: Record<string, unknown>): RequestBody => {
	const { md: markdown } = value;

	if (typeof markdown !== 'string') {
		throw new HTTPException(400, { message: 'The `md` parameter is invalid' });
	}

	return {
		markdown: markdown,
	};
});
