import { strict as assert } from 'node:assert';
import { before, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { clear, update } from './template.ts';

before(() => {
	global.document = new JSDOM().window.document;
});

await test('clear', () => {
	const { document } = new JSDOM(`
<!DOCTYPE html>
<div>
	<template></template>
	<p></p>
	<p></p>
</div>
`).window;

	const template = document.querySelector('template')!;
	const templateParentChildren = template.parentNode?.children;

	assert.equal(templateParentChildren?.length, 3);

	clear(template);

	assert.equal(templateParentChildren.length, 1);
	assert.equal(templateParentChildren.item(0)?.tagName, 'TEMPLATE');
});

await test('update', () => {
	const { document } = new JSDOM(`
<!DOCTYPE html>
<div>
	<template>
		<p>text1</p>
		<p>text2</p>
	</template>
</div>
`).window;

	const template = document.querySelector('template')!;
	const templateParentChildren = template.parentNode?.children;

	assert.equal(templateParentChildren?.length, 1);

	const fragment = document.createDocumentFragment();
	fragment.appendChild(template.content.cloneNode(true));

	update(template, fragment);

	assert.equal(templateParentChildren.length, 3);
	assert.equal(templateParentChildren.item(0)?.tagName, 'TEMPLATE');
	assert.equal(templateParentChildren.item(1)?.textContent, 'text1');
	assert.equal(templateParentChildren.item(2)?.textContent, 'text2');
});
