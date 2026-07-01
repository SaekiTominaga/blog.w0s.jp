import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

/**
 * 検索
 */

export type Engine = 'google' | 'bing' | 'yahoo' | 'ddg';

interface RequestQuery {
	engine: Engine;
	q: string;
}

export const param = validator('query', (value): RequestQuery => {
	const { engine, q } = value;

	if (engine === undefined) {
		throw new HTTPException(400, { message: 'The `engine` parameter is required' });
	}
	if (typeof engine !== 'string' || !['google', 'bing', 'yahoo', 'ddg'].includes(engine)) {
		throw new HTTPException(400, { message: 'The `engine` parameter is invalid' });
	}

	if (q === undefined) {
		throw new HTTPException(400, { message: 'The `q` parameter is required' });
	}
	if (typeof q !== 'string') {
		throw new HTTPException(400, { message: 'The `q` parameter is invalid' });
	}

	return {
		engine: engine as Engine,
		q: q,
	};
});
