export type Map = Record<string, Entry>;

export interface Entry {
	id: string;
	details: Details;

	hero: Bundle;
	alt?: Bundle;
	skill?: Bundle;
	bond?: BondPresentation[];

	collection?: string[];
}

export type BondPresentation =
	| { kind: "animated"; bundle: Bundle; motions: string[] }
	| { kind: "stills"; images: string[] };

export interface Details {
	name: string;
	stars: string;
	element: string;
	job: string;
	constellation: string;
	cup_size: string;
	birthday: string;
	height: string;
	weight: string;
}

export interface Bundle {
	skel: string;
	atlas: string;
}

export type ModelView = "hero" | "alt" | "skill" | "bond" | "collection";

export type Animation = {
	trackIndex: number;
	animationName: string;
	loop: boolean;
};

export type UIState = "visible" | "minimal" | "hidden";