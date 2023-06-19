import type { Properties } from 'hast';
import md5 from 'md5';
import type { Code } from 'mdast';
import type { H } from 'mdast-util-to-hast';
import type { HastElementContent } from 'mdast-util-to-hast/lib/state.js';
import { config } from '../../config.js';

/**
 * <pre><code>
 */

export const codeToHast = (_state: H, node: Code): HastElementContent | HastElementContent[] | null | undefined => {
	const { value, position, lang } = node;

	let positionString = ''; // コードの位置情報（position プロパティ）を文字列化する
	if (position !== undefined) {
		const { start, end } = position;

		positionString = `${start.line}${start.column}${start.offset}${end.line}${end.column}${end.offset}`;
	}

	const id = `code-${md5(`${positionString}${value}`)}`; // コード ID（記事内でのユニークさを保つためにコード文字列と位置情報を組み合わせた文字列を元にする）

	const codeProperties: Properties = {
		id: id,
	};
	if (lang !== null && lang !== undefined && config.codeLanguages.includes(lang)) {
		codeProperties['className'] = [`lang-${lang}`];
	}

	const codeChildren: HastElementContent[] = [];
	if (value.includes('\n')) {
		/* 複数行の場合はクリップボードボタンを表示 */
		codeChildren.push({
			type: 'element',
			tagName: 'div',
			properties: {
				className: ['p-code__clipboard'],
			},
			children: [
				{
					type: 'element',
					tagName: 'button',
					properties: {
						type: 'button',
						is: 'w0s-clipboard',
						className: ['p-code__clipboard-button'],
						'data-target-for': id,
					},
					children: [
						{
							type: 'element',
							tagName: 'img',
							properties: {
								src: '/image/entry/copy.svg',
								alt: 'コピー',
							},
							children: [],
						},
					],
				},
			],
		});
	}
	codeChildren.push({
		type: 'element',
		tagName: 'pre',
		properties: {
			className: ['p-code__code'],
		},
		children: [
			{
				type: 'element',
				tagName: 'code',
				properties: codeProperties,
				children: [
					{
						type: 'text',
						value: value,
					},
				],
			},
		],
	});

	return {
		type: 'element',
		tagName: 'div',
		properties: {
			className: ['p-code'],
		},
		children: codeChildren,
	};
};
