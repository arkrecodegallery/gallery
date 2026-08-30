import { HeroSelection } from "./heroSelection.svelte";
import { ModelNavigation } from "./modelNavigation";
import { CheckboxAnimationState } from "./checkboxAnimations.svelte";
import { ModelFrameSync } from "./modelFrameSync";
import { ModelInputHandler } from "./modelInput";
import { UpdateFlags } from "./updateFlags";
import { BondViewState } from "./bondViewState.svelte";
import { BondSequenceActions } from "./bondSequenceActions";
import { BondAutoPlay } from "./bondAutoPlay";
import { HeroViewState } from "./heroViewState.svelte";
import { SkillViewState } from "./skillViewState.svelte";
import { SkinState } from "./skinState.svelte";

export class ModelState {
	public readonly heroSelection = new HeroSelection();
	public readonly skinState = new SkinState();
	public readonly skillView = new SkillViewState();
	public readonly bond = new BondViewState();
	public readonly heroAnimation = new HeroViewState();
	public readonly checkboxAnimations = new CheckboxAnimationState();
	public readonly updateFlags = new UpdateFlags();

	private readonly bondActions = new BondSequenceActions(this.bond);
	private readonly bondAutoPlay = new BondAutoPlay(this.bond, this.bondActions, () => {
		this.updateFlags.requestAnimationUpdate();
		this.updateFlags.requestSkinUpdate();
	});

	public readonly navigation = new ModelNavigation(
		this.heroSelection,
		this.skinState,
		() => this.updateFlags.requestModelUpdate()
	);

	public readonly frameSync = new ModelFrameSync(
		this.bond,
		this.bondActions,
		this.bondAutoPlay,
		this.heroAnimation,
		this.skillView,
		this.heroSelection,
		this.checkboxAnimations
	);

	public readonly input = new ModelInputHandler(
		this.skinState,
		this.heroAnimation,
		this.skillView,
		this.bondActions,
		this.frameSync,
		this.heroSelection,
		this.checkboxAnimations,
		this.updateFlags,
		this.navigation
	);
}
