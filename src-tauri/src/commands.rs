use crate::assets::AssetLookup;
use crate::constants::FILE_MAP;
use crate::entry::Entry;
use crate::rules::Rules;
use crate::utils::get_hero_ids;
use crate::variables::VariableLookup;

use anyhow::{Context, Result};

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
    // create lookup structures
    let assets = AssetLookup::new(dir_gallery_data.clone())?;
    let variables = VariableLookup::new(dir_gallery_data.clone())?;
    let rules = Rules::new();

    // create map from lookup
    let ids = get_hero_ids(&variables, &rules)?;
    let mut map = BTreeMap::<String, Entry>::new();
    for id in ids.iter() {
        let entry = Entry::new(dir_gallery_data.clone(), &id, &assets, &variables, &rules)?;
        if let Some(e) = entry {
            map.insert(id.clone(), e);
        } else {
            println!("failed with {}", id)
        }
    }

    // write map file for use by frontend
    let map_path = format!("{}{}", dir_gallery_data, FILE_MAP);
    let file = File::create(map_path.clone())
        .with_context(|| format!("unable to create file '{}'", map_path))?;
    let writer = BufWriter::new(file);
    serde_json::to_writer_pretty(writer, &map)
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
