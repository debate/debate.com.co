<script lang="ts">
  import Flow from "./Flow.svelte";
  import Title from "./Title.svelte";
  import BoxControl from "./BoxControl.svelte";
  import ButtonBar from "./ButtonBar.svelte";
  import DebateDictionary from "./DebateDictionary.svelte";
  import Error from "./Error.svelte";
  import Settings from "./Settings.svelte";
  import SortableList from "./SortableList.svelte";
  import AddTab from "./AddTab.svelte";
  import Tab from "./Tab.svelte";
  import { openPopup } from "./models/popup";
  import SavedFlows from './SavedFlows.svelte';
	import { savedFlowsDatas } from './models/autoSave';


  import type { Flow as FlowType, Box } from "./models/type";
  import { onDestroy, onMount } from "svelte";
  import {
    activeMouse,
    flowsChange,
    flows,
    selected,
    subscribeFlowsChange,
    isSharing,
  } from "./models/store";
  import { boxFromPath, newFlow } from "./models/flow";
  import { History } from "./models/history";
  import { createKeyDownHandler } from "./models/key";
  import { maybeStartSharing, stopSharing } from "./models/sharing";
  import { loadFlows } from "./models/file";
  import Timers from "./Timers.svelte";
  import SavedFlowsPopup from "./SavedFlowsPopup.svelte";
//   import Fireworks from "./TimerFireworks.svelte";

  let fireworksComponent;

  function launchFireworks() {
    // if (fireworksComponent) 
    //   fireworksComponent.play();
  }

  let destroyers: (() => void)[] = [];

  let changesSaved = true;
  subscribeFlowsChange(() => {
    changesSaved = false;
  });
  $: unsavedChanges = $flows.length > 0 && !changesSaved;
  let showAllFlowsToggle;
  $: showAllFlowsToggle = true;

  onMount(() => {
    window.addEventListener(
      "dragover",
      function (e) {
        e.preventDefault();
      },
      false
    );
    window.addEventListener(
      "drop",
      function (e) {
        e.preventDefault();
      },
      false
    );
    // changes you made may not be saved
    window.addEventListener("beforeunload", function (e) {
      if (unsavedChanges && !dev) {
        let confirmationMessage = "Are you sure you want to leave?";
        e.returnValue = confirmationMessage;
        return confirmationMessage;
      }
    });
  });
  onDestroy(() => {
    destroyers.forEach((destroy) => destroy());
  });

  function clickTab(index: number) {
    blurFlow();
    $selected = index;
    focusFlow();
  }
  function focusFlow() {
    let lastFocus = boxFromPath<FlowType, Box>(
      $flows[$selected],
      $flows[$selected]?.lastFocus
    );
    if (lastFocus == null) {
      lastFocus = $flows[$selected];
    }
    lastFocus.focus = true;
    $flows = $flows;
  }

  
  function blurFlow() {
    if ($flows.length > 0) {
      let lastFocus = boxFromPath<FlowType, Box>(
        $flows[$selected],
        $flows[$selected].lastFocus
      );
      if (!lastFocus) {
        lastFocus = $flows[$selected];
      }
      lastFocus.focus = false;
      $flows = $flows;
      (document.activeElement as HTMLElement).blur();
    }
  }

  function addFlow(type: "primary" | "secondary") {
    blurFlow();
    let flow = newFlow($flows.length, type, switchSpeakers);
    if (flow == null) return;
    $flows.push(flow);
    $selected = $flows.length - 1;
    $flows = $flows;
    flowsChange();
  }


  async function deleteFlow(index: number) {
    blurFlow();
    $flows.splice(index, 1);
    if (index == 0) {
      $selected = 0;
    } else {
      $selected = index - 1;
    }
    // fix indices
    for (let i = index; i < $flows.length; i++) {
      $flows[i].index = i;
    }
    $flows = $flows;
    flowsChange();
    if ($flows.length > 0) {
      focusFlow();
    }
  }

  function handleSort(e: { detail: { from: number; to: number } }) {
    let { from, to } = e.detail;
    let selectedId = $flows[$selected].id;
    let newFlows = [...$flows];
    // add to to if needed
    if (from > to) {
      to += 1;
    }
    let flow = newFlows.splice(from, 1)[0];
    newFlows.splice(to, 0, flow);
    // fix indices
    for (let i = 0; i < newFlows.length; i++) {
      newFlows[i].index = i;
    }

    $flows = newFlows;
    flowsChange();
    $selected = $flows.findIndex((flow) => flow.id == selectedId);
  }

  function handleMouseMove(e: MouseEvent) {
    $activeMouse = true;
  }
  const keyDownHandler = createKeyDownHandler({
    control: {
      n: { handle: () => addFlow("primary") },
    },
    "control shift": {
      n: { handle: () => addFlow("secondary") },
    },
    "commandControl shift": {
      z: {
        handle: () => {
          $flows[$selected].history.redo();
        },
        require: () => $flows.length > 0,
        stopRepeat: false,
      },
    },
    commandControl: {
      z: {
        handle: () => $flows[$selected].history.undo(),
        require: () => $flows.length > 0,
        stopRepeat: false,
      },
      Enter: {
        handle: () => {
        },
        stopRepeat: false,
      }
	},
    "commandControl alt": {
      ArrowUp: {
        handle: () => {
          let newSelected =
            $selected - 1 < 0 ? $flows.length - 1 : $selected - 1;
          clickTab(newSelected);
        },
        require: () => $flows.length > 0,
        stopRepeat: false,
      },
      ArrowDown: {
        handle: () => {
          let newSelected = $selected + 1 >= $flows.length ? 0 : $selected + 1;
          clickTab(newSelected);
        },
        require: () => $flows.length > 0,
        stopRepeat: false,
      },
    },
  });
  function handleKeydown(e: KeyboardEvent) {
    $activeMouse = false;
    keyDownHandler(e);
  }

  function readUploadDragged(e: DragEvent) {
    e.preventDefault();
    let file = e?.dataTransfer?.files[0];
    if (file == undefined) {
      return;
    }

    let reader: FileReader = new FileReader();
    reader.onload = function (fileLoadedEvent) {
      let uploadData = fileLoadedEvent.target?.result;
      if (uploadData == undefined) return;
      handleUpload(uploadData.toString());
    };
    // check if can readAsText
    if (file.type == "text/plain") {
      reader.readAsText(file, "UTF-8");
    } else if (file.type == "application/json") {
      reader.readAsText(file, "UTF-8");
    } else {
      openPopup(Error, "File Error", {
        props: { message: "Invalid file" },
      });
    }
  }
  function readUpload() {
    const files = (<HTMLInputElement>document.getElementById("uploadId"))
      ?.files;
    if (files == undefined) return;
    let file = files[0];

    let reader: FileReader = new FileReader();
    reader.onload = function (fileLoadedEvent) {
      let uploadData = fileLoadedEvent.target?.result;
      if (uploadData == undefined) return;
      handleUpload(uploadData.toString());
    };
    reader.readAsText(file, "UTF-8");
  }
  function preventDefault(e: { preventDefault: () => void }) {
    e.preventDefault();
  }

  function showAllFlows(){
	alert(2)
	$flows = $flows;

  }

  async function handleUpload(data: string) {
    let rawFlows: unknown[];
    let newFlows: FlowType[] | null = null;
    try {
      newFlows = loadFlows(data);
    } catch (e) {
      openPopup(Error, "File Error", {
        props: { message: "Invalid file" },
      });
    }
    if (newFlows != null) {
      if (
        !unsavedChanges ||
        confirm("Are you sure you want to overwrite your current flows?")
      ) {
        $flows = newFlows;
        $selected = 0;
      }
    }
  }

  let switchSpeakers = false;

  // TODO:
  // add tab switch keyboard shortcut
  // add cross out
  // add command K
  // add command f
  // add capitalization
</script>

<main class:activeMouse class="palette-plain">
  <input id="uploadId" type="file" hidden on:change={readUpload} />
  <div class="grid grid-cols-[var(--sidebar-width)_1fr] gap-[var(--gap)] p-[var(--main-margin)] w-full h-full box-border relative" class:grid-cols-[var(--sidebar-width)_auto]={$flows.length == 0}>
    <div class="bg-[var(--background)] w-full h-[var(--main-height)] rounded-[var(--border-radius)] p-[var(--padding)] flex flex-col box-border">
      <div class="h-auto pb-[var(--padding)]">
        <ButtonBar
          resize
          buttons={[
            {
              icon: "home",
              onclick: () => openPopup(SavedFlowsPopup, "File"),
              tooltip: "download & upload file",
              tutorialHighlight: 3,
            },
            {
              icon: "gear",
              onclick: () => openPopup(Settings, "Settings"),
              tooltip: "settings",
              tutorialHighlight: 2,
            },
            {
              icon: "question-circle",
              onclick: () => openPopup(DebateDictionary, ""),
              tooltip: "Debate Terms Dictionary",
              tutorialHighlight: 3,
            }
          ]}
        />
      </div>

      <div class="overflow-y-auto flex-grow box-border relative">
        <div class="p-0 m-0 pt-0 pb-[calc(var(--view-height)*0.6)]">
          <SortableList list={$flows} key="id" on:sort={handleSort} let:index>
            <Tab
              on:click={() => clickTab(index)}
              bind:flow={$flows[index]}
              selected={index == $selected}
            />
          </SortableList>
          <AddTab {addFlow} bind:switchSpeakers />
        </div>
      </div>
      <div class="timer">
        <Timers {launchFireworks} />
      </div>
    </div>

    {#if $flows.length > 0 && $flows[$selected]}
      <div class="flex flex-col h-full">
        <div class="flex items-center h-[var(--title-height)] mb-[var(--gap)] space-x-[var(--gap)]">
          <div class="bg-[var(--background)] rounded-[var(--border-radius)] h-full px-[var(--padding)] flex items-center justify-end overflow-x-auto flex-shrink-0">
            <BoxControl bind:flow={$flows[$selected]} />
          </div>
          <div class="bg-[var(--background)] rounded-[var(--border-radius)] flex-grow h-full min-w-0 flex items-center px-[var(--padding)]">
            <Title
              bind:content={$flows[$selected].content}
              bind:children={$flows[$selected].children}
              bind:focus={$flows[$selected].focus}
              bind:invert={$flows[$selected].invert}
              deleteSelf={() => deleteFlow($selected)}
            />
          </div>
        </div>
        <div class="bg-[var(--background)] flex-grow overflow-auto rounded-[var(--border-radius)]">
          <Flow on:focusFlow={focusFlow} bind:root={$flows[$selected]} />
        </div>
      </div>
    {:else}
      <div class="relative w-full h-[var(--main-height)]">
        <SavedFlows savedFlowsDatas={$savedFlowsDatas} />
      </div>
    {/if}
  </div>
</main>

<style>
  /* Hide scrollbar for Chrome, Safari and Opera */
  .overflow-y-auto::-webkit-scrollbar,
  .overflow-x-auto::-webkit-scrollbar,
  .overflow-auto::-webkit-scrollbar {
    display: none;
  }
  /* Hide scrollbar for IE, Edge and Firefox */
  .overflow-y-auto,
  .overflow-x-auto,
  .overflow-auto {
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
  }
</style>