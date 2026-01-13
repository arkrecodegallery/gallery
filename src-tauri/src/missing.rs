use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};

use crate::{
    assets::AssetLookup,
    constants::{
        DIR_ASSETS, DIR_CONTAINERS, FIELD_DYNAMIC, FIELD_ID, FIELD_PREFAB, FILE_ARTIFACT,
        FILE_ROLE, FILE_ROLE_COLLECTION,
    },
    variables::VariableLookup,
};

#[derive(Debug, PartialEq, Eq, Hash, Serialize, Deserialize, PartialOrd, Ord, Clone, Copy)]
pub enum MissingKey {
    Hero,
    Skill,
    Bond,
    Collection,
}

#[derive(Serialize, Deserialize)]
pub struct Missing {
    log: BTreeMap<String, BTreeMap<MissingKey, Vec<String>>>,

    // skels that weren't used by any hero
    // sometimes odd extra file like Cutscene
    unused_skels: BTreeSet<(String, String)>,
    // cg that were found in the artifacts, role, or role collection but not used
    // sometimes a placeholder image
    unused_cg: BTreeSet<String>,
    // cg that were found but are missing a directory
    // usually beta file not yet added
    missing_cg: BTreeSet<String>,
}

impl Missing {
    pub fn new(assets: &AssetLookup, variables: &VariableLookup) -> Self {
        Self {
            log: BTreeMap::new(),
            unused_skels: Self::collect_skels(assets),
            unused_cg: Self::collect_cg(variables),
            missing_cg: BTreeSet::new(),
        }
    }

    fn collect_skels(assets: &AssetLookup) -> BTreeSet<(String, String)> {
        let mut skels = BTreeSet::new();

        for (container, files) in &assets.map {
            for file in files {
                if file.ends_with(".skel") && !file.starts_with("B") && !file.starts_with("M") {
                    skels.insert((container.to_string(), file.to_string()));
                }
            }
        }

        skels
    }

    fn collect_cg(variables: &VariableLookup) -> BTreeSet<String> {
        let mut cg = BTreeSet::new();

        let mut scrape_col =
            |file_name: &str, column: &str, transform: fn(&str) -> Option<String>| -> Option<()> {
                let file = variables.get_file(file_name)?;
                let col_index = file.get_column_index(column)?;

                for (_, cols) in file.get_data() {
                    let entry = &cols[col_index];
                    if let Some(value) = transform(entry) {
                        cg.insert(value);
                    }
                }

                Some(())
            };

        scrape_col(FILE_ARTIFACT, FIELD_ID, |id| -> Option<String> {
            if id.starts_with("A") && id != "A9999" {
                Some(id.to_string())
            } else {
                None
            }
        });

        for i in 1..=i32::MAX {
            let field = format!("{}{}", FIELD_DYNAMIC, i);
            if let None = scrape_col(FILE_ROLE, &field, |art| -> Option<String> {
                if art.starts_with("ConnectArtifact#A") {
                    Some(art.split("#").last().unwrap().to_string())
                } else {
                    None
                }
            }) {
                break;
            }
        }

        scrape_col(
            FILE_ROLE_COLLECTION,
            FIELD_PREFAB,
            |path| -> Option<String> {
                if path.starts_with("CG/A") {
                    Some(path.split("/").nth(1).unwrap().to_string())
                } else {
                    None
                }
            },
        );

        cg
    }

    pub fn insert_log(&mut self, id: String, key: MissingKey, log: String) {
        self.log
            .entry(id)
            .or_default()
            .entry(key)
            .or_default()
            .push(log);
    }

    pub fn record_skel(&mut self, container: String, file: String) {
        self.unused_skels.remove(&(container, file));
    }

    pub fn record_cg(&mut self, id: String) {
        self.unused_cg.remove(&id);
    }

    pub fn cleanup(&mut self, dir_gallery_data: &str) {
        let missing = |cg: &str| -> bool {
            let path = format!(
                "{}{}{}CG/{}",
                dir_gallery_data, DIR_CONTAINERS, DIR_ASSETS, cg
            );
            !std::path::Path::new(&path).exists()
        };

        self.unused_cg.retain(|cg| {
            if self
                .unused_skels
                .iter()
                .find(|(_, name)| name.starts_with(cg))
                .is_some()
            {
                false
            } else if missing(cg) {
                self.missing_cg.insert(cg.to_string());
                false
            } else {
                true
            }
        });
    }
}
