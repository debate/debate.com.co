<script>
// @ts-nocheck

	import Sortable from 'sortablejs';
	import FileSystemItem from "./FileSystemItem.svelte";
	import {
		FolderPlus,
		Folder,
		FileText,
		FileImage,
		FileAudio,
		FileVideo,
		Upload,
		File,
		ArrowUpDown,
		ChevronsDown,
		ChevronsUp,
		Trash2,
		Search,
		X
	} from "lucide-svelte";
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
	} from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import {
		AlertDialog,
		AlertDialogAction,
		AlertDialogCancel,
		AlertDialogContent,
		AlertDialogDescription,
		AlertDialogFooter,
		AlertDialogHeader,
		AlertDialogTitle,
	} from "$lib/components/ui/alert-dialog";

	const fileIcons = {
		folder: Folder,
		text: FileText,
		image: FileImage,
		audio: FileAudio,
		video: FileVideo,
	};

	export let items = [ ];

	let nextId = 8;
	const getNextId = () => (nextId++).toString();

	let deleteConfirmOpen = false;
	let itemToDelete = null;
	let searchTerm = "";
	let filteredItems = [];

	// Filter the items based on the search term
	$: {
		if (searchTerm) {
			filteredItems = items.filter(item => 
				item.name.toLowerCase().includes(searchTerm.toLowerCase())
			);
			expandParents(filteredItems);
		} else {
			filteredItems = items;
		}
	}
	// Expand all parents of an item
	function expandParents(itemsToExpand) {
		const itemsToExpandSet = new Set(itemsToExpand.map(item => item.id));
		items = items.map(item => {
			if (itemsToExpandSet.has(item.id)) {
				let parentId = item.parentId;
				while (parentId) {
					const parentIndex = items.findIndex(i => i.id === parentId);
					if (parentIndex !== -1) {
						items[parentIndex].expanded = true;
						parentId = items[parentIndex].parentId;
					} else {
						break;
					}
				}
			}
			return item;
		});
	}
	// Clear the search term and show all items
	function clearSearch() {
		searchTerm = "";
		filteredItems = items;
	}
	// Scroll to an item in the tree
	function scrollToItem(itemId) {
		const element = document.querySelector(`[data-id="${itemId}"]`);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}

	// Rename an item in the tree
	function handleRename(itemId, newName) {
		items = items.map(item => 
			item.id === itemId ? { ...item, name: newName } : item
		);
	}
	
	// Initialize Sortable JS
	function initSortable(node) {
		new Sortable(node, {
			animation: 150,
			handle: '.handle',
			ghostClass: 'sortable-ghost',
			group: 'nested',
			onEnd: (evt) => {
				const itemEl = evt.item;
				const newParentEl = evt.to;
				const itemId = itemEl.getAttribute('data-id');
				const newParentId = newParentEl.getAttribute('data-parent-id');
				
				moveItem(itemId, newParentId);
			}
		});
	}
	// Move an item to a new parent
	function moveItem(itemId, newParentId) {
		const item = items.find(i => i.id === itemId);
		const newParent = items.find(i => i.id === newParentId);
		
		if (item && newParent && newParent.type === 'folder') {
			item.parentId = newParentId;
			newParent.expanded = true;

			if (item.type === 'folder') {
				moveChildren(item.id, newParentId);
			}

			items = items; // Trigger reactivity
		}
	}
	
	// Click a file in the tree
	const clickFile = function (itemId) {
		const item = items.find(i => i.id === itemId);
		
		alert(JSON.stringify(item))
	}


	
	// Move children recursively
	function moveChildren(parentId, newParentId) {
		items.forEach(item => {
			if (item.parentId === parentId) {
				item.parentId = newParentId;
				if (item.type === 'folder') {
					moveChildren(item.id, newParentId);// fix recuriove error
				}
			}
		});
	}
	// Add a new folder 
	function handleNewFolder(parentId) {
		const newFolder = { id: getNextId(), name: "New Folder", type: "folder", parentId, expanded: false };
		items = [...items, newFolder];
	}
	// Add a new file
	function handleNewFile(parentId, fileType = "text") {
		const newFile = { id: getNextId(), name: `New ${fileType} file`, type: fileType, parentId };
		items = [...items, newFile];
	}
	// Confirm the deletion
	function confirmDelete(item) {
		itemToDelete = item;
		deleteConfirmOpen = true;
	}

	// Delete the item and its children
	function handleDelete() {
		console.log(itemToDelete)
		if (itemToDelete) {
			items = items.filter(i => i.id !== itemToDelete.id && i.parentId !== itemToDelete.id);
			deleteConfirmOpen = false;
			itemToDelete = null;
			// Rebuild the tree after deletion
			items = (items);
		}
	}

	// Rebuild the tree after deletion
	function rebuildTree(items) {
		const itemMap = new Map(items.map(item => [item.id, { ...item, children: [] }]));
		const rootItems = [];

		for (const item of itemMap.values()) {
			if (item.parentId === null) {
				rootItems.push(item);
			} else {
				const parent = itemMap.get(item.parentId);
				if (parent) {
					parent.children.push(item);
				} else {
					rootItems.push(item);
				}
			}
		}

		return rootItems;
	}

	// Sort items based on the parent ID
	function handleSort(parentId) {
		const parentItems = items.filter(i => i.parentId === parentId);
		parentItems.sort((a, b) => a.name.localeCompare(b.name));
		items = items.map(item => parentItems.find(i => i.id === item.id) || item);
	}

	// Toggle the expanded state of a folder
	function toggleFolder(item) {
		items = items.map(i => i.id === item.id ? { ...i, expanded: !i.expanded } : i);
	}

	// Expand all folders
	function expandAll() {
		items = items.map(item => item.type === 'folder' ? { ...item, expanded: true } : item);
	}

	// Collapse all folders
	function collapseAll() {
		items = items.map(item => item.type === 'folder' ? { ...item, expanded: false } : item);
	}

	// Get the root items based on the parent ID
	$: rootItems = filteredItems.filter(item => item.parentId === null);

	// Get child items based on the parent ID
	function getChildItems(parentId) {
		return filteredItems.filter(item => item.parentId === parentId);
	}

	// Render the tree
	function renderItems(items) {
		return items.map(item => ({
			...item,
			children: item.type === 'folder' ? renderItems(getChildItems(item.id)) : []
		}));
	}

	// Rebuild the tree
	$: renderedItems = renderItems(rootItems);
</script>


<svelte:head>
	<title>Files</title>
	
</svelte:head>
<div class="container mx-auto p-4 space-y-8">
	<Card>
		<CardHeader>
			<div class="relative">
				<Search class="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
				<Input
					type="text"
					placeholder="Search files and folders..."
					bind:value={searchTerm}
					class="pl-8 pr-8"
				/>
				{#if searchTerm}
					<button
						class="absolute right-2 top-1/2 transform -translate-y-1/2"
						on:click={clearSearch}
					>
						<X class="h-4 w-4 text-gray-500" />
					</button>
				{/if}
			</div>
		</CardHeader>
		<CardContent>
			<div class="mb-4 flex space-x-2">
				<Button variant="outline" on:click={() => handleNewFolder(null)}>
					<FolderPlus class="mr-2 h-4 w-4" />
					Folder
				</Button>
				<Button variant="outline" on:click={() => handleNewFile(null)}>
					<File class="mr-2 h-4 w-4" />
					File 
				</Button>
				<Button variant="outline" on:click={() => handleNewFile(null, "image")}>
					<Upload class="mr-2 h-4 w-4" />
					Upload 
				</Button>
				<Button variant="outline" on:click={() => handleSort(null)}>
					<ArrowUpDown class="mr-2 h-4 w-4" />
					Sort
				</Button>
				<Button variant="outline" on:click={expandAll}>
					<ChevronsDown class="mr-2 h-4 w-4" />
					Expand All
				</Button>
				<Button variant="outline" on:click={collapseAll}>
					<ChevronsUp class="mr-2 h-4 w-4" />
					Collapse All
				</Button>
			</div>

			{#if searchTerm && filteredItems.length > 0}
				<div class="mb-4">
					<h3 class="text-lg font-semibold mb-2">Search Results:</h3>
					<ul class="space-y-1">
						{#each filteredItems as item}
							<li>
								<button
									class="text-blue-500 hover:underline"
									on:click={() => scrollToItem(item.id)}
								>
									{item.name}
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<div class="sortable-container space-y-2" use:initSortable data-parent-id="null">
				{#each renderedItems as item (item.id)}
					<FileSystemItem 
						{item} 
						{fileIcons} 
						{toggleFolder} 
						{handleNewFolder} 
						{handleNewFile} 
						{confirmDelete} 
						{handleRename}
						{initSortable}
						{clickFile}
					/>
				{/each}
			</div>
		</CardContent>
	</Card>
</div>

<AlertDialog bind:open={deleteConfirmOpen}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Are you sure you want to delete this item?</AlertDialogTitle>
			<AlertDialogDescription>
				This action cannot be undone. This will permanently delete the item
				{#if itemToDelete?.type === 'folder'}
					and all its contents.
				{/if}
			</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter class="sm:space-x-0 sm:space-y-2">
			<AlertDialogCancel class="w-full sm:w-auto">Cancel</AlertDialogCancel>
			<AlertDialogAction on:click={handleDelete} class="w-full sm:w-auto bg-gray-500 hover:bg-gray-600">
				<Trash2 class="mr-2 h-4 w-4" />
				Delete
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>

<style>
	:global(.sortable-ghost) {
		@apply opacity-50 border-2 border-blue-300;
	}
</style>