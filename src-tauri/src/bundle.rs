use std::io::BufRead;

use anyhow::{anyhow, Context, Result};
use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::{
    constants::{DIR_CONTAINERS, DIR_GALLERY_DATA},
    entry::Entry,
};

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct Bundle {
    skel: String,
    atlas: String,
}

impl Bundle {
    pub fn is_valid(&self) -> Result<bool> {
        Ok(!self.skel.is_empty() && !self.atlas.is_empty() && self.valid_mat()?)
    }

    fn valid_mat(&self) -> Result<bool> {
        let atlas_path = format!("{}{}{}", DIR_GALLERY_DATA, DIR_CONTAINERS, self.atlas);
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

    pub fn wrap(&self) -> Result<Option<&Self>> {
        if self.is_valid()? {
            Ok(Some(self))
        } else {
            Ok(None)
        }
    }
}

pub struct BundleProcessor<'a> {
    main: Bundle,
    alt: Bundle,
    alt_regex: Option<&'a Regex>,
}

impl<'a> BundleProcessor<'a> {
    pub fn new(alt_regex: Option<&'a Regex>) -> Self {
        Self {
            main: Bundle::default(),
            alt: Bundle::default(),
            alt_regex,
        }
    }

    pub fn process_assets(&mut self, assets: Vec<(String, Vec<String>)>) {
        for (container, files) in assets {
            if container.ends_with(".asset") {
                self.process_asset_container(&container, files);
            }
        }
    }

    fn process_asset_container(&mut self, container: &str, files: Vec<String>) {
        for file in files {
            let path = Entry::build_file_path(container, &file);

            if file.contains(".skel") {
                self.assign_to_bundle(&file, BundleField::Skel(path));
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

    pub fn get_main(&self) -> Result<Option<Bundle>> {
        Ok(self.main.wrap()?.cloned())
    }

    pub fn get_both(&self) -> Result<Option<(Bundle, Option<Bundle>)>> {
        Ok(if let Ok(Some(main)) = self.main.wrap() {
            let main = main.clone();
            let alt = self.alt.wrap()?.cloned();
            Some((main, alt))
        } else {
            None
        })
    }
}

enum BundleField {
    Skel(String),
    Atlas(String),
}
