import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import messageImage from './messageImage.ts';

global.document = new JSDOM().window.document;

await test('init clear', () => {
	const { document } = new JSDOM(`
<!DOCTYPE html>
<div>
	<template id="message-preview"></template>
</div>

<div>
	<template id="select-image"></template>
	<div>
		<input type="radio" id="target" />
	</div>
</div>
`).window;

	assert.equal(document.querySelectorAll('#target').length, 1);

	const preview = document.querySelector<HTMLTemplateElement>('#message-preview')!;
	const selectImage = document.querySelector<HTMLTemplateElement>('#select-image')!;

	messageImage({
		preview: preview,
		image: selectImage,
	});

	assert.equal(document.querySelectorAll('#target').length, 0);
});

await test('message analysis', async (t) => {
	await t.test('image file', () => {
		const { document } = new JSDOM(`
<!DOCTYPE html>
<div>
	<template id="message-preview"></template>
	<div>
		<img src="https://media.w0s.jp/thumbimage/blog/foo.jpg" />
	</div>
</div>

<div>
	<template id="select-image" data-selected="">
		<input type="radio" />
		<img />
	</template>
</div>
`).window;

		const preview = document.querySelector<HTMLTemplateElement>('#message-preview')!;
		const selectImage = document.querySelector<HTMLTemplateElement>('#select-image')!;

		messageImage({
			preview: preview,
			image: selectImage,
		});

		const parent = selectImage.parentElement!;
		const radio = parent.querySelector<HTMLInputElement>('input[type=radio]')!;
		const image = parent.querySelector<HTMLImageElement>('img')!;

		assert.equal(radio.value, 'foo.jpg');
		assert.equal(image.src, 'https://media.w0s.jp/thumbimage/blog/foo.jpg?type=webp;w=360;h=360;quality=30');
		assert.equal(image.alt, 'foo.jpg');
		assert.equal(image.title, 'foo.jpg');
	});

	await t.test('YouTube', () => {
		const { document } = new JSDOM(`
<!DOCTYPE html>
<div>
	<template id="message-preview"></template>
	<div>
		<a href="https://www.youtube.com/watch?v=foo"></a>
	</div>
</div>

<div>
	<template id="select-image" data-selected="">
		<input type="radio" />
		<img />
	</template>
</div>
`).window;

		const preview = document.querySelector<HTMLTemplateElement>('#message-preview')!;
		const selectImage = document.querySelector<HTMLTemplateElement>('#select-image')!;

		messageImage({
			preview: preview,
			image: selectImage,
		});

		const parent = selectImage.parentElement!;
		const radio = parent.querySelector<HTMLInputElement>('input[type=radio]')!;
		const image = parent.querySelector<HTMLImageElement>('img')!;

		assert.equal(radio.value, 'https://i1.ytimg.com/vi/foo/hqdefault.jpg');
		assert.equal(image.src, 'https://i1.ytimg.com/vi/foo/hqdefault.jpg');
		assert.equal(image.alt, 'https://i1.ytimg.com/vi/foo/hqdefault.jpg');
		assert.equal(image.title, 'https://i1.ytimg.com/vi/foo/hqdefault.jpg');
	});

	await t.test('Amazon', () => {
		const { document } = new JSDOM(`
<!DOCTYPE html>
<div>
	<template id="message-preview"></template>
	<div>
		<img src="https://m.media-amazon.com/images/I/foo._SL320_.jpg" />
	</div>
</div>

<div>
	<template id="select-image" data-selected="">
		<input type="radio" />
		<img />
	</template>
</div>
`).window;

		const preview = document.querySelector<HTMLTemplateElement>('#message-preview')!;
		const selectImage = document.querySelector<HTMLTemplateElement>('#select-image')!;

		messageImage({
			preview: preview,
			image: selectImage,
		});

		const parent = selectImage.parentElement!;
		const radio = parent.querySelector<HTMLInputElement>('input[type=radio]')!;
		const image = parent.querySelector<HTMLImageElement>('img')!;

		assert.equal(radio.value, 'https://m.media-amazon.com/images/I/foo.jpg');
		assert.equal(image.src, 'https://m.media-amazon.com/images/I/foo.jpg');
		assert.equal(image.alt, 'https://m.media-amazon.com/images/I/foo.jpg');
		assert.equal(image.title, 'https://m.media-amazon.com/images/I/foo.jpg');
	});
});

await test('selected', async (t) => {
	await t.test('different file name', () => {
		const { document } = new JSDOM(`
<!DOCTYPE html>
<div>
	<template id="message-preview"></template>
	<div>
		<img src="https://media.w0s.jp/thumbimage/blog/foo.jpg" />
	</div>
</div>

<div>
	<template id="select-image" data-selected="bar.jpg">
		<input type="radio" />
		<img />
	</template>
</div>
`).window;

		const preview = document.querySelector<HTMLTemplateElement>('#message-preview')!;
		const selectImage = document.querySelector<HTMLTemplateElement>('#select-image')!;

		messageImage({
			preview: preview,
			image: selectImage,
		});

		const radio = selectImage.parentElement!.querySelector<HTMLInputElement>('input[type=radio]')!;

		assert.equal(radio.value, 'foo.jpg');
		assert.equal(radio.checked, false);
	});

	await t.test('same file name', () => {
		const { document } = new JSDOM(`
<!DOCTYPE html>
<div>
	<template id="message-preview"></template>
	<div>
		<img src="https://media.w0s.jp/thumbimage/blog/foo.jpg" />
	</div>
</div>

<div>
	<template id="select-image" data-selected="foo.jpg">
		<input type="radio" />
		<img />
	</template>
</div>
`).window;

		const preview = document.querySelector<HTMLTemplateElement>('#message-preview')!;
		const selectImage = document.querySelector<HTMLTemplateElement>('#select-image')!;

		messageImage({
			preview: preview,
			image: selectImage,
		});

		const radio = selectImage.parentElement!.querySelector<HTMLInputElement>('input[type=radio]')!;

		assert.equal(radio.value, 'foo.jpg');
		assert.equal(radio.checked, true);
	});

	await t.test('same file name', () => {
		const { document } = new JSDOM(`
<!DOCTYPE html>
<div>
	<template id="message-preview"></template>
	<div>
		<img src="https://media.w0s.jp/thumbimage/blog/foo.jpg" />
	</div>
</div>

<div>
	<template id="select-image">
		<input type="radio" />
		<img />
	</template>
	<div>
		<input type="radio" value="foo.jpg" checked="" />
	</div>
</div>
`).window;

		const preview = document.querySelector<HTMLTemplateElement>('#message-preview')!;
		const selectImage = document.querySelector<HTMLTemplateElement>('#select-image')!;

		messageImage({
			preview: preview,
			image: selectImage,
		});

		const radio = selectImage.parentElement!.querySelector<HTMLInputElement>('input[type=radio]')!;

		assert.equal(radio.value, 'foo.jpg');
		assert.equal(radio.checked, true);
	});
});
