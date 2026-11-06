// How many modal dialogs are open. While one is, timer input is off (`App.svelte`): Space or
// Enter on a dialog button, or a pad press, must not also start or split the timer.

export const modals = $state({ open: 0 });
