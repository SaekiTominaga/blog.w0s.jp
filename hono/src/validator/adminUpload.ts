import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

/**
 * メディアアップロード
 */

export interface RequestForm {
	files: File[];
	overwrite: boolean;
}

export const form = validator('form', (value): RequestForm => {
	const { media, overwrite } = value;

	const files: File[] = [];
	if (media === undefined) {
		throw new HTTPException(400, { message: 'The `media` parameter is required' });
	}
	if (!Array.isArray(media)) {
		if (typeof media !== 'object') {
			throw new HTTPException(400, { message: 'The `media` parameter is invalid' });
		}

		files.push(media);
	} else {
		if (!media.every((m) => typeof m === 'object')) {
			throw new HTTPException(400, { message: 'The `media` parameter is invalid' });
		}

		files.push(...media);
	}
	/* 	if (medias.some((media1) => !media1.type.startsWith('image/') && !media1.type.startsWith('video/'))) {
		throw new HTTPException(400, { message: 'The `media` parameter is required' });
	} */

	if (Array.isArray(overwrite)) {
		throw new HTTPException(400, { message: 'The `overwrite` parameter can only be singular' });
	}
	if (typeof overwrite === 'object') {
		throw new HTTPException(400, { message: 'The `overwrite` parameter is invalid' });
	}

	return {
		files,
		overwrite: Boolean(overwrite),
	};
});
