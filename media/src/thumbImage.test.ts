import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { after, before, test } from 'node:test';
import sharp from 'sharp';
import { create } from './thumbImage.ts';

const tempBaseDirNamePrefix = '.temp-base-';
const tempThumbDirNamePrefix = '.temp-thumb-';
const baseFileName = 'test1.jpg';

await test('create', async (t) => {
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

		await image.toFile(`${tempBaseDir}/${baseFileName}`);
	});

	after(async () => {
		const tempDirectories = [tempBaseDir, tempThumbDir];
		await Promise.all(tempDirectories.map((dir) => fs.promises.rm(dir, { recursive: true })));
	});

	await t.test('正常系', async () => {
		const baseFile = await fs.promises.readFile(`${tempBaseDir}/${baseFileName}`);

		const createdFileInfos = await create(
			{
				buffer: baseFile,
				fileName: baseFileName,
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

		assert.equal(createdFileInfos.length, 4);
		assert.equal(createdFileInfos.at(0)?.name, 'test1.jpg@d=200x100;q=20.avif');
		assert.match(createdFileInfos.at(0)!.size.toString(), /^[1-9][0-9]*$/u);
		assert.equal(createdFileInfos.at(1)?.name, 'test1.jpg@d=400x200;q=10.avif');
		assert.match(createdFileInfos.at(1)!.size.toString(), /^[1-9][0-9]*$/u);
		assert.equal(createdFileInfos.at(2)?.name, 'test1.jpg@d=100x200;q=20.avif');
		assert.match(createdFileInfos.at(2)!.size.toString(), /^[1-9][0-9]*$/u);
		assert.equal(createdFileInfos.at(3)?.name, 'test1.jpg@d=200x400;q=10.avif');
		assert.match(createdFileInfos.at(3)!.size.toString(), /^[1-9][0-9]*$/u);

		const createdFiles = await fs.promises.readdir(tempThumbDir, { recursive: true });

		assert.deepEqual(createdFiles, [
			'test1.jpg@d=100x200;q=20.avif',
			'test1.jpg@d=200x100;q=20.avif',
			'test1.jpg@d=200x400;q=10.avif',
			'test1.jpg@d=400x200;q=10.avif',
		]);
	});
});
