declare namespace Process {
	interface Result {
		success: boolean;
		message: string;
	}

	interface UploadResult extends Result {
		filename: string;
	}
}
