import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');

test('デザイナー募集終了時もカテゴリーを再選択できる', () => {
	assert.match(page, /let isDesignerCategory = \$derived\(categoryKey === 'designer'\)/);
	const select = page.match(/<select[\s\S]*?<\/select>/)?.[0];
	assert.ok(select, 'カテゴリー選択欄が見つかりませんでした');
	assert.match(select, /bind:value=\{categoryKey\}/);
	assert.match(select, /disabled=\{isSubmitting\}/);
	assert.doesNotMatch(select, /isDesignerCategory/);
});

test('デザイナー募集終了時は案内を表示して入力と送信を無効化する', () => {
	assert.match(page, /ご検討いただきありがとうございます。/);
	assert.match(page, /今回の募集は終了いたしました。/);
	assert.match(page, /たくさんのご応募ありがとうございました。/);
	assert.match(page, /disabled=\{isSubmitting \|\| isDesignerCategory\}/);
	assert.match(page, /<button type="submit" disabled=\{isSubmitting \|\| isDesignerCategory\}>/);
});
