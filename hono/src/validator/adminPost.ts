import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';

/**
 * 記事投稿
 */

export interface RequestForm {
	id: number | undefined;
	title: string;
	description: string | undefined;
	message: string;
	categories: string[] | undefined;
	imagePath: string | URL | undefined;
	relationIds: string[] | undefined;
	public: boolean;
	social: boolean;
	socialTags: string[] | undefined;
	timestampUpdate: boolean;
}

export const form = validator('form', (value): RequestForm => {
	const { id, title, description, message, category, image: imagePath, relation, public: pub, social, social_tag: socialTag, timestamp } = value;

	if (Array.isArray(id)) {
		throw new HTTPException(400, { message: 'The `id` parameter can only be singular' });
	}
	if (typeof id === 'object') {
		throw new HTTPException(400, { message: 'The `id` parameter is invalid' });
	}

	if (Array.isArray(title)) {
		throw new HTTPException(400, { message: 'The `title` parameter can only be singular' });
	}
	if (typeof title === 'object') {
		throw new HTTPException(400, { message: 'The `title` parameter is invalid' });
	}
	if (title === undefined || title === '') {
		throw new HTTPException(400, { message: 'The `title` parameter is required' });
	}

	if (Array.isArray(description)) {
		throw new HTTPException(400, { message: 'The `description` parameter can only be singular' });
	}
	if (typeof description === 'object') {
		throw new HTTPException(400, { message: 'The `description` parameter is invalid' });
	}

	if (Array.isArray(message)) {
		throw new HTTPException(400, { message: 'The `message` parameter can only be singular' });
	}
	if (typeof message === 'object') {
		throw new HTTPException(400, { message: 'The `message` parameter is invalid' });
	}
	if (message === undefined || message === '') {
		throw new HTTPException(400, { message: 'The `message` parameter is required' });
	}

	let categories: string[] | undefined;
	if (category !== undefined) {
		if (!Array.isArray(category)) {
			if (typeof category === 'object') {
				throw new HTTPException(400, { message: 'The `category` parameter is invalid' });
			}

			categories = [category];
		} else {
			if (!category.every((cat) => typeof cat !== 'object')) {
				throw new HTTPException(400, { message: 'The `category` parameter is invalid' });
			}

			categories = category;
		}
	}

	if (Array.isArray(imagePath)) {
		throw new HTTPException(400, { message: 'The `image` parameter can only be singular' });
	}
	if (typeof imagePath === 'object') {
		throw new HTTPException(400, { message: 'The `image` parameter is invalid' });
	}

	if (Array.isArray(relation)) {
		throw new HTTPException(400, { message: 'The `relation` parameter can only be singular' });
	}
	if (typeof relation === 'object') {
		throw new HTTPException(400, { message: 'The `relation` parameter is invalid' });
	}

	if (Array.isArray(socialTag)) {
		throw new HTTPException(400, { message: 'The `social_tag` parameter can only be singular' });
	}
	if (typeof socialTag === 'object') {
		throw new HTTPException(400, { message: 'The `social_tag` parameter is invalid' });
	}

	return {
		id: id !== undefined && id !== '' ? Number(id) : undefined,
		title,
		description: description !== '' ? description : undefined,
		message,
		categories,
		imagePath: imagePath !== undefined ? (URL.parse(imagePath) ?? imagePath) : undefined,
		relationIds: relation?.split(','),
		public: Boolean(pub),
		social: Boolean(social),
		socialTags: socialTag?.split(','),
		timestampUpdate: Boolean(timestamp),
	};
});
