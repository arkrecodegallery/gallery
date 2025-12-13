use crate::assets::AssetLookup;
use crate::constants::{DIR_GALLERY_DATA, FILE_MAP, MAX_HERO_ID, MIN_HERO_ID};
use crate::entry::Entry;
use crate::rules::Rules;
use crate::variables::VariableLookup;

use anyhow::{Context, Result};

use std::collections::BTreeMap;
use std::fs::File;
use std::io::BufWriter;

#[tauri::command]
pub fn generate_map() -> Result<String, String> {
    let result = _generate_map();
    match result {
        Ok(()) => Ok("generated map".to_string()),
        Err(err) => Err(err.to_string()),
    }
}

fn _generate_map() -> Result<()> {
    // create lookup structures
    let assets = AssetLookup::new()?;
    let variables = VariableLookup::new()?;
    let rules = Rules::new();

    // create map from lookup
    let mut map = BTreeMap::<String, Entry>::new();
    for i in MIN_HERO_ID..=MAX_HERO_ID {
        let id = format!("H{:0>3}", i);
        let entry = Entry::new(&id, &assets, &variables, &rules)?;
        if let Some(e) = entry {
            map.insert(id, e);
        }
    }

    // write map file for use by frontend
    let map_path = format!("{}{}", DIR_GALLERY_DATA, FILE_MAP);
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
        _generate_map().unwrap();
    }
}
