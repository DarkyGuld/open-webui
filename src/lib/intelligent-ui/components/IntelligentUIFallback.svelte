<script lang="ts">
	// Safe fallback: never break the chat. Renders the raw payload as plain text
	// (no HTML, no scripts) with a subtle note. Internal reasons are not shown.
	export let content: string = '';
	export let reason: string | undefined = undefined;
</script>

<div
	class="my-3 rounded-xl border border-dashed border-gray-200 px-4 py-3 dark:border-gray-800"
	role="note"
	aria-label="Intelligent UI unavailable"
>
	<div class="text-xs text-gray-400 dark:text-gray-500">Intelligent UI unavailable</div>
	{#if content}
		<pre
			class="mt-1 text-xs break-words whitespace-pre-wrap text-gray-500 dark:text-gray-400">{content}</pre>
	{/if}
	{#if reason}
		<!-- developer-facing detail; kept in DOM for debugging but visually muted -->
		<div class="sr-only" data-intelligent-ui-reason>{reason}</div>
	{/if}
</div>
