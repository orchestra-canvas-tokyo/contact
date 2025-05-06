import { env } from '$env/dynamic/private';
import type { RequestBody } from './validator';
import { categories } from './validator';

export async function sendSlackNotification(content: RequestBody) {
	const webhookUrl = env.SLACK_WEBHOOK_URL;

	// 環境変数が設定されていない場合は何もしない
	if (!webhookUrl) return;

	const isProduction = env['CF_PAGES_BRANCH'] === 'production';
	const prefix = isProduction ? '' : '【テスト環境】';

	const message = {
		blocks: [
			{
				type: 'header',
				text: {
					type: 'plain_text',
					text: `${prefix}ホームページのお問い合わせフォームから新規お問い合わせ`,
					emoji: true
				}
			},
			{
				type: 'section',
				fields: [
					{
						type: 'mrkdwn',
						text: `*名前:*\n${content.name || '未入力'}`
					},
					{
						type: 'mrkdwn',
						text: `*メール:*\n${content.email}`
					},
					{
						type: 'mrkdwn',
						text: `*分類:*\n${categories[content.categoryKey]}`
					}
				]
			},
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `*本文:*\n${content.body}`
				}
			}
		]
	};

	try {
		const response = await fetch(webhookUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(message)
		});

		if (!response.ok) {
			throw new Error(`Slack API responded with status: ${response.status}`);
		}

		return true;
	} catch (error) {
		console.error('Slack通知の送信に失敗しました:', error);
		return false;
	}
}
