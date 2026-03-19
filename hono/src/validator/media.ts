import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

/**
 * メディア登録
 */

interface RequestBody {
	files: File[];
	overwrite: boolean;
}

export const form = validator('form', (value): RequestBody => {
	const { files, overwrite } = value;

	if (files === undefined) {
		throw new HTTPException(400, { message: 'The `files` parameter is required' });
	}
	if (!Array.isArray(files)) {
		if (typeof files !== 'object') {
			throw new HTTPException(400, { message: 'The `files` parameter is invalid' });
		}
	} else {
		if (!files.every((file) => typeof file === 'object')) {
			throw new HTTPException(400, { message: 'The `files` parameter is invalid' });
		}
	}

	if (Array.isArray(overwrite)) {
		throw new HTTPException(400, { message: 'The `overwrite` parameter can only be singular' });
	}
	if (typeof overwrite === 'object') {
		throw new HTTPException(400, { message: 'The `overwrite` parameter is invalid' });
	}

	return {
		files: Array.isArray(files) ? files : [files],
		overwrite: Boolean(overwrite),
	};
});
