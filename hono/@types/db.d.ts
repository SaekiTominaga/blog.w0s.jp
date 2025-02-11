declare namespace BlogDb {
	interface Entry {
		id: number;
		title: string;
		description: string | null;
		message: string;
		image_internal: string | null;
		image_external: string | null;
		registed_at: Date;
		updated_at: Date | null;
		public: boolean;
	}
}
