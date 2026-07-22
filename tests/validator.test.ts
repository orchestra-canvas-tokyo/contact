import * as validator from '../src/routes/validator';

function assert(condition: boolean, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

const result = validator.validate({
	name: 'テスト太郎',
	email: 'test@example.com',
	categoryKey: 'designer',
	body: 'デザイナー募集について問い合わせます。',
	csrfToken: '123e4567-e89b-12d3-a456-426614174000',
	reCaptchaToken: 'test-token'
});

assert(result.success, 'デザイナー募集のお問い合わせがバリデーションを通過しませんでした');
assert(
	validator.categories[result.data.categoryKey] === 'デザイナー募集について',
	'お問い合わせ種別の表示名が一致しませんでした'
);

const recipients = validator.ccsByCategory[result.data.categoryKey];
assert(
	recipients.length === 2 &&
		recipients[0] === 'webadmin@orch-canvas.tokyo' &&
		recipients[1] === 'kouhou@orch-canvas.tokyo',
	'デザイナー募集のお問い合わせ先が一致しませんでした'
);

console.log('デザイナー募集のお問い合わせ種別と転送先を確認しました');
