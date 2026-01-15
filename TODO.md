-   Add bonds

    -   need to fix the animations so you can see the whole thing

-   Disable BG animations when cutscene is going
	
-   Need to somehow incorperate bonds that are only images

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

- Fix table icons

- Import latest data
	- Use adb to rule out errors
	- Don't have open app during to mitigate lock files
	- Make rules for data that needs to be copied / moved
		- H060 in Cutscene?
		- H004 in DialogTV?

- Discrepancies appear between Role.txt and RoleCollection.txt in reference to bonds, and either may be correct or incorrect
	- Only solution is a rule really
	- Could be helped out by the missing.json flagging bonds with conflicting entries
	- H613 A0413
	- H173 A0338

- Fake bonds
	- Bonds that aren't animated but instead a collection of images
	- A0054 displays this trait
		- look on wiki to see more that this applies to
	- _1, _2, etc. are a good indication
		- also has a role_motions entry
	- sometimes in odd locations

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