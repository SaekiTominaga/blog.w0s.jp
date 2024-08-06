export default {
	plugins: [
		'cleanupAttrs',
		'mergeStyles',
		'inlineStyles',
		'removeDoctype',
		'removeXMLProcInst',
		'removeComments',
		'removeMetadata',
		'removeUselessDefs',
		'removeEditorsNSData',
		'removeEmptyAttrs',
		'removeEmptyText',
		'removeEmptyContainers',
		'cleanupEnableBackground',
		'minifyStyles',
		'convertStyleToAttrs',
		'convertColors',
		{
			name: 'removeUnknownsAndDefaults',
			params: {
				unknownAttrs: false,
			},
		},
		'convertPathData',
		'convertTransform',
		'removeNonInheritableGroupAttrs',
		'removeUselessStrokeAndFill',
		'removeUnusedNS',
		'cleanupNumericValues',
		'moveElemsAttrsToGroup',
		'moveGroupAttrsToElems',
		'collapseGroups',
		'mergePaths',
		'convertEllipseToCircle',
		'sortDefsChildren',
	],
};