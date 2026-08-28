import {
	SkeletonBinary,
	RegionAttachment,
	MeshAttachment,
	BoundingBoxAttachment,
	PathAttachment,
	PointAttachment,
	ClippingAttachment,
	type SkeletonData,
} from "@esotericsoftware/spine-core";

// Atlas-free stub: only animation timelines/names are needed, not rendering,
// so attachments get a dummy 0-1 UV region instead of a real atlas lookup.
const stubAttachmentLoader: any = {
	newRegionAttachment: (_skin: any, name: string, path: string) => {
		const region = new RegionAttachment(name, path);
		region.region = { u: 0, v: 0, u2: 1, v2: 1 } as any;
		return region;
	},
	newMeshAttachment: (_skin: any, name: string, path: string) => {
		const mesh = new MeshAttachment(name, path);
		mesh.region = { u: 0, v: 0, u2: 1, v2: 1 } as any;
		return mesh;
	},
	newBoundingBoxAttachment: (_skin: any, name: string) =>
		new BoundingBoxAttachment(name),
	newPathAttachment: (_skin: any, name: string) => new PathAttachment(name),
	newPointAttachment: (_skin: any, name: string) => new PointAttachment(name),
	newClippingAttachment: (_skin: any, name: string) =>
		new ClippingAttachment(name),
};

/** Parses a raw .skel binary directly, without needing a matching atlas/texture. */
export function parseSkeletonBinary(bytes: Uint8Array): SkeletonData {
	const binary = new SkeletonBinary(stubAttachmentLoader);
	return binary.readSkeletonData(bytes);
}
