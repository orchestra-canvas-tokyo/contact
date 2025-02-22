<script lang="ts">
	import { applyAction, deserialize } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import { invalidateAll } from '$app/navigation';
	import { categories, maxBodyLength } from './validator';
	import { onMount } from 'svelte';

	let { data, form } = $props();

	// 本番環境では、直接の参照はできないようにする
	onMount(() => {
		const isProduction = window.location.hostname === 'contact.orch-canvas.tokyo';
		const isDirectAccess = window.parent === window;
		if (isProduction && isDirectAccess) {
			window.location.href = 'https://www.orch-canvas.tokyo/contact';
		}
	});

	// csrfトークン
	const csrfToken = data.csrfToken;

	// フォーム送信後のtoast
	let toastMessage: string | null = $state(null);
	let isToastShown = $state(false); // フェードアウト時に要素の幅が小さくならないように別管理
	const formResponseStateChanged = (success: boolean) => {
		toastMessage = success
			? 'お問い合わせを受け付けました。'
			: 'フォーム送信に失敗しました。再度お試しください。';
		isToastShown = true;

		if (success) {
			// フォームの値を初期化する
			(document.getElementById('name') as HTMLInputElement).value = '';
			(document.getElementById('email') as HTMLInputElement).value = '';
			(document.getElementById('categoryKey') as HTMLSelectElement).selectedIndex = 0;
			(document.getElementById('body') as HTMLTextAreaElement).value = '';
		}

		setTimeout(() => {
			// 5秒後にtoastを非表示にする
			isToastShown = false;
		}, 5000);
	};

	// 送信時に呼び出される関数
	let isSubmitting = $state(false); // 送信中の状態を管理する変数
	const reCaptchaSiteKey = '6LfixUwmAAAAAKr_6ZeTyiPBnYq-Li5KO8_5EVbC';
	async function onSubmit(event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }) {
		event.preventDefault();

		isSubmitting = true; // 送信ボタンを無効化
		try {
			const data = new FormData(document.querySelector('form') as HTMLFormElement);

			// reCAPTCHAトークンを発行
			// eslint-disable-next-line no-undef
			const reCaptchaToken = await grecaptcha.execute(reCaptchaSiteKey, { action: 'submit' });
			data.append('reCaptchaToken', reCaptchaToken);

			// サーバーサイドに送信
			const response = await fetch('/', {
				method: 'POST',
				body: data
			});
			const result: ActionResult = deserialize(await response.text());

			// リクエストが成功した場合の一連のおまじない
			if (result.type === 'success') {
				// rerun all `load` functions, following the successful update
				await invalidateAll();
			}
			applyAction(result);
		} catch {
			formResponseStateChanged(false);
		} finally {
			isSubmitting = false; // 送信ボタンを再度有効化
		}
	}

	// formが更新されたとき(フォーム送信のレスポンス受信後)の処理
	$effect(() => {
		if (form === null) return;

		if (form.success === undefined) {
			toastMessage = null;
		} else {
			formResponseStateChanged(form.success);
		}
	});
</script>

<svelte:head>
	<script src="https://www.google.com/recaptcha/api.js?render={reCaptchaSiteKey}" async></script>
</svelte:head>

<form method="POST" onsubmit={onSubmit}>
	<div class="form-container">
		<label for="name">お名前</label>
		<input type="text" id="name" name="name" disabled={isSubmitting} />
		<label for="email" class="required-label">メールアドレス</label>
		<input type="email" id="email" name="email" required disabled={isSubmitting} />
		<label for="categoryKey" class="required-label">種類</label>
		<select id="categoryKey" name="categoryKey" required disabled={isSubmitting}>
			<option value="" selected hidden></option>
			{#each Object.entries(categories) as [key, description]}
				<option value={key}>{description}</option>
			{/each}
		</select>
		<label for="body" class="required-label">本文</label>
		<textarea
			id="body"
			name="body"
			rows="6"
			maxlength={maxBodyLength}
			required
			disabled={isSubmitting}
		></textarea>
	</div>

	<input type="hidden" name="csrfToken" value={csrfToken} />
	<button type="submit" disabled={isSubmitting}>送信</button>

	<!-- ref: https://developers.google.com/recaptcha/docs/faq?hl=ja#id-like-to-hide-the-recaptcha-badge.-what-is-allowed https://developers.google.com/recaptcha/docs/faq?hl=ja#id-like-to-hide-the-recaptcha-badge.-what-is-allowed-->
	<p class="recaptcha-description">
		このサイトはreCAPTCHAによって保護されており、Googleの<a
			href="https://policies.google.com/privacy">プライバシーポリシー</a
		>と<a href="https://policies.google.com/terms">利用規約</a>が適用されます。
	</p>
</form>

<div class="toast" class:shown={isToastShown}>{toastMessage}</div>

<style>
	/*  自サーバーにホストしているFuturaを読み込む
			downloaded from https://fontsgeek.com/fonts/Futura-Medium */
	@font-face {
		font-family: 'Futura Medium';
		src: url('/font/Futura\ Medium.otf') format('opentype');
	}

	:root {
		--main-color: white;
		--secondary-color: #938b87;
		--background-color: #0a0606;
		--secondary-background-color: #36312e;
		--tertiary-background-color: #938b87;
		--font-family:
			'游ゴシック体', YuGothic, '游ゴシック Medium', 'Yu Gothic Medium', '游ゴシック', 'Yu Gothic',
			sans-serif;
		--letter-spacing: 0.1em;

		color: var(--main-color);
		background-color: var(--background-color);
		font-family: var(--font-family);
		letter-spacing: var(--letter-spacing);
	}

	:global(body) {
		margin: 0;
	}

	a {
		color: var(--main-color);
		text-decoration: none;
		border-bottom: 1px solid;
	}

	.form-container {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 20px;
	}
	@media (max-width: 790px) {
		.form-container {
			grid-template-columns: inherit;
			gap: 5px;
		}
	}

	.required-label::after {
		content: '必須';
		margin-left: 8px;
		padding: 2px 4px;
		border-radius: 4px;
		background-color: var(--main-color);
		color: var(--background-color);
		font-size: 0.75em;
	}

	input[type='text'],
	input[type='email'],
	select,
	textarea {
		padding: 8px;
		border-radius: 4px;
		background-color: var(--main-color);
		color: var(--background-color);
	}
	@media (max-width: 790px) {
		input[type='text'],
		input[type='email'],
		select,
		textarea {
			margin-bottom: 20px;
		}
	}

	textarea {
		font-family: var(--font-family);
	}

	button {
		display: block;
		border: 1px solid;
		padding: 15px 0;
		margin-top: 30px;
		width: 100%;
		text-align: center;
		color: var(--main-color);
		background-color: var(--background-color);
		text-decoration: none;
		transition-duration: 0.3s;
	}
	button:hover {
		color: var(--background-color);
		background-color: var(--main-color);
	}
	button:disabled {
		color: var(--main-color);
		border-color: var(--background-color);
		background-color: var(--secondary-color);
	}

	.toast {
		position: fixed;
		bottom: 20px;
		right: calc(20px);
		background-color: var(--background-color);
		padding: 8px;
		border: 1px solid;
		border-radius: 4px;
		transition-duration: 0.3s;
		transform: translateX(30px);
		opacity: 0;
	}
	.toast.shown {
		transform: none;
		opacity: 1;
	}

	:global(.grecaptcha-badge) {
		visibility: hidden;
	}

	.recaptcha-description {
		margin: 1em 0;
		font-size: 0.8em;
		line-height: 1.9em;
	}
</style>
