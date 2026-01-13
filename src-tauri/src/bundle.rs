use std::io::BufRead;

use anyhow::{anyhow, Context, Result};
use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::{
    constants::DIR_CONTAINERS,
    entry::Entry,
    missing::{Missing, MissingKey},
};

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct Bundle {
    #[serde(skip_serializing)]
    dir_gallery_data: String,

    skel: String,
    atlas: String,
}

impl Bundle {
    pub fn new(dir_gallery_data: String) -> Self {
        Self {
            dir_gallery_data,
            ..Self::default()
        }
    }

    pub fn is_valid(&self) -> Result<bool> {
        Ok(self.valid_assets() && self.valid_mat()?)
    }

    fn valid_assets(&self) -> bool {
        !self.skel.is_empty() && !self.atlas.is_empty()
    }

    fn valid_mat(&self) -> Result<bool> {
        let atlas_path = format!("{}{}{}", &self.dir_gallery_data, DIR_CONTAINERS, self.atlas);
        let mat_name = self
            .get_atlas_mat(&atlas_path)
            .with_context(|| format!("could not read atlas '{}'", atlas_path))?;
        let target = Entry::build_file_path(&atlas_path, &mat_name);
        let exists = std::path::Path::new(&target).exists();
        Ok(exists)
    }

    fn get_atlas_mat(&self, atlas_path: &str) -> Result<String> {
        let file = std::fs::File::open(atlas_path)
            .with_context(|| format!("could not open atlas file '{}'", atlas_path))?;
        let reader = std::io::BufReader::new(file);

        if let Some(Ok(line)) = reader.lines().next() {
            Ok(line.trim_end().to_string())
        } else {
            Err(anyhow!("no lines to read in atlas '{}'", self.atlas))
        }
    }
}

pub struct BundleProcessor<'a> {
    main: Bundle,
    alt: Bundle,
    alt_regex: Option<&'a Regex>,
    key: MissingKey,
}

impl<'a> BundleProcessor<'a> {
    pub fn new(dir_gallery_data: String, alt_regex: Option<&'a Regex>, key: MissingKey) -> Self {
        Self {
            main: Bundle::new(dir_gallery_data.clone()),
            alt: Bundle::new(dir_gallery_data),
            alt_regex,
            key,
        }
    }

    pub fn process_assets(&mut self, assets: Vec<(String, Vec<String>)>, missing: &mut Missing) {
        for (container, files) in assets {
            if container.ends_with(".asset") {
                self.process_asset_container(&container, files, missing);
            }
        }
    }

    fn process_asset_container(&mut self, container: &str, files: Vec<String>, missing: &mut Missing) {
        for file in files {
            let path = Entry::build_file_path(container, &file);

            if file.contains(".skel") {
                self.assign_to_bundle(&file, BundleField::Skel(path));
                missing.record_skel(container.to_string(), file);
            } else if file.contains(".atlas") {
                self.assign_to_bundle(&file, BundleField::Atlas(path));
            }
        }
    }

    fn assign_to_bundle(&mut self, file: &str, field: BundleField) {
        let is_alt = self.alt_regex.is_some_and(|r| r.is_match(file));
        let bundle = if is_alt {
            &mut self.alt
        } else {
            &mut self.main
        };

        match field {
            BundleField::Skel(path) => bundle.skel = path,
            BundleField::Atlas(path) => bundle.atlas = path,
        }
    }

    pub fn get_main_and_log(
        &self,
        id: String,
        log_id: String,
        missing: &mut Missing,
        log_missing_assets: bool,
    ) -> Result<Option<Bundle>> {
        Ok(
            if let Ok(Some(main)) =
                self.get_bundle_and_log(id.clone(), log_id.to_string(), missing, &self.main, false, log_missing_assets)
            {
                Some(main)
            } else {
                None
            },
        )
    }

    pub fn get_both_and_log(
        &self,
        id: String,
        log_id: String,
        missing: &mut Missing,
    ) -> Result<Option<(Bundle, Option<Bundle>)>> {
        Ok(
            if let Ok(Some(main)) =
                self.get_bundle_and_log(id.clone(), log_id.to_string(), missing, &self.main, false, true)
            {
                if let Ok(Some(alt)) = self.get_bundle_and_log(id, log_id.to_string(), missing, &self.alt, true, true) {
                    Some((main, Some(alt)))
                } else {
                    Some((main, None))
                }
            } else {
                None
            },
        )
    }

    fn get_bundle_and_log(
        &self,
        id: String,
        log_id: String,
        missing: &mut Missing,
        bundle: &Bundle,
        is_alt: bool,
        log_missing_assets: bool,
    ) -> Result<Option<Bundle>> {
        let flavor = if is_alt { "alt " } else { "" };

        if bundle.valid_assets() {
            match bundle.is_valid() {
                Ok(is_valid) => {
                    if is_valid {
                        Ok(Some(bundle.clone()))
                    } else {
                        missing.insert_log(id, self.key, format!("Missing {}mat (id '{}')", flavor, log_id));
                        Ok(None)
                    }
                }
                Err(err) => {
                    missing.insert_log(id, self.key, format!("Invalid {}atlas (id '{}'): {}", flavor, err, log_id));
                    Err(err)
                }
            }
        } else {
            if log_missing_assets && (is_alt == self.alt_regex.is_some()) {
                missing.insert_log(id, self.key, format!("Missing {}skel or atlas (id '{}')", flavor, log_id));
            }
            Ok(None)
        }
    }
}

enum BundleField {
    Skel(String),
    Atlas(String),
}
