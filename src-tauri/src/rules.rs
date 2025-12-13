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
    hero: HashMap<&'static str, Vec<&'static str>>,
    alt: HashMap<&'static str, &'static str>,
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
        }
    }

    pub fn get_hero(&self, id: &str) -> Option<Vec<&str>> {
        self.hero.get(id).cloned()
    }

    pub fn get_alt(&self, id: &str) -> Option<&str> {
        self.alt.get(id).copied()
    }
}
