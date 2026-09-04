import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { after, before, test } from 'node:test';
import sharp from 'sharp';
import { create } from './thumbImage.ts';

const tempBaseDirNamePrefix = '.temp-base-';
const tempThumbDirNamePrefix = '.temp-thumb-';
const testFileName = 'test1.jpg';

await test('createThumbnailImage', async (t) => {
	let tempBaseDir: string;
	let tempThumbDir: string;
	before(async () => {
		[tempBaseDir, tempThumbDir] = await Promise.all([fs.promises.mkdtemp(tempBaseDirNamePrefix), fs.promises.mkdtemp(tempThumbDirNamePrefix)]);

		const image = sharp({
			text: {
				text: 'Hello, world!',
				width: 1920,
				height: 1280,
			},
		}).jpeg({ quality: 1 });

		await image.toFile(`${tempBaseDir}/${testFileName}`);
	});

	after(async () => {
		await Promise.all([fs.promises.rm(tempBaseDir, { recursive: true }), fs.promises.rm(tempThumbDir, { recursive: true })]);
	});

	await t.test('正常系', async () => {
		const baseFile = await fs.promises.readFile(`${tempBaseDir}/${testFileName}`);

		const createdFiles = await create(
			{
				buffer: baseFile,
				fileName: testFileName,
			},
			{
				dir: tempThumbDir,
				dimensions: [
					{ maxWidth: 200, maxHeight: 100 },
					{ maxWidth: 100, maxHeight: 200 },
				],
				densityQualities: [
					{ density: 1, quality: 20 },
					{ density: 2, quality: 10 },
				],
			},
		);

		assert.equal(createdFiles.length, 4);
	});
});
