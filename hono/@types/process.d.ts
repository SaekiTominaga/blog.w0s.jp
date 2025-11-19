declare namespace Process {
	interface Result {
		success: boolean;
		message: string;
	}

	interface MediaResult extends Result {
		filename: string;
	}
}
