use std::collections::{HashMap, HashSet};

macro_rules! collection {
    ($($k:expr => $v:expr),* $(,)?) => {{
        core::convert::From::from([$(($k, $v),)*])
    }};
    ($($v:expr),* $(,)?) => {{
        core::convert::From::from([$($v,)*])
    }};
}

pub struct Rules {
    // heros that have an abnormal file path
    hero: HashMap<&'static str, Vec<&'static str>>,
    hero_path_override: HashMap<&'static str, &'static str>,
    // per-hero regex matching asset filenames that belong to the alt costume
    alt: HashMap<&'static str, &'static str>,
    // names not defined in tables but understood through inference
    names: HashMap<&'static str, &'static str>,
    // extra heros not recorded in the role file
    extra: Vec<&'static str>,
    // patterns for images within the role collection file
    collection: Vec<&'static str>,
    // heros whose atlas texture isn't next to its atlas/skel
    mat_source: HashMap<&'static str, &'static str>,
    atlas_size_mismatch: HashSet<&'static str>,
    collection_redirect: HashMap<&'static str, &'static str>,
    // (container, file) skels permanently excluded from unused_skels noise
    suppress_skel: HashSet<(&'static str, &'static str)>,
    // cg ids permanently excluded from unused_cg noise
    suppress_cg: HashSet<&'static str>,
    // hero id -> (cg id, motion field) hand-verified bond content with no
    // Role/RoleCollection reference to derive it from automatically
    extra_bond: HashMap<&'static str, (&'static str, &'static str)>,
}

impl Rules {
    pub fn new() -> Self {
        Self {
            hero: collection! {
                "H003" => vec!["H003a", "H003b"],
            },
            hero_path_override: collection! {
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
            extra: vec!["H800", "H801", "H802"],
            collection: vec![
                "CG\\/A",
                // CG/P, Carnival, Story: too irregular to parse, not worth it
            ],
            mat_source: collection! {
                "H004" => "Hero/H004/",
                "H006" => "Hero/H006/",
                "H079" => "Hero/H210/H210/",
            },
            atlas_size_mismatch: collection! {
                "H183_S",
                "H184_S",
                "A0098",
            },
            collection_redirect: collection! {
                "A0261" => "A0297",
                "A0262" => "A0298",
                "A0040" => "Carnival006",
            },
            suppress_skel: collection! {
                ("Assets/Game/Hero/H803/H803/H803_SkeletonData.asset", "H803.skel"),
                ("Assets/Game/Hero/H805/H805/H805_SkeletonData.asset", "H805.skel"),
                ("Assets/Game/Hero/H806/H806/H806_SkeletonData.asset", "H806.skel"),
                ("Assets/Game/Hero/H807/H807/H807_SkeletonData.asset", "H807.skel"),
                ("Assets/Game/Hero/H808/H808/H808_SkeletonData.asset", "H808.skel"),
                // duplicate of Hero/H128
                ("Assets/Game/Cutscene/H128_CutScene/H128_CutScene.prefab", "H128.skel"),
                // broken; see hero_path_override
                ("Assets/Game/Hero/H060/H060/H060_SkeletonData.asset", "H060.skel"),
                ("Assets/Game/CG/A0015/A0015_02/A0015_02_SkeletonData.asset", "A0015_02.skel"),
            },
            suppress_cg: collection! {
                // H169 unreleased hero
                "A0321",
                "A0322",
                "A0323",
            },
            extra_bond: collection! {
                "H161" => ("A0299", "Bond"),
                "H183" => ("A0365", "Bond"),
                "H186" => ("A0374", "Bond"),
                "H190" => ("A0428", "Bond"),
                "H193" => ("A0437", "Bond"),
                "H085" => ("A0038", "CG_1~CG_2~CG_3~CG_4"),
                "H082" => ("A0046", "CG_1~CG_2~CG_3~CG_4"),
                "H088" => ("A0048", "CG_1~CG_2~CG_3~CG_4"),
                "H063" => ("A0049", "CG_1~CG_2~CG_3~CG_4"),
                "H075" => ("A0051", "CG_1~CG_2~CG_3~CG_4"),
                "H096" => ("A0052", "CG_1~CG_2~CG_3~CG_4"),
                "H098" => ("A0054", "CG_1~CG_2~CG_3~CG_4"),
                "H065" => ("A0055", "CG_1~CG_2~CG_3~CG_4"),
                "H101" => ("A0056", "CG_1~CG_2~CG_3~CG_4"),
                "H093" => ("A0058", "CG_1~CG_2~CG_3~CG_4~CG_5~CG_6"),
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

    pub fn get_name(&self, id: &str) -> Option<&str> {
        self.names.get(id).copied()
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

    pub fn has_atlas_size_mismatch(&self, id: &str) -> bool {
        self.atlas_size_mismatch.contains(id)
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

    pub fn get_extra_bond(&self, id: &str) -> Option<(&str, &str)> {
        self.extra_bond.get(id).copied()
    }
}
