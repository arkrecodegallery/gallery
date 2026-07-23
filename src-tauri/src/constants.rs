macro_rules! declare_consts {
    ($($name:ident = $value:expr),* $(,)?) => {
        $(
            pub const $name: &str = $value;
        )*
    }
}

declare_consts! {
    FILE_ASSETS_XML = "assets.xml",
    DIR_CONTAINERS = "containers/",
    DIR_GENERATED = "generated/",
    FILE_MAP = "map.json",
    FILE_MISSING = "missing.json",

    DIR_ASSETS = "Assets/Game/",
    DIR_STATIC_DATA = "StaticData/",

    FILE_ARTIFACT = "Artifact.txt",
    FILE_ENG = "Text/ENG.txt",
    FILE_ROLE = "Role.txt",
    FILE_ROLE_COLLECTION = "RoleCollection.txt",
    FILE_SKILL = "Skill.txt",

    DETAIL_NAME = "NAME",
    DETAIL_STARS = "InitStar",
    DETAIL_ELEMENT = "Element",
    DETAIL_JOB = "Job",
    DETAIL_CONSTELLATION = "Constellation",
    DETAIL_CUP_SIZE = "CupSize",
    DETAIL_BIRTHDAY = "Birthday",
    DETAIL_HEIGHT = "Height",
    DETAIL_WEIGHT = "Weight",

    FIELD_ID = "ID",
    FIELD_ROLE_ID = "RoleID",
    FIELD_PREFAB = "Prefab",
    FIELD_ROLE_MOTIONS = "RoleMotions",
    FIELD_DYNAMIC = "DynamicField"
}
