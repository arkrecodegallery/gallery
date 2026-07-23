import { platform } from "$platform";

class SetupState {
	setup: boolean = $state(!platform.setup);
}

export const setupState = new SetupState();
