const clear = ($template: HTMLTemplateElement): void => {
	const $parent = $template.parentElement;
	if ($parent !== null) {
		$parent.hidden = true;
	}

	[...($template.parentNode?.children ?? [])]
		.filter(($element) => $element !== $template)
		.forEach(($element) => {
			$element.remove();
		});
};

const update = ($template: HTMLTemplateElement, $templateContent: HTMLElement): void => {
	const $fragment = document.createDocumentFragment();
	$fragment.append($templateContent);

	$template.parentNode?.append($fragment);

	const $parent = $template.parentElement;
	if ($parent !== null) {
		$parent.hidden = false;
	}
};

export { clear, update };
