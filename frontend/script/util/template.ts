export const clear = (template: HTMLTemplateElement): void => {
	Array.from(template.parentNode?.children ?? [])
		.filter((element) => element !== template)
		.forEach((element) => {
			element.remove();
		});
};

export const update = (template: HTMLTemplateElement, fragment: DocumentFragment): void => {
	template.parentNode?.appendChild(fragment);
};
