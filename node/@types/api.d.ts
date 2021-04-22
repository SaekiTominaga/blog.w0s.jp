declare namespace BlogApi {
	export interface AmazonImage {
		errors: string[];
		images: Map<string, string>;
	}

	export type TweetImage = string[];
}
