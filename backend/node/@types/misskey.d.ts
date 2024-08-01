declare namespace MisskryAPIResponse {
	/* https://misskey.io/api-doc#tag/notes/operation/notes___create */
	interface NotesCreate {
		createdNote: {
			id: string;
			createdAt: string;
			deletedAt?: string;
			text: string;
			cw?: string;
			userId: string;
			user: object;
			replyId?: string;
			renoteId?: string;
			reply?: object;
			renote?: object;
			isHidden?: boolean;
			visibility: 'public' | 'home' | 'followers' | 'specified';
			mentions?: string[];
			visibleUserIds?: string[];
			fileIds?: string[];
			files?: object[];
			tags?: string[];
			poll?: object;
			emojis?: object;
			channelId?: string;
			channel?: object;
			localOnly?: boolean;
			reactionAcceptance: string;
			reactionEmojis: object;
			reactions: object;
			reactionCount: number;
			renoteCount: number;
			repliesCount: number;
			uri?: string;
			url?: string;
			reactionAndUserPairCache?: string[];
			clippedCount?: number;
			myReaction?: string;
		};
		error: {
			code: string;
			message: string;
			id: string;
		};
	}
}
