import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { getDimensions, getFileName } from './thumbImage.ts';

await test('getDimensions', async (t) => {
	await t.test('オリジナル画像より幅、高さとも小さい', () => {
		const { width, height } = getDimensions({ width: 200, height: 100 }, { maxWidth: 50, maxHeight: 50 });
		assert.equal(width, 50);
		assert.equal(height, 25);
	});

	await t.test('オリジナル画像より幅のみが小さい', () => {
		const { width, height } = getDimensions({ width: 200, height: 100 }, { maxWidth: 150, maxHeight: 150 });
		assert.equal(width, 150);
		assert.equal(height, 75);
	});

	await t.test('オリジナル画像より高さのみが小さい', () => {
		const { width, height } = getDimensions({ width: 100, height: 200 }, { maxWidth: 150, maxHeight: 150 });
		assert.equal(width, 75);
		assert.equal(height, 150);
	});

	await t.test('オリジナル画像と同じ大きさ', () => {
		const { width, height } = getDimensions({ width: 200, height: 100 }, { maxWidth: 200, maxHeight: 100 });
		assert.equal(width, 200);
		assert.equal(height, 100);
	});

	await t.test('オリジナル画像より大きい', () => {
		const { width, height } = getDimensions({ width: 200, height: 100 }, { maxWidth: 201, maxHeight: 101 });
		assert.equal(width, 200);
		assert.equal(height, 100);
	});
});

await test('getFilename', async (t) => {
	await t.test('invalid width', async (t2) => {
		await t2.test('最大超過', () => {
			assert.throws(
				() => {
					getFileName('path/to.jpg', { width: 10000, height: 8, extension: '.avif' });
				},
				{ name: 'RangeError', message: 'The value of the `width` must be between 1 and 9999' },
			);
		});

		await t2.test('小数', () => {
			assert.throws(
				() => {
					getFileName('path/to.jpg', { width: 1.1, height: 8, extension: '.avif' });
				},
				{ name: 'RangeError', message: 'The value of the `width` must be an integer' },
			);
		});
	});

	await t.test('invalid height', async (t2) => {
		await t2.test('最大超過', () => {
			assert.throws(
				() => {
					getFileName('path/to.jpg', { width: 10, height: 10000, extension: '.avif' });
				},
				{ name: 'RangeError', message: 'The value of the `height` must be between 1 and 9999' },
			);
		});

		await t2.test('小数', () => {
			assert.throws(
				() => {
					getFileName('path/to.jpg', { width: 10, height: 1.1, extension: '.avif' });
				},
				{ name: 'RangeError', message: 'The value of the `height` must be an integer' },
			);
		});
	});

	await t.test('invalid density', async (t2) => {
		await t2.test('最大超過', () => {
			assert.throws(
				() => {
					getFileName('path/to.jpg', { width: 10, height: 8, density: 11, extension: '.avif' });
				},
				{ name: 'RangeError', message: 'The value of the `density` must be between 1 and 10' },
			);
		});

		await t2.test('小数', () => {
			assert.throws(
				() => {
					getFileName('path/to.jpg', { width: 10, height: 8, density: 1.1, extension: '.avif' });
				},
				{ name: 'RangeError', message: 'The value of the `density` must be an integer' },
			);
		});
	});

	await t.test('invalid quality', async (t2) => {
		await t2.test('最大超過', () => {
			assert.throws(
				() => {
					getFileName('path/to.jpg', { width: 10, height: 8, density: 2, quality: 101, extension: '.avif' });
				},
				{ name: 'RangeError', message: 'The value of the `quality` must be between 1 and 100' },
			);
		});

		await t2.test('小数', () => {
			assert.throws(
				() => {
					getFileName('path/to.jpg', { width: 10, height: 8, density: 2, quality: 1.1, extension: '.avif' });
				},
				{ name: 'RangeError', message: 'The value of the `quality` must be an integer' },
			);
		});
	});

	await t.test('invalid extension', () => {
		assert.throws(
			() => {
				getFileName('path/to.jpg', { width: 10, height: 8, density: 2, quality: 10, extension: 'avif' });
			},
			{ name: 'Error', message: 'The value of the `extension` must begin with a period' },
		);
	});

	await t.test('最小パラメーター', () => {
		assert.equal(getFileName('path/to.jpg', { width: 10, height: 8, extension: '.avif' }), 'path/to.jpg@d=10x8.avif');
	});

	await t.test('全パラメーター', () => {
		assert.equal(getFileName('path/to.jpg', { width: 10, height: 8, density: 2, quality: 10, extension: '.avif' }), 'path/to.jpg@d=20x16;q=10.avif');
	});
});
