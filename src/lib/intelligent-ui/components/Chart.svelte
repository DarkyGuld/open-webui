<script lang="ts">
	// Native chart backed by chart.js — already an Open WebUI dependency (used by
	// ModelActivityChart / FullHeightIframe). No new dependency. Data is typed
	// (labels + named numeric series); there are no arbitrary callbacks. Data may
	// come from props or be derived from an allow-listed query.
	import { onMount, onDestroy, getContext } from 'svelte';
	import {
		emptyBinding,
		loadBoundQuery,
		chartDataFromQuery,
		type QueryBinding
	} from '$lib/intelligent-ui/query-binding';
	import type { ChartSeries, ChartType } from '$lib/intelligent-ui/types';

	const i18n: any = getContext('i18n');

	export let chartType: ChartType = 'bar';
	export let title: string | undefined = undefined;
	export let labels: string[] = [];
	export let series: ChartSeries[] = [];
	export let source: string | undefined = undefined;

	const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7'];

	let canvas: HTMLCanvasElement;
	let ChartCtor: any = null;
	let chartInstance: any = null;
	let importError = false;
	let observer: MutationObserver | undefined;

	let binding: QueryBinding = emptyBinding();
	let loadedSource: string | undefined = undefined;

	$: if (source && source !== loadedSource) {
		loadedSource = source;
		binding = emptyBinding();
		loadBoundQuery(source, (b) => (binding = b));
	}

	$: data =
		source && binding.status === 'success' && binding.result
			? chartDataFromQuery(binding.result)
			: { labels, series };
	$: sourceLoading = !!source && (binding.status === 'idle' || binding.status === 'loading');
	$: empty = !sourceLoading && data.series.length === 0;
	$: errorState = importError || (!!source && binding.status === 'error');

	function isDark(): boolean {
		return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
	}

	async function render() {
		if (!canvas || !data.series.length || importError) return;
		if (!ChartCtor) {
			try {
				ChartCtor = (await import('chart.js/auto')).default;
			} catch {
				importError = true;
				return;
			}
		}
		chartInstance?.destroy();
		const dark = isDark();
		const textColor = dark ? '#d1d5db' : '#374151';
		const gridColor = dark ? 'rgba(107,114,128,0.18)' : 'rgba(107,114,128,0.12)';
		const type = chartType === 'area' ? 'line' : chartType === 'donut' ? 'doughnut' : chartType;
		const circular = chartType === 'pie' || chartType === 'donut';

		const sparse = data.labels.length <= 12;
		const datasets = data.series.map((s, i) => {
			const color = PALETTE[i % PALETTE.length];
			return {
				label: s.name,
				data: s.values,
				backgroundColor: circular ? color : chartType === 'area' ? `${color}33` : color,
				borderColor: color,
				borderWidth: circular ? 0 : 2,
				fill: chartType === 'area',
				tension: 0.3,
				pointRadius: chartType === 'bar' || circular ? 0 : sparse ? 3 : 1,
				pointHoverRadius: chartType === 'bar' || circular ? 0 : 5,
				borderRadius: chartType === 'bar' ? 3 : 0
			};
		});

		chartInstance = new ChartCtor(canvas, {
			type,
			data: { labels: data.labels, datasets },
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: data.series.length > 1 || circular,
						labels: { color: textColor, boxWidth: 8, boxHeight: 8 }
					},
					tooltip: {
						backgroundColor: 'rgba(17, 24, 39, 0.9)',
						titleColor: '#f3f4f6',
						bodyColor: '#d1d5db',
						borderColor: 'rgba(75, 85, 99, 0.3)',
						borderWidth: 1,
						padding: 8,
						displayColors: !circular
					}
				},
				scales: circular
					? {}
					: {
							x: {
								grid: { display: false },
								ticks: {
									color: textColor,
									maxRotation: 0,
									autoSkip: true,
									callback: function (this: any, value: number) {
										const label = String(this.getLabelForValue(value) ?? '');
										return label.length > 14 ? `${label.slice(0, 13)}…` : label;
									}
								},
								border: { display: false }
							},
							y: {
								beginAtZero: true,
								grid: { color: gridColor, drawTicks: false },
								ticks: { color: textColor },
								border: { display: false }
							}
						}
			}
		});
	}

	$: if (canvas && data.series.length && !importError) render();

	onMount(() => {
		observer = new MutationObserver(() => render());
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
	});

	onDestroy(() => {
		observer?.disconnect();
		chartInstance?.destroy();
		chartInstance = null;
	});
</script>

<div class="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
	{#if title}
		<div class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-200">{title}</div>
	{/if}

	{#if sourceLoading}
		<div class="flex h-64 items-center justify-center" aria-busy="true">
			<div class="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-500 dark:border-gray-700"></div>
		</div>
	{:else if errorState}
		<div class="flex h-64 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
			{$i18n.t('Couldn’t load this data')}
		</div>
	{:else if empty}
		<div class="flex h-64 items-center justify-center text-sm text-gray-400">{$i18n.t('No data')}</div>
	{:else}
		<div class="relative h-64" role="img" aria-label={title ?? chartType}>
			{#if !ChartCtor}
				<div class="absolute inset-0 flex items-center justify-center" aria-busy="true">
					<div class="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-500 dark:border-gray-700"></div>
				</div>
			{/if}
			<canvas bind:this={canvas}></canvas>
		</div>
		<span class="sr-only">
			{data.series.map((s) => `${s.name}: ${s.values.join(', ')}`).join('; ')}
		</span>
	{/if}
</div>
