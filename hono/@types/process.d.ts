declare namespace Process {
	interface Result {
		success: boolean;
		message: string;
	}

	interface DSGResult extends Result {
		date?: Date;
	}

	interface MediaResult extends Result {
		filename: string;
	}
}
