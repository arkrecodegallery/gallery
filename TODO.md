-   Add bonds

    -   need to fix the animations so you can see the whole thing

-   Figure out unused AXXXX files

-   Disable BG animations when cutscene is going
	
-   Need to somehow incorperate bonds that are only images

-   Fix the cache

-   Fix Camera Controls

    -   Scroll percentage meter would be nice
    -   Particularly buggy with skills

# Stretch

-   favorites & blocks/banned characters
-   backgrounds
-   keyboard remapping

# Known Bugs

-   TwoColorTint doesn't seem to work
    -   Multiply and Screen show up as pure white with no alpha
    -   Present in 56 and 129
-   Animation broken
    -   Only some parts of the model are animated
    -   Present in 56

# Interesting Files

-   SkeletonMecanim
    -   initialSkinName
-   SkeletonUtilityBone
-   UIInterActiveAnimatorControl
    -   OverrideAnimationStates
    -   DefaultAnimationStates
-   SpineInterActiveSkeletonOverride
    -   PressedParam
-   Icon*Head*{B,M,L}

https://esotericsoftware.com/spine-api-reference
https://katyscode.wordpress.com/2021/02/23/il2cpp-finding-obfuscated-global-metadata/
https://hex-rays.com/pricing?section=individuals


# Revised Extractor

## Notes

_LoveTalk (seems odd, look into removing _LoveTalk suffix and Icon_AXXXX_LoveTalk images as they are very consistent and can help fill in holes)

RoleCollection.txt contains every reference to every image the character is in

- All bonds are not recorded in RoleCollection.txt
	- Some are exclusive to Artifact.txt
	- 3&4 star artifacts do not have animations, only pictures
		- How to display this?
		- Characters can have more than 1 bond
		- Reimagine the UI?
			- Press a character for view, then number for precise "model" within that?

- H060 
    - Might have broken in recent update, but `Assets/Game/Cutscene/H060_CutScene/Spine` contains the only valid copy of the mat file

- DialogTV
	- If a hero has no mat, chances are they are in some weird promo stage? 
	- e.g. Hero/H004/H004_DialogTV.prefab
		- Was the only correct copy of the hero, should be moved to Hero/H004/H004/

- H112 bond incorrect
	- May need to do additional lookup in Artifact.txt for the correct model
		- ID is indeed A0162, but model is for some reason A0165
	- This case was correct in RoleCollection.txt but not Role.txt
	- Some bonds even missing from RoleCollection.txt, for no real reason
		- Probably most efficient to make 

- Make record of missing models
	- Iterating over heros in Role.txt, which should exist but do not or have errors
		- Ideally have separate show for skel does not exist vs just mat does not exist
	- Any hero that should have a skill but doesn't (4 or more stars)
	- Any hero that should have a bond but doesn't
	- Any hero who's collection image is missing (e.g. CG/Story files)
	- Any hero who has a listing in RoleCollection that I don't catch
		- e.g. I automatically exclude skels assuming that they are only bonds that are already viewable elsewhere, if there is a skel that is in the collection but not caught by me, it should be flagged
	- Any artifact that isn't attached to a hero or viewable in some way

- Other files of interest
	- AudioClip
	- BoxCollider
	- RectTransform
	- VideoClip

# Position and Scale

- After exporting the entire cache and then loading the dump again, a lot of new information is available??
    - Can see all the rect transforms??
    - Did I accidentally add in the assets and scripts????
    - Apparently due to exporting assembly folder (incorrectly)

```
RectTransform Base
	PPtr<GameObject> m_GameObject
		int m_FileID = 0
		SInt64 m_PathID = 4966307827573266239
	Quaternionf m_LocalRotation
		float x = 0
		float y = 0
		float z = 0
		float w = 1
	Vector3f m_LocalPosition
		float x = 0
		float y = 0
		float z = 0
	Vector3f m_LocalScale
		float x = 1
		float y = 1
		float z = 1
	vector m_Children
		Array Array
		int size = 0
	PPtr<Transform> m_Father
		int m_FileID = 0
		SInt64 m_PathID = 1922776752137639743
	Vector2f m_AnchorMin
		float x = 0.5
		float y = 0.5
	Vector2f m_AnchorMax
		float x = 0.5
		float y = 0.5
	Vector2f m_AnchoredPosition
		float x = 695
		float y = 3.01
	Vector2f m_SizeDelta
		float x = 344.034
		float y = 396.37
	Vector2f m_Pivot
		float x = 0.5
		float y = 0.5
```