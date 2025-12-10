export interface HeroData {
	Name: string;
	Avatar: string;
	ID: string;
	Stars: string;
	Attribute: string;
	Class: string;
	Constellation: string;
	Birthday: string;
	Bust: string;
	Height: string;
	Weight: string;
}

export interface BondData {
	Name: string;
	Member: string;
	ID: string;
	Stars: string;
	Class: string;
}

export interface LoveLinkData {
	Name: string;
	"Image 1"?: string;
	"Image 2"?: string;
	"Image 3"?: string;
}

export type ModelView =
	| "hero"
	| "alt"
	| "skill"
	| "bond"
	| "loveLink1"
	| "loveLink2"
	| "loveLink3";

export type Animation = {
	trackIndex: number;
	animationName: string;
	loop: boolean;
};

export type Data = HeroData & {
	alt: string;
	skill: string;
	bond: string;
	loveLinks: string[];
};
