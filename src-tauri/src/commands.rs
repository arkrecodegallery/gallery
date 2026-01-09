use crate::assets::AssetLookup;
use crate::constants::{FILE_MAP, MAX_HERO_ID, MIN_HERO_ID};
use crate::entry::Entry;
use crate::rules::Rules;
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
    let mut map = BTreeMap::<String, Entry>::new();
    for i in MIN_HERO_ID..=MAX_HERO_ID {
        let id = format!("H{:0>3}", i);
        let entry = Entry::new(dir_gallery_data.clone(), &id, &assets, &variables, &rules)?;
        if let Some(e) = entry {
            map.insert(id, e);
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
        _generate_map("".to_owned()).unwrap();
    }
}
