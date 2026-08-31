use crate::assets::AssetLookup;
use crate::constants::{FILE_MAP, FILE_MISSING};
use crate::entry::{Entry, GalleryContext};
use crate::missing::Missing;
use crate::rules::Rules;
use crate::utils::get_hero_ids;
use crate::variables::VariableLookup;

use anyhow::{Context, Result};
use serde::Serialize;

use std::collections::BTreeMap;
use std::fs::File;
use std::io::BufWriter;

#[tauri::command]
pub fn generate_map(dir_gallery_data: String) -> Result<String, String> {
    let result = _generate_map(dir_gallery_data);
    match result {
        Ok(()) => Ok("generated map".to_string()),
        Err(err) => Err(err.to_string()),
    }
}

fn _generate_map(dir_gallery_data: String) -> Result<()> {
    let assets = AssetLookup::new(&dir_gallery_data)?;
    let variables = VariableLookup::new(&dir_gallery_data)?;
    let rules = Rules::new();
    let mut missing = Missing::new(&assets, &variables);

    let ctx = GalleryContext {
        dir_gallery_data: &dir_gallery_data,
        assets: &assets,
        variables: &variables,
        rules: &rules,
    };

    let ids = get_hero_ids(&variables, &rules)?;
    let mut map = BTreeMap::<String, Entry>::new();
    for id in ids {
        if let Some(entry) = Entry::new(&ctx, &id, &mut missing) {
            map.insert(id.clone(), entry);
        }
    }
    missing.cleanup(&dir_gallery_data, &rules);

    write_json(&dir_gallery_data, FILE_MAP, &map)?;
    write_json(&dir_gallery_data, FILE_MISSING, &missing)?;

    Ok(())
}

fn write_json<T: ?Sized + Serialize>(
    dir_gallery_data: &str,
    file_name: &str,
    json: &T,
) -> anyhow::Result<()> {
    let map_path = format!("{}{}", dir_gallery_data, file_name);
    let file = File::create(map_path.clone())
        .with_context(|| format!("unable to create file '{}'", map_path))?;
    let writer = BufWriter::new(file);
    serde_json::to_writer_pretty(writer, json)
        .with_context(|| format!("failed to write to file '{}'", map_path))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn runner() {
        let dir_gallery_data = std::env::var("TEST_DATA_PATH").unwrap();
        _generate_map(dir_gallery_data).unwrap();
    }
}
