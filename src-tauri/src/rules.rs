use std::collections::{HashMap, HashSet};

macro_rules! collection {
    // map-like
    ($($k:expr => $v:expr),* $(,)?) => {{
        core::convert::From::from([$(($k, $v),)*])
    }};
    // set-like
    ($($v:expr),* $(,)?) => {{
        core::convert::From::from([$($v,)*])
    }};
}

pub struct Rules {
    // heros that have an abnormal file path
    hero: HashMap<&'static str, Vec<&'static str>>,
    // heros whose entire bundle lives under a non-Hero/ prefix
    hero_path_override: HashMap<&'static str, &'static str>,
    // define the pattern for the alt so it is caught
    alt: HashMap<&'static str, &'static str>,
    // names not defined in tables but understood through inference
    names: HashMap<&'static str, &'static str>,
    // extra heros not recorded in the role file
    extra: Vec<&'static str>,
    // patterns for images withing the role collection file
    collection: Vec<&'static str>,
    // heros whose atlas texture isn't next to its atlas/skel
    mat_source: HashMap<&'static str, &'static str>,
    // cg ids whose image actually lives under a sibling cg id's folder
    collection_redirect: HashMap<&'static str, &'static str>,
    // (container, file) skels permanently excluded from unused_skels noise
    suppress_skel: HashSet<(&'static str, &'static str)>,
    // cg ids permanently excluded from unused_cg noise
    suppress_cg: HashSet<&'static str>,
}

impl Rules {
    pub fn new() -> Self {
        Self {
            hero: collection! {
                "H003" => vec!["H003a", "H003b"],
            },
            hero_path_override: collection! {
                // official Hero/H060/H060/ copy's mat is unfixable; this is a
                // complete, working duplicate bundle from a boss cutscene
                "H060" => "Cutscene/H060_CutScene/Spine/",
            },
            alt: collection! {
                "H003" => ".*b(?:\\.|$)",
                "H118" => ".*_B(?:\\.|$)",
                "H120" => ".*_B(?:\\.|$)",
            },
            names: collection! {
                "H800" => "Mirabelle",
                "H801" => "Mina",
                "H802" => "Teddy",
            },
            extra: vec![
                "H800",
                "H801",
                "H802",
                // "H803",
                // "H804",
                // "H805",
                // "H806",
                // "H807",
                // "H808",
            ],
            collection: vec![
                "CG\\/A",
                // the following are too irregular and therefore difficult to parse
                // honestly not worth the effort compared to the other files
                // "CG\\/P",
                // "CG\\/Carnival",
                // "CG\\/Story"
            ],
            mat_source: collection! {
                // texture attributed to a _DialogTV(_UI).prefab container instead
                "H004" => "Hero/H004/",
                "H006" => "Hero/H006/",
            },
            collection_redirect: collection! {
                // paired CG whose LoveTalk texture is filed under the sibling id
                "A0261" => "A0297",
                "A0262" => "A0298",
            },
            suppress_skel: collection! {
                // deliberate stub exclusion: no Img/Skill_Prefab (see `extra`)
                ("Assets/Game/Hero/H803/H803/H803_SkeletonData.asset", "H803.skel"),
                ("Assets/Game/Hero/H805/H805/H805_SkeletonData.asset", "H805.skel"),
                ("Assets/Game/Hero/H806/H806/H806_SkeletonData.asset", "H806.skel"),
                ("Assets/Game/Hero/H807/H807/H807_SkeletonData.asset", "H807.skel"),
                ("Assets/Game/Hero/H808/H808/H808_SkeletonData.asset", "H808.skel"),
                // dup of the working Hero/H128 bundle, harmless cutscene leftover
                ("Assets/Game/Cutscene/H128_CutScene/H128_CutScene.prefab", "H128.skel"),
                // broken copy superseded by hero_path_override's Cutscene redirect
                ("Assets/Game/Hero/H060/H060/H060_SkeletonData.asset", "H060.skel"),
                // unreferenced alt-pose variant, not hooked to any RoleCollection row
                ("Assets/Game/CG/A0015/A0015_02/A0015_02_SkeletonData.asset", "A0015_02.skel"),
            },
            suppress_cg: collection! {
                // Artifact "Other"-type item's flavor CG, not a hero bond
                "A0054",
            },
        }
    }

    pub fn get_hero(&self, id: &str) -> Option<Vec<&str>> {
        self.hero.get(id).cloned()
    }

    pub fn get_hero_path_override(&self, id: &str) -> Option<&str> {
        self.hero_path_override.get(id).copied()
    }

    pub fn get_alt(&self, id: &str) -> Option<&str> {
        self.alt.get(id).copied()
    }

    pub fn get_extra(&self) -> Vec<&str> {
        self.extra.clone()
    }

    pub fn get_collection(&self) -> Vec<&str> {
        self.collection.clone()
    }

    pub fn get_mat_source(&self, id: &str) -> Option<&str> {
        self.mat_source.get(id).copied()
    }

    pub fn get_collection_redirect(&self, cg: &str) -> Option<&str> {
        self.collection_redirect.get(cg).copied()
    }

    pub fn is_skel_suppressed(&self, container: &str, file: &str) -> bool {
        self.suppress_skel
            .iter()
            .any(|(c, f)| *c == container && *f == file)
    }

    pub fn is_cg_suppressed(&self, cg: &str) -> bool {
        self.suppress_cg.contains(cg)
    }
}
