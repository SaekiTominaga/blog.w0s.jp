import type { ElementContent } from 'hast';
import type { Icon as LinkIcon } from './link.ts';

/**
 * Generating an element representing the host information of the link
 *
 * @param typeInfo - Type info
 * @param hostInfo - Host info
 *
 * @returns Element representing the host information of the link
 */
export const linkInfo = (typeInfo: LinkIcon | undefined, hostInfo: LinkIcon | string | undefined): ElementContent[] => {
	const info: ElementContent[] = [];

	if (typeInfo !== undefined) {
		info.push({
			type: 'element',
			tagName: 'img',
			properties: {
				src: `/image/icon/${typeInfo.fileName}`,
				alt: `(${typeInfo.altText})`,
				width: '16',
				height: '16',
				className: 'c-link-icon',
			},
			children: [],
		});
	}

	if (hostInfo !== undefined) {
		if (typeof hostInfo === 'string') {
			info.push({
				type: 'element',
				tagName: 'small',
				properties: {
					className: 'c-domain',
				},
				children: [
					{
						type: 'text',
						value: '(',
					},
					{
						type: 'element',
						tagName: 'code',
						properties: {},
						children: [
							{
								type: 'text',
								value: hostInfo,
							},
						],
					},
					{
						type: 'text',
						value: ')',
					},
				],
			});
		} else {
			info.push({
				type: 'element',
				tagName: 'small',
				properties: {
					className: 'c-domain',
				},
				children: [
					{
						type: 'element',
						tagName: 'img',
						properties: {
							src: `/image/icon/${hostInfo.fileName}`,
							alt: `(${hostInfo.altText})`,
							width: '16',
							height: '16',
						},
						children: [],
					},
				],
			});
		}
	}

	return info;
};
