<script lang="ts">
	import { parseIntelligentUI } from '$lib/intelligent-ui/adapter';
	import Metric from '$lib/intelligent-ui/components/Metric.svelte';
	import Comparison from '$lib/intelligent-ui/components/Comparison.svelte';
	import Table from '$lib/intelligent-ui/components/Table.svelte';
	import IntelligentUIFallback from '$lib/intelligent-ui/components/IntelligentUIFallback.svelte';

	export let token: any;
	export let done: boolean = true;
	export let id: string = '';

	$: outcome = parseIntelligentUI({
		version: token?.attributes?.v,
		content: token?.text ?? ''
	});

	$: if (!outcome.ok && token?.text) {
		// Developer-facing only; never surfaced as an exception to the user.
		console.debug('[intelligent-ui] fallback:', outcome.reason);
	}
</script>

{#if outcome.ok}
	{#if outcome.node.type === 'metric'}
		<Metric
			label={outcome.node.label}
			value={outcome.node.value}
			description={outcome.node.description}
		/>
	{:else if outcome.node.type === 'comparison'}
		<Comparison title={outcome.node.title} items={outcome.node.items} />
	{:else if outcome.node.type === 'table'}
		<Table title={outcome.node.title} columns={outcome.node.columns} rows={outcome.node.rows} />
	{/if}
{:else}
	<IntelligentUIFallback content={token?.text ?? ''} reason={outcome.reason} />
{/if}
