use std::collections::HashMap;

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
    // define the pattern for the alt so it is caught
    alt: HashMap<&'static str, &'static str>,
    // names not defined in tables but understood through inference
    names: HashMap<&'static str, &'static str>,
    // extra heros not recorded in the role file
    extra: Vec<&'static str>,
    // patterns for images withing the role collection file
    collection: Vec<&'static str>,
}

impl Rules {
    pub fn new() -> Self {
        Self {
            hero: collection! {
                "H003" => vec!["H003a", "H003b"],
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
        }
    }

    pub fn get_hero(&self, id: &str) -> Option<Vec<&str>> {
        self.hero.get(id).cloned()
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
}
