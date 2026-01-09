import { Input, OrthoCamera, Vector3 } from "@esotericsoftware/spine-webgl";
import { clamp } from "../utils";

interface Options {
	maxZoom: number;
}

export class CameraController {
	private readonly canvas: HTMLElement;
	private readonly camera: OrthoCamera;
	private readonly options: Options;

	private cameraX = 0;
	private cameraY = 0;
	private cameraZoom = 0;
	private initialZoom = 0;

	private mouseX = 0;
	private mouseY = 0;

	private lastX = 0;
	private lastY = 0;

	constructor(canvas: HTMLElement, camera: OrthoCamera, options: Options) {
		this.canvas = canvas;
		this.camera = camera;
		this.options = options;

		new Input(canvas).addListener({
			up: this.up.bind(this),
			down: this.down.bind(this),
			dragged: this.dragged.bind(this),
			moved: this.moved.bind(this),
			wheel: this.wheel.bind(this),
			zoom: this.zoom.bind(this),
		});
	}

	private up(x: number, y: number) {
		this.lastX = x;
		this.lastY = y;
	}
	private down(x: number, y: number) {
		this.cameraX = this.camera.position.x;
		this.cameraY = this.camera.position.y;
		this.mouseX = this.lastX = x;
		this.mouseY = this.lastY = y;
		this.initialZoom = this.camera.zoom;
	}

	private dragged(x: number, y: number) {
		const deltaX = x - this.mouseX;
		const deltaY = y - this.mouseY;
		const originWorld = this.camera.screenToWorld(
			new Vector3(0, 0),
			this.canvas.clientWidth,
			this.canvas.clientHeight
		);
		const deltaWorld = this.camera
			.screenToWorld(
				new Vector3(deltaX, deltaY),
				this.canvas.clientWidth,
				this.canvas.clientHeight
			)
			.sub(originWorld);
		this.camera.position.set(
			this.cameraX - deltaWorld.x,
			this.cameraY - deltaWorld.y,
			0
		);
		// this.clampCamera();

		this.lastX = x;
		this.lastY = y;
	}
	private moved(x: number, y: number) {
		this.lastX = x;
		this.lastY = y;
	}

	private wheel(delta: number) {
		const zoomSpeed = -0.001;
		const prevZoom = this.camera.zoom;
		const newZoom = Math.max(prevZoom - delta * zoomSpeed, 0.05);
		// this.options.maxZoom
		// );

		const mouseWorldBefore = this.camera.screenToWorld(
			new Vector3(this.lastX, this.lastY),
			this.canvas.clientWidth,
			this.canvas.clientHeight
		);

		this.camera.zoom = newZoom;
		this.camera.update();

		const mouseWorldAfter = this.camera.screenToWorld(
			new Vector3(this.lastX, this.lastY),
			this.canvas.clientWidth,
			this.canvas.clientHeight
		);

		this.camera.position.add(mouseWorldBefore.sub(mouseWorldAfter));
		this.camera.update();
		// this.clampCamera();
	}
	private zoom(initialDistance: number, distance: number) {
		const newZoom = initialDistance / distance;
		// this.camera.zoom = Math.min(
		// 	this.initialZoom * newZoom,
		// 	this.options.maxZoom
		// );
		this.camera.zoom = this.initialZoom * newZoom;
	}

	private clampCamera() {
		const halfViewWidth = this.canvas.clientWidth / 2;
		const halfViewHeight = this.canvas.clientHeight / 2;

		this.camera.position.x = clamp(
			this.camera.position.x,
			-halfViewWidth,
			halfViewWidth
		);
		this.camera.position.y = clamp(
			this.camera.position.y,
			-halfViewHeight,
			halfViewHeight
		);

		this.camera.update();
	}
}
