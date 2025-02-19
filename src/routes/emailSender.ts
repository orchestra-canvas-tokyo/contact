import { Resend } from 'resend';
import { categories, type CategoryKey, type RequestBody } from './validator';
import { env } from '$env/dynamic/private';

const ccsByCategory: Record<string, string[]> = {
	'concert, ticket': ['webadmin@orch-canvas.tokyo', 'info@orch-canvas.tokyo'],
	advertisement: ['webadmin@orch-canvas.tokyo', 'pr@orch-canvas.tokyo'],
	'hp, sns': ['webadmin@orch-canvas.tokyo'],
	others: ['webadmin@orch-canvas.tokyo', 'contact@orch-canvas.tokyo']
} as Record<CategoryKey, string[]>;

export async function sendEmail(content: RequestBody, apiKey: string) {
	const subject = 'お問い合わせを承りました（Orchestra Canvas Tokyo）';
	const textBody = generateTextBody(content);
	const htmlBody = await generateHtmlBody(content);

	const resend = new Resend(apiKey);

	const isProduction = env['CF_PAGES_BRANCH'] === 'production';
	if (isProduction) {
		await resend.emails.send({
			from: 'お問い合わせフォーム <webadmin@orch-canvas.tokyo>',
			to: [content.email],
			cc: ccsByCategory[content.categoryKey],
			replyTo: ccsByCategory[content.categoryKey],
			subject: subject,
			text: textBody,
			html: htmlBody
		});
	} else {
		await resend.emails.send({
			from: 'お問い合わせフォーム <webadmin@orch-canvas.tokyo>',
			to: [content.email],
			subject: `【テスト環境】${subject}`,
			text: textBody,
			html: htmlBody
		});
	}
}

function generateTextBody(content: RequestBody): string {
	let body: string = `
Orchestra Canvas Tokyoです。
ホームページより、お問い合わせを承りました。

必要に応じてメールにてご返答いたします。
なお、メールアドレスが正しく入力されていない場合、返答いたしかねます。ご了承ください。

* * * 

分類：${categories[content.categoryKey]}
本分：
${content.body}
	`.trim();

	// 名前が送信されている場合、宛名と適当な改行を挿入
	if (content.name)
		body =
			`
${content.name}さま
			`.trim() + body;

	return body;
}

async function generateHtmlBody(content: RequestBody): Promise<string> {
	const templateHtml: string = (await import('./emailTemplate.html?raw')).default;

	// 各種パラメータを置換
	let body: string = templateHtml
		.replace('%name%', content.name)
		.replace('%categoryDescription%', categories[content.categoryKey])
		.replace('%body%', content.body.replaceAll('\n', '<br />'));

	// nameが空の場合、関連する部分を削除
	if (content.name === '') body = body.replace(/<!-- name -->.+<!-- \/name -->/s, '');

	return body;
}
