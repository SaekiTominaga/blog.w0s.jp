import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { after, before, test } from 'node:test';
import sharp from 'sharp';
import { createThumbnailImage, cleanThumbnailImages } from './media.ts';

const tempBaseDirNamePrefix = '.temp-base-';
const tempThumbDirNamePrefix = '.temp-thumb-';
const test1FileName = 'test1.jpg';
const test2FileName = 'test2.jpg';

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

		await image.toFile(`${tempBaseDir}/${test1FileName}`);
	});

	after(async () => {
		await Promise.all([fs.promises.rm(tempBaseDir, { recursive: true }), fs.promises.rm(tempThumbDir, { recursive: true })]);
	});

	await t.test('正常系', async () => {
		const baseFile = await fs.promises.readFile(`${tempBaseDir}/${test1FileName}`);

		const thumbFileNames = await createThumbnailImage({ buffer: baseFile, fileName: test1FileName }, tempThumbDir);

		assert.equal(thumbFileNames.length, 4);
	});
});

await test('cleanThumbnailImages', async (t) => {
	let tempBaseDir: string;
	let tempThumbDir: string;
	before(async () => {
		[tempBaseDir, tempThumbDir] = await Promise.all([fs.promises.mkdtemp(tempBaseDirNamePrefix), fs.promises.mkdtemp(tempThumbDirNamePrefix)]);

		const image1 = sharp({
			text: {
				text: 'Hello, world!',
				width: 1920,
				height: 1280,
			},
		}).jpeg({ quality: 1 });

		const image2 = sharp({
			text: {
				text: 'Hello, world!',
				width: 120,
				height: 120,
			},
		}).jpeg({ quality: 1 });

		await Promise.all([image1.toFile(`${tempBaseDir}/${test1FileName}`), image2.toFile(`${tempBaseDir}/${test2FileName}`)]);
	});

	after(async () => {
		await Promise.all([fs.promises.rm(tempBaseDir, { recursive: true }), fs.promises.rm(tempThumbDir, { recursive: true })]);
	});

	await t.test('正常系', async () => {
		const thumbFileNames = await cleanThumbnailImages(tempBaseDir, tempThumbDir);

		assert.equal(thumbFileNames.length, 2);
		assert.equal(
			thumbFileNames.reduce((acc, cur) => acc + cur.length, 0),
			8,
		);
	});
});
