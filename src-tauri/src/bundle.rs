use std::io::BufRead;

use anyhow::{anyhow, Context, Result};
use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::{
    assets::AssetGroup,
    constants::{DIR_ASSETS, DIR_CONTAINERS, DIR_GENERATED},
    entry::Entry,
    missing::{Missing, MissingKey},
    rules::Rules,
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
        let declared_name = read_atlas_declared_name(atlas_path)?;
        Ok(resolve_duplicate_mat(atlas_path, &declared_name))
    }

    pub fn with_disambiguated_mat(&self, id: &str) -> Result<Bundle> {
        let atlas_path = format!("{}{}{}", &self.dir_gallery_data, DIR_CONTAINERS, self.atlas);
        let atlas_text = std::fs::read_to_string(&atlas_path)
            .with_context(|| format!("could not read atlas '{}'", atlas_path))?;

        let pages: Vec<(String, String)> = atlas_page_names(&atlas_text)
            .into_iter()
            .map(|declared| {
                let resolved = resolve_duplicate_mat(&atlas_path, &declared);
                (declared, resolved)
            })
            .collect();

        if pages.iter().all(|(declared, resolved)| declared == resolved) {
            return Ok(self.clone());
        }

        let generated_dir = format!("{}{}{}/", &self.dir_gallery_data, DIR_GENERATED, id);
        std::fs::create_dir_all(&generated_dir)
            .with_context(|| format!("could not create generated dir '{}'", generated_dir))?;

        for (declared, resolved) in &pages {
            let resolved_path = Entry::build_file_path(&atlas_path, resolved);
            copy_if_changed(&resolved_path, &format!("{}{}", generated_dir, declared))?;
        }

        let atlas_name = std::path::Path::new(&self.atlas)
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| anyhow!("could not derive atlas file name from '{}'", self.atlas))?;
        copy_if_changed(&atlas_path, &format!("{}{}", generated_dir, atlas_name))?;

        Ok(Bundle {
            dir_gallery_data: self.dir_gallery_data.clone(),
            skel: self.skel.clone(),
            atlas: format!("../{}{}/{}", DIR_GENERATED, id, atlas_name),
        })
    }

    pub fn with_corrected_atlas(&self, id: &str) -> Result<Bundle> {
        let atlas_path = format!("{}{}{}", &self.dir_gallery_data, DIR_CONTAINERS, self.atlas);
        let atlas_text = std::fs::read_to_string(&atlas_path)
            .with_context(|| format!("could not read atlas '{}'", atlas_path))?;

        let mat_name = self.get_atlas_mat(&atlas_path)?;
        let mat_path = Entry::build_file_path(&atlas_path, &mat_name);
        let (real_width, real_height) = read_png_dimensions(&mat_path)
            .with_context(|| format!("could not read texture dimensions '{}'", mat_path))?;

        let (declared_width, declared_height) = get_declared_page_size(&atlas_text)
            .ok_or_else(|| anyhow!("no page size line in atlas '{}'", self.atlas))?;

        if declared_width == real_width && declared_height == real_height {
            return Ok(self.clone());
        }

        let scale_x = real_width as f64 / declared_width as f64;
        let scale_y = real_height as f64 / declared_height as f64;
        let corrected_text = rescale_atlas_bounds(&atlas_text, scale_x, scale_y);

        let generated_dir = format!("{}{}{}/", &self.dir_gallery_data, DIR_GENERATED, id);
        std::fs::create_dir_all(&generated_dir)
            .with_context(|| format!("could not create generated dir '{}'", generated_dir))?;

        copy_if_changed(&mat_path, &format!("{}{}", generated_dir, mat_name))?;

        let atlas_name = std::path::Path::new(&self.atlas)
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| anyhow!("could not derive atlas file name from '{}'", self.atlas))?;
        std::fs::write(format!("{}{}", generated_dir, atlas_name), corrected_text)
            .with_context(|| format!("could not write corrected atlas '{}{}'", generated_dir, atlas_name))?;

        Ok(Bundle {
            dir_gallery_data: self.dir_gallery_data.clone(),
            skel: self.skel.clone(),
            atlas: format!("../{}{}/{}", DIR_GENERATED, id, atlas_name),
        })
    }

    pub fn with_generated_mat(&self, id: &str, source_dir: &str) -> Result<Bundle> {
        let atlas_path = format!("{}{}{}", &self.dir_gallery_data, DIR_CONTAINERS, self.atlas);
        let mat_name = self
            .get_atlas_mat(&atlas_path)
            .with_context(|| format!("could not read atlas '{}'", atlas_path))?;

        let real_texture = format!(
            "{}{}{}{}{}",
            &self.dir_gallery_data, DIR_CONTAINERS, DIR_ASSETS, source_dir, mat_name
        );
        if !std::path::Path::new(&real_texture).exists() {
            return Err(anyhow!("no texture at override source '{}'", real_texture));
        }

        let generated_dir = format!("{}{}{}/", &self.dir_gallery_data, DIR_GENERATED, id);
        std::fs::create_dir_all(&generated_dir)
            .with_context(|| format!("could not create generated dir '{}'", generated_dir))?;

        copy_if_changed(&real_texture, &format!("{}{}", generated_dir, mat_name))?;

        let atlas_name = std::path::Path::new(&self.atlas)
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| anyhow!("could not derive atlas file name from '{}'", self.atlas))?;
        copy_if_changed(&atlas_path, &format!("{}{}", generated_dir, atlas_name))?;

        Ok(Bundle {
            dir_gallery_data: self.dir_gallery_data.clone(),
            skel: self.skel.clone(),
            atlas: format!("../{}{}/{}", DIR_GENERATED, id, atlas_name),
        })
    }
}

fn atlas_page_names(atlas_text: &str) -> Vec<String> {
    let mut names = Vec::new();
    let mut lines = atlas_text.lines();

    if let Some(first) = lines.next() {
        names.push(first.trim_end().to_string());
    }

    let mut prev_blank = false;
    for line in lines {
        if prev_blank && !line.trim().is_empty() {
            names.push(line.trim_end().to_string());
        }
        prev_blank = line.trim().is_empty();
    }

    names
}

fn read_atlas_declared_name(atlas_path: &str) -> Result<String> {
    let file = std::fs::File::open(atlas_path)
        .with_context(|| format!("could not open atlas file '{}'", atlas_path))?;
    let reader = std::io::BufReader::new(file);

    if let Some(Ok(line)) = reader.lines().next() {
        Ok(line.trim_end().to_string())
    } else {
        Err(anyhow!("no lines to read in atlas '{}'", atlas_path))
    }
}

fn resolve_duplicate_mat(atlas_path: &str, declared_name: &str) -> String {
    let Some(dir) = std::path::Path::new(atlas_path).parent() else {
        return declared_name.to_string();
    };

    let stem = std::path::Path::new(declared_name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(declared_name);
    let ext = std::path::Path::new(declared_name)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");

    let Ok(pattern) = Regex::new(&format!(
        r"^{}(?: #\d+)?\.{}$",
        regex::escape(stem),
        regex::escape(ext)
    )) else {
        return declared_name.to_string();
    };

    let Ok(entries) = std::fs::read_dir(dir) else {
        return declared_name.to_string();
    };

    let candidates: Vec<String> = entries
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| entry.file_name().into_string().ok())
        .filter(|name| pattern.is_match(name))
        .collect();

    if candidates.len() <= 1 {
        return declared_name.to_string();
    }

    let declared_size = std::fs::read_to_string(atlas_path)
        .ok()
        .and_then(|text| get_declared_page_size(&text));

    if let Some(declared_size) = declared_size {
        for candidate in &candidates {
            let path = dir.join(candidate);
            let dims = path.to_str().and_then(|p| read_png_dimensions(p).ok());
            if dims == Some(declared_size) {
                return candidate.clone();
            }
        }
    }

    declared_name.to_string()
}

fn read_png_dimensions(path: &str) -> Result<(u32, u32)> {
    let bytes = std::fs::read(path).with_context(|| format!("could not read file '{}'", path))?;

    if bytes.len() < 24 || &bytes[0..8] != b"\x89PNG\r\n\x1a\n" {
        return Err(anyhow!("'{}' is not a valid png", path));
    }

    let width = u32::from_be_bytes(bytes[16..20].try_into().unwrap());
    let height = u32::from_be_bytes(bytes[20..24].try_into().unwrap());
    Ok((width, height))
}

fn get_declared_page_size(atlas_text: &str) -> Option<(u32, u32)> {
    let mut lines = atlas_text.lines();
    lines.next()?;

    for line in lines {
        let (key, values) = line.split_once(':')?;
        if key == "size" {
            let mut parts = values.split(',');
            let width = parts.next()?.trim().parse().ok()?;
            let height = parts.next()?.trim().parse().ok()?;
            return Some((width, height));
        }
    }

    None
}

const ATLAS_GEOMETRY_KEYS: [&str; 6] = ["size", "xy", "bounds", "offset", "orig", "offsets"];

fn rescale_atlas_bounds(atlas_text: &str, scale_x: f64, scale_y: f64) -> String {
    atlas_text
        .lines()
        .map(|line| rescale_atlas_line(line, scale_x, scale_y))
        .collect::<Vec<_>>()
        .join("\n")
}

fn rescale_atlas_line(line: &str, scale_x: f64, scale_y: f64) -> String {
    let Some((key, values)) = line.split_once(':') else {
        return line.to_string();
    };

    if !ATLAS_GEOMETRY_KEYS.contains(&key) {
        return line.to_string();
    }

    let rescaled: Vec<String> = values
        .split(',')
        .enumerate()
        .map(|(i, value)| {
            let number: f64 = value.trim().parse().unwrap_or(0.0);
            let scale = if i % 2 == 0 { scale_x } else { scale_y };
            ((number * scale).round() as i64).to_string()
        })
        .collect();

    format!("{}:{}", key, rescaled.join(","))
}

fn copy_if_changed(src: &str, dest: &str) -> Result<()> {
    let unchanged = match (std::fs::metadata(src), std::fs::metadata(dest)) {
        (Ok(src_meta), Ok(dest_meta)) => src_meta.len() == dest_meta.len(),
        _ => false,
    };

    if !unchanged {
        std::fs::copy(src, dest)
            .with_context(|| format!("could not copy '{}' to '{}'", src, dest))?;
    }

    Ok(())
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
    rules: &'a Rules,
}

impl<'a> BundleProcessor<'a> {
    pub fn new(
        dir_gallery_data: &str,
        alt_regex: Option<&'a Regex>,
        key: MissingKey,
        rules: &'a Rules,
    ) -> Self {
        Self {
            main: Bundle::new(dir_gallery_data),
            alt: Bundle::new(dir_gallery_data),
            alt_regex,
            key,
            rules,
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
            Ok(true) => {
                let bundle = match bundle.with_disambiguated_mat(id) {
                    Ok(fixed) => fixed,
                    Err(err) => {
                        missing.insert_log(
                            id.to_string(),
                            self.key,
                            format!(
                                "Could not disambiguate {}mat (id '{}'): {}",
                                flavor, log_id, err
                            ),
                        );
                        bundle.clone()
                    }
                };

                if self.rules.has_atlas_size_mismatch(log_id) {
                    match bundle.with_corrected_atlas(id) {
                        Ok(fixed) => Some(fixed),
                        Err(err) => {
                            missing.insert_log(
                                id.to_string(),
                                self.key,
                                format!(
                                    "Could not correct {}atlas size (id '{}'): {}",
                                    flavor, log_id, err
                                ),
                            );
                            Some(bundle.clone())
                        }
                    }
                } else {
                    Some(bundle)
                }
            }
            Ok(false) => {
                if matches!(self.key, MissingKey::Hero) {
                    if let Some(source_dir) = self.rules.get_mat_source(id) {
                        if let Ok(fixed) = bundle.with_generated_mat(id, source_dir) {
                            return Some(fixed);
                        }
                    }
                }

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
