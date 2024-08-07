<script lang="ts">
	import Button from './Button.svelte';
	import { debateStyleMap, debateStyles } from './models/debateStyle';
	import { settings } from './models/settings';
	import { onDestroy, onMount } from 'svelte';

	export let addFlow: (type: 'primary' | 'secondary') => void;
	export let switchSpeakers: boolean;

	let debateStyleIndex = settings.data['debateStyle'].value as number;
	onDestroy(
		settings.subscribe(['debateStyle'], (key: string) => {
			debateStyleIndex = settings.data[key].value as number;
		})
	);
	$: debateStyle = debateStyles[debateStyleMap[debateStyleIndex]];

	$: hasSwitch = debateStyle.primary.columnsSwitch != null;
</script>

<div class="addTab" class:hasSwitch class:switch={switchSpeakers}>
	<div class="buttons">
			<Button
				text={debateStyle.primary.name}
				palette="accent"
				icon="add"
				on:click={() => addFlow('primary')}
				tooltip="create new {debateStyle.primary.name} flow"
				shortcut={['control', 'n']}
			/>
		{#if debateStyle.secondary != null}
				<Button
					text={debateStyle.secondary.name}
					palette="accent-secondary"
					icon="add"
					on:click={() => addFlow('secondary')}
					tooltip="create new {debateStyle.secondary.name} flow"
					shortcut={['control', 'shift', 'n']}
				/>
		{/if}
	</div>
	{#if debateStyle.secondary != null && hasSwitch}
		<div class="switch">
			<Button
				text={'first'}
				icon="arrowLeft"
				palette={switchSpeakers ? 'accent-secondary' : 'accent'}
				tooltip={switchSpeakers
					? `set ${debateStyle.primary.name} to first speaker`
					: `set ${debateStyle.secondary.name} to first speaker`}
				on:click={() => (switchSpeakers = !switchSpeakers)}
			/>
		</div>
	{/if}
</div>

<style>
	.buttons {
		display: flex;
		position: relative;
		flex-wrap: wrap;
		align-items: stretch;
		flex-direction: row;
		gap: var(--padding);
	}

	.hasSwitch .buttons {
		flex-direction: column;
	}
	.hasSwitch.switch .buttons {
		flex-direction: column-reverse;
	}
	.addTab.hasSwitch {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
	}
</style>
