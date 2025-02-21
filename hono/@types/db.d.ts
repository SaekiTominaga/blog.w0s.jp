declare namespace BlogDb {
	interface Entry {
		id: number;
		title: string;
		description: string | undefined;
		message: string;
		imageInternal: string | undefined;
		imageExternal: URL | undefined;
		registedAt: Date;
		updatedAt: Date | undefined;
		public: boolean;
	}
}
