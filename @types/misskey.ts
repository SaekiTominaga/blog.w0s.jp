/* https://misskey.noellabo.jp/api-doc#tag/notes/post/notescreate */
export type NotesCreate = Readonly<_NotesCreate>;

interface _NotesCreateCreatedNote {
	id: string;
	createdAt: string;
	deletedAt?: string;
	text: string;
	cw?: string;
	userId: string;
	user: Readonly<object>;
	replyId?: string;
	renoteId?: string;
	reply?: Readonly<object>;
	renote?: Readonly<object>;
	isHidden?: boolean;
	visibility: 'public' | 'home' | 'followers' | 'specified';
	mentions?: readonly string[];
	visibleUserIds?: readonly string[];
	fileIds?: readonly string[];
	files?: readonly Readonly<object>[];
	tags?: readonly string[];
	poll?: Readonly<object>;
	emojis?: Readonly<object>;
	channelId?: string;
	channel?: Readonly<object>;
	localOnly?: boolean;
	reactionAcceptance: string;
	reactionEmojis: Readonly<object>;
	reactions: Readonly<object>;
	reactionCount: number;
	renoteCount: number;
	repliesCount: number;
	uri?: string;
	url?: string;
	reactionAndUserPairCache?: readonly string[];
	clippedCount?: number;
	myReaction?: string;
}

interface _NotesCreateError {
	code: string;
	message: string;
	id: string;
}

interface _NotesCreate {
	createdNote: Readonly<_NotesCreateCreatedNote>;
	error: Readonly<_NotesCreateError>;
}
