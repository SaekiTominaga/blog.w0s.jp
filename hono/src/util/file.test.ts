import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { after, before, test } from 'node:test';
import { clearFiles, getFileNames } from './file.ts';

const tempDirNamePrefix = '.temp-';

await test('getFileNames', async (t) => {
	let tempDir: string;
	before(async () => {
		tempDir = await fs.promises.mkdtemp(tempDirNamePrefix);

		await Promise.all([
			fs.promises.writeFile(`${tempDir}/foo.txt`, ''),
			fs.promises.writeFile(`${tempDir}/bar.log`, ''),
			fs.promises.writeFile(`${tempDir}/baz.txt`, ''),
		]);
	});
	after(async () => {
		await fs.promises.rm(tempDir, { recursive: true });
	});

	await t.test('全ファイル', async () => {
		assert.equal((await getFileNames(tempDir)).length, 3);
	});

	await t.test('拡張子絞り込み', async () => {
		assert.equal((await getFileNames(tempDir, ['.txt'])).length, 2);
	});
});

await test('clearFiles', async (t) => {
	let tempDir: string;
	before(async () => {
		tempDir = await fs.promises.mkdtemp(tempDirNamePrefix);

		await Promise.all([fs.promises.writeFile(`${tempDir}/foo.txt`, ''), fs.promises.writeFile(`${tempDir}/bar.log`, '')]);
	});
	after(async () => {
		await fs.promises.rm(tempDir, { recursive: true });
	});

	await t.test('全ファイル', async () => {
		assert.equal((await fs.promises.readdir(tempDir)).length, 2);

		const deleted = await clearFiles(tempDir);

		assert.equal(deleted.length, 2);
		assert.equal((await fs.promises.readdir(tempDir)).length, 0);
	});
});
