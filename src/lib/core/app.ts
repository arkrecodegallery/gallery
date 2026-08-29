import {
	AnimationState,
	AnimationStateData,
	AtlasAttachmentLoader,
	BlendMode,
	Color,
	ResizeMode,
	Skeleton,
	SkeletonBinary,
	SkeletonData,
	Vector2,
	type SpineCanvas,
	type SpineCanvasApp,
} from "@esotericsoftware/spine-webgl";
import { store } from "$lib/hooks/state.svelte";
import { CameraController } from "$lib/core/cameraController";

export class App implements SpineCanvasApp {
	skeletonData!: SkeletonData;
	skeleton!: Skeleton;
	animation!: AnimationState;

	loadAssets(canvas: SpineCanvas): void {
		const entry = store.modelState.heroSelection.getAbsoluteEntry();
		store.assetManager.loadModel(
			canvas,
			entry,
			store.view,
			store.modelState.heroSelection.cycleIndex,
			(loading) => {
				store.loading = loading;
			}
		);
	}

	initialize(canvas: SpineCanvas) {
		this.loadModel(canvas);
		this.configureScene(canvas);
	}

	loadModel(canvas: SpineCanvas) {
		const atlasLoader = new AtlasAttachmentLoader(
			store.assetManager.getAtlas(canvas)
		);
		const skeletonBinary = new SkeletonBinary(atlasLoader);
		skeletonBinary.scale = 1;
		this.skeletonData = skeletonBinary.readSkeletonData(
			store.assetManager.getSkeleton(canvas)
		);
		store.skeletonData = this.skeletonData;
		this.skeleton = new Skeleton(this.skeletonData);

		for (const s of this.skeleton.slots) {
			if (
				s.data.blendMode === BlendMode.Multiply ||
				s.data.blendMode === BlendMode.Screen
			) {
				s.data.color = new Color(1, 1, 1, 0.05);
			}
		}
	}

	configureScene(canvas: SpineCanvas) {
		const animationStateData = new AnimationStateData(this.skeletonData);
		this.animation = new AnimationState(animationStateData);
		this.animation.addListener({
			complete: (entry) =>
				store.modelState.frameSync.handleBondAnimationComplete(entry, this.animation),
		});

		this.setSkin();
		this.setAnimation();
		this.centerModel(canvas);

		new CameraController(store.canvasElement, canvas.renderer.camera, {
			maxZoom: canvas.renderer.camera.zoom,
		});
	}

	setSkin() {
		store.modelState.skinState.calculateSkin(store.view, store.skeletonData);
		this.skeleton.setSkinByName(store.modelState.skinState.getSkin());
		this.skeleton.setSlotsToSetupPose();
		this.skeleton.updateWorldTransform();
	}

	setAnimation() {
		const seenTracks = new Set<number>();
		store.modelState.frameSync
			.getAnimation(this.skeletonData, this.animation, this.skeleton)
			.forEach(({ trackIndex, animationName, loop }) => {
				if (seenTracks.has(trackIndex)) {
					this.animation.addAnimation(trackIndex, animationName, loop);
				} else {
					seenTracks.add(trackIndex);
					this.animation.setAnimation(trackIndex, animationName, loop);
				}
			});
	}

	centerModel(canvas: SpineCanvas) {
		const offset = new Vector2();
		const size = new Vector2();
		this.skeleton.getBounds(offset, size);

		this.skeleton.x = -(offset.x + size.x / 2);
		this.skeleton.y = -(offset.y + size.y / 2);
		this.skeleton.updateWorldTransform();

		const screenWidth = window.innerWidth;
		const screenHeight = window.innerHeight;
		const scale =
			Math.max(size.x / screenWidth, size.y / screenHeight) * 1.1;

		const camera = canvas.renderer.camera;
		camera.position.set(0, 0, 0);
		camera.zoom = scale;
	}

	update(canvas: SpineCanvas, delta: number) {
		if (store.modelState.updateFlags.hasSkinUpdate()) {
			this.setSkin();
		}

		if (store.modelState.updateFlags.hasAnimationUpdate()) {
			this.setAnimation();
		}

		if (store.modelState.updateFlags.hasModelUpdate()) {
			this.reloadModel(canvas);
		}

		this.animation.update(delta);
		this.animation.apply(this.skeleton);
		this.skeleton.updateWorldTransform();

		store.modelState.frameSync.syncFrame(this.animation);
	}

	async reloadModel(canvas: SpineCanvas) {
		this.loadAssets(canvas);
		await canvas.assetManager.loadAll();
		this.initialize(canvas);
	}

	render(canvas: SpineCanvas) {
		const renderer = canvas.renderer;
		renderer.resize(ResizeMode.Expand);
		canvas.clear(0.1, 0.1, 0.1, 1);

		renderer.begin();
		renderer.drawSkeleton(this.skeleton, true);
		renderer.end();
	}
}
