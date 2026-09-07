import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { test } from 'node:test';
import { env } from '@w0s/env-value-type';
import { clear } from './clear.ts';

const countCacheFile = async (dir = `${env('ROOT')}/${env('HTML_DIR')}`): Promise<number> => {
	const entries = await fs.promises.readdir(dir, { withFileTypes: true });

	const counts = await Promise.all(
		entries.map(async (entry): Promise<number> => {
			const targetPath = `${dir}/${entry.name}`;

			if (entry.isDirectory()) {
				return countCacheFile(targetPath);
			} else if (entry.isFile()) {
				return 1;
			}

			return 0;
		}),
	);

	return counts.reduce((sum, c) => sum + c, 0);
};

await test('clear', async () => {
	const cacheFileLengthBefore = await countCacheFile();

	const removeFles = await clear();

	assert.equal(removeFles.length, cacheFileLengthBefore);

	const cacheFileLengthAfter = await countCacheFile();

	assert.equal(cacheFileLengthAfter, 0);
});
