use std::io::BufRead;

use anyhow::{anyhow, Context, Result};
use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::{
    assets::AssetGroup,
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
    pub fn new(dir_gallery_data: &str) -> Self {
        Self {
            dir_gallery_data: dir_gallery_data.to_string(),
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

/// A resolved main bundle plus its optional alt-costume counterpart.
pub struct MainAndAlt {
    pub main: Bundle,
    pub alt: Option<Bundle>,
}

enum BundleRole {
    Main,
    Alt,
}

pub enum MissingAssetPolicy {
    LogIfMissing,
    Ignore,
}

pub struct BundleProcessor<'a> {
    main: Bundle,
    alt: Bundle,
    alt_regex: Option<&'a Regex>,
    key: MissingKey,
}

impl<'a> BundleProcessor<'a> {
    pub fn new(dir_gallery_data: &str, alt_regex: Option<&'a Regex>, key: MissingKey) -> Self {
        Self {
            main: Bundle::new(dir_gallery_data),
            alt: Bundle::new(dir_gallery_data),
            alt_regex,
            key,
        }
    }

    pub fn process_assets(&mut self, assets: Vec<AssetGroup>, missing: &mut Missing) {
        for group in assets {
            if group.container.ends_with(".asset") {
                self.process_asset_container(&group.container, group.files, missing);
            }
        }
    }

    fn process_asset_container(
        &mut self,
        container: &str,
        files: Vec<String>,
        missing: &mut Missing,
    ) {
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
        id: &str,
        log_id: &str,
        missing: &mut Missing,
        policy: MissingAssetPolicy,
    ) -> Option<Bundle> {
        self.get_bundle_and_log(id, log_id, missing, &self.main, BundleRole::Main, policy)
    }

    pub fn get_both_and_log(
        &self,
        id: &str,
        log_id: &str,
        missing: &mut Missing,
    ) -> Option<MainAndAlt> {
        let main = self.get_bundle_and_log(
            id,
            log_id,
            missing,
            &self.main,
            BundleRole::Main,
            MissingAssetPolicy::LogIfMissing,
        )?;
        let alt = self.get_bundle_and_log(
            id,
            log_id,
            missing,
            &self.alt,
            BundleRole::Alt,
            MissingAssetPolicy::LogIfMissing,
        );

        Some(MainAndAlt { main, alt })
    }

    fn get_bundle_and_log(
        &self,
        id: &str,
        log_id: &str,
        missing: &mut Missing,
        bundle: &Bundle,
        role: BundleRole,
        policy: MissingAssetPolicy,
    ) -> Option<Bundle> {
        let is_alt = matches!(role, BundleRole::Alt);
        let flavor = if is_alt { "alt " } else { "" };

        if !bundle.valid_assets() {
            let should_log =
                matches!(policy, MissingAssetPolicy::LogIfMissing) && is_alt == self.alt_regex.is_some();
            if should_log {
                missing.insert_log(
                    id.to_string(),
                    self.key,
                    format!("Missing {}skel or atlas (id '{}')", flavor, log_id),
                );
            }
            return None;
        }

        match bundle.is_valid() {
            Ok(true) => Some(bundle.clone()),
            Ok(false) => {
                missing.insert_log(
                    id.to_string(),
                    self.key,
                    format!("Missing {}mat (id '{}')", flavor, log_id),
                );
                None
            }
            Err(err) => {
                missing.insert_log(
                    id.to_string(),
                    self.key,
                    format!("Invalid {}atlas (id '{}'): {}", flavor, err, log_id),
                );
                None
            }
        }
    }
}

enum BundleField {
    Skel(String),
    Atlas(String),
}
