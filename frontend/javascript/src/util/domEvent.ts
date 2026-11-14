export default async (ev: Event): Promise<void> => {
	try {
		const { type } = ev;

		const bodyObject: Readonly<Record<string, string | number>> = {
			documentURL: location.toString(),
			eventType: type,
		};

		const response = await fetch('https://api.w0s.jp/report/domevent', {
			method: 'POST',
			headers: new Headers([['Content-Type', 'application/json']]),
			body: JSON.stringify(bodyObject),
		});

		if (!response.ok) {
			throw new Error(`\`${response.url}\` is ${String(response.status)} ${response.statusText}`);
		}
	} catch (error) {
		reportError(error);
	}
};
