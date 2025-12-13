macro_rules! declare_consts {
    ($($name:ident = $value:expr),* $(,)?) => {
        $(
            pub const $name: &str = $value;
        )*
    }
}

pub const MIN_HERO_ID: usize = 1;
pub const MAX_HERO_ID: usize = 999;

declare_consts! {
    DIR_GALLERY_DATA = "../static/gallery-data/",
    FILE_ASSETS_XML = "assets.xml",
    DIR_CONTAINERS = "containers/",
    FILE_MAP = "map.json",

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

    FIELD_DYNAMIC = "DynamicField",
    CONNECT_ARTIFACT = "ConnectArtifact",
}
