import { Hono } from 'hono';
import { env } from '@w0s/env-value-type';
import type { Variables } from '../../app.ts';
import EntryDao from '../../db/Entry.ts';
import { query as validatorQuery } from '../../validator/entriesSummary.ts';
import type { EntrySummaryData, EntriesSummary as Result } from '../../../../@types/api.d.ts';

/**
 * 記事概要
 */

export const entriesSummaryApp = new Hono<{ Variables: Variables }>().get(validatorQuery, async (context) => {
	const { req } = context;

	const { ids: entryIds } = req.valid('query');

	const dao = new EntryDao(`${env('ROOT')}/${env('SQLITE_DIR')}/${env('SQLITE_BLOG')}`, {
		readonly: true,
	});

	const entriesDto = await dao.findEntries(entryIds);

	const summaryData: readonly EntrySummaryData[] = entryIds.map((id) => {
		const entryDto = entriesDto.find((entry) => entry.id === id);

		return {
			id: id,
			title: entryDto?.title,
			registedAt: entryDto?.registed_at,
			updatedAt: entryDto?.updated_at,
		};
	});

	return context.json({
		data: summaryData,
	} as Result);
});
