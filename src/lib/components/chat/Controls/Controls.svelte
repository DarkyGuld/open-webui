<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	const dispatch = createEventDispatcher();
	const i18n = getContext('i18n');

	import XMark from '$lib/components/icons/XMark.svelte';
	import AdvancedParams from '../Settings/Advanced/AdvancedParams.svelte';
	import Valves from '$lib/components/chat/Controls/Valves.svelte';
	import FileItem from '$lib/components/common/FileItem.svelte';
	import Collapsible from '$lib/components/common/Collapsible.svelte';

	import { user, settings, config } from '$lib/stores';
	export let models = [];
	export let chatFiles = [];
	export let params = {};
	export let embed = false;

	// Persist collapsible section open/close state
	const getOpen = (key: string, fallback = true): boolean => {
		const v = localStorage.getItem(`chatControls.${key}`);
		return v !== null ? v === 'true' : fallback;
	};
	const setOpen = (key: string) => (open: boolean) => {
		localStorage.setItem(`chatControls.${key}`, String(open));
	};

	let showFiles = getOpen('files');
	let showValves = getOpen('valves', false);
	let showSystemPrompt = getOpen('systemPrompt');
	let showAdvancedParams = getOpen('advancedParams');
	let showIntelligentUi = getOpen('intelligentUi', true);
	let showRichWidgets = getOpen('richWidgets', true);

	const compactSectionButtonClass =
		'w-full py-1 text-xs font-normal text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition cursor-pointer select-none';
	const systemPromptTextareaClass =
		'w-full resize-vertical rounded-lg border border-gray-100/50 bg-gray-50/40 px-2 py-1.5 text-xs text-gray-700 outline-hidden transition-colors placeholder:text-gray-300 focus:border-blue-400 dark:border-white/[0.04] dark:bg-white/[0.03] dark:text-gray-300 dark:placeholder:text-gray-700 dark:focus:border-blue-500';
	const compactSystemPromptTextareaClass =
		'w-full resize-vertical appearance-none bg-transparent py-1 text-xs outline-hidden focus:bg-transparent disabled:bg-transparent';
</script>

<div class=" dark:text-white">
	{#if !embed}
		<div class=" flex items-center justify-between dark:text-gray-100 mb-2">
			<div class=" text-md self-center">{$i18n.t('Controls')}</div>
			<button
				class="self-center"
				aria-label={$i18n.t('Close chat controls')}
				on:click={() => {
					dispatch('close');
				}}
			>
				<XMark className="size-3.5" />
			</button>
		</div>
	{/if}

	{#if $user?.role === 'admin' || ($user?.permissions.chat?.controls ?? true)}
		<div class="space-y-1 dark:text-gray-200 text-sm py-0.5 px-0.5">
			{#if chatFiles.length > 0}
				<Collapsible
					title={$i18n.t('Files')}
					bind:open={showFiles}
					onChange={setOpen('files')}
					buttonClassName="w-full"
					chevronClassName="size-2.5"
					chevronStrokeWidth="2"
				>
					<div class="flex flex-col gap-1 mt-1.5" slot="content">
						{#each chatFiles as file, fileIdx}
							<FileItem
								className="w-full"
								item={file}
								edit={true}
								url={file?.url ? file.url : null}
								name={file.name}
								type={file.type}
								size={file?.size}
								dismissible={true}
								small={true}
								on:dismiss={() => {
									// Remove the file from the chatFiles array

									chatFiles.splice(fileIdx, 1);
									chatFiles = chatFiles;
								}}
								on:click={() => {
									console.log(file);
								}}
							/>
						{/each}
					</div>
				</Collapsible>
			{/if}

			{#if $user?.role === 'admin' || ($user?.permissions.chat?.valves ?? true)}
				<Collapsible
					bind:open={showValves}
					onChange={setOpen('valves')}
					title={$i18n.t('Valves')}
					buttonClassName={compactSectionButtonClass}
					chevronClassName="size-2.5"
					chevronStrokeWidth="2"
				>
					<div class="pt-1 pb-1 text-xs" slot="content">
						<Valves show={showValves} />
					</div>
				</Collapsible>
			{/if}

			{#if $user?.role === 'admin' || ($user?.permissions.chat?.system_prompt ?? true)}
				<Collapsible
					title={$i18n.t('System Prompt')}
					bind:open={showSystemPrompt}
					onChange={setOpen('systemPrompt')}
					buttonClassName={compactSectionButtonClass}
					chevronClassName="size-2.5"
					chevronStrokeWidth="2"
				>
					<div class="pt-1 pb-1" slot="content">
						<textarea
							bind:value={params.system}
							class={($settings?.highContrastMode ?? false)
								? systemPromptTextareaClass
								: compactSystemPromptTextareaClass}
							rows="3"
							placeholder={$i18n.t('Enter system prompt')}
						/>
					</div>
				</Collapsible>
			{/if}

			{#if $config?.features?.enable_intelligent_ui === true && ($settings?.intelligentUi ?? false) === true}
				<Collapsible
					title={$i18n.t('Intelligent UI')}
					bind:open={showIntelligentUi}
					onChange={setOpen('intelligentUi')}
					buttonClassName={compactSectionButtonClass}
					chevronClassName="size-2.5"
					chevronStrokeWidth="2"
				>
					<div class="pt-1 pb-1" slot="content">
						<div
							class="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 text-xs dark:bg-gray-850"
						>
							{#each [['auto', $i18n.t('Auto')], ['on', $i18n.t('On')], ['off', $i18n.t('Off')]] as [value, label] (value)}
								<button
									type="button"
									class="flex-1 cursor-pointer rounded-md px-2 py-1 transition-colors {(params.intelligent_ui ??
										'auto') === value
										? 'bg-white font-medium text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
										: 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}"
									on:click={() => (params.intelligent_ui = value)}
								>
									{label}
								</button>
							{/each}
						</div>
						<p class="mt-1 text-[0.6875rem] text-gray-400 dark:text-gray-600">
							{$i18n.t('Auto lets the model decide; On encourages richer UI; Off is plain Markdown.')}
						</p>
					</div>
				</Collapsible>
			{/if}

			{#if $config?.features?.enable_intelligent_ui_html === true && ($settings?.intelligentUiHtml ?? false) === true}
				<Collapsible
					title={$i18n.t('Rich widgets')}
					bind:open={showRichWidgets}
					onChange={setOpen('richWidgets')}
					buttonClassName={compactSectionButtonClass}
					chevronClassName="size-2.5"
					chevronStrokeWidth="2"
				>
					<div class="pt-1 pb-1" slot="content">
						<div
							class="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 text-xs dark:bg-gray-850"
						>
							{#each [['auto', $i18n.t('Auto')], ['on', $i18n.t('On')], ['off', $i18n.t('Off')]] as [value, label] (value)}
								<button
									type="button"
									class="flex-1 cursor-pointer rounded-md px-2 py-1 transition-colors {(params.intelligent_ui_html ??
										'auto') === value
										? 'bg-white font-medium text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
										: 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}"
									on:click={() => (params.intelligent_ui_html = value)}
								>
									{label}
								</button>
							{/each}
						</div>
						<p class="mt-1 text-[0.6875rem] text-gray-400 dark:text-gray-600">
							{$i18n.t(
								'Rich widgets: Auto lets the model decide; On encourages custom widgets; Off disables them.'
							)}
						</p>
					</div>
				</Collapsible>
			{/if}

			{#if $user?.role === 'admin' || ($user?.permissions.chat?.params ?? true)}
				<Collapsible
					title={$i18n.t('Advanced Params')}
					bind:open={showAdvancedParams}
					onChange={setOpen('advancedParams')}
					buttonClassName={compactSectionButtonClass}
					chevronClassName="size-2.5"
					chevronStrokeWidth="2"
				>
					<div class="pt-1 pb-1 text-xs" slot="content">
						<div>
							<AdvancedParams admin={$user?.role === 'admin'} custom={true} bind:params />
						</div>
					</div>
				</Collapsible>
			{/if}
		</div>
	{/if}
</div>
