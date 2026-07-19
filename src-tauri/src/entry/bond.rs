use itertools::Itertools;
use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::assets::AssetLookup;
use crate::bundle::{Bundle, BundleProcessor, MissingAssetPolicy};
use crate::constants::{FIELD_PREFAB, FIELD_ROLE_ID, FIELD_ROLE_MOTIONS, FILE_ROLE_COLLECTION};
use crate::missing::{Missing, MissingKey};
use crate::rules::Rules;
use crate::variables::VariableLookup;

use super::{Entry, GalleryContext};

/// A single bond entry: either a bundle to animate, or a fixed set of still images.
#[derive(Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub(super) enum BondPresentation {
    Animated { bundle: Bundle, motions: Vec<String> },
    Stills { images: Vec<String> },
}

pub(super) enum RoleCollectionQuery {
    Bond,
    Collection,
}

pub(super) struct RoleCollectionRow {
    pub cg_id: String,
    pub motion_field: String,
}

pub(super) fn init_bond(
    ctx: &GalleryContext,
    id: &str,
    missing: &mut Missing,
) -> Option<Vec<BondPresentation>> {
    let rows = find_role_collection_rows(id, ctx.variables, ctx.rules, RoleCollectionQuery::Bond)?;

    let mut result = Vec::new();
    for row in rows {
        missing.record_cg(row.cg_id.clone());

        if row.motion_field.starts_with("CG") {
            if let Some(images) = find_still(id, ctx.assets, &row.cg_id, &row.motion_field, missing) {
                result.push(BondPresentation::Stills { images });
            }
        } else {
            let prefix = format!("CG/{}/{}/", row.cg_id, row.cg_id);
            let assets = ctx.assets.get_by_prefix(&prefix);

            let mut processor = BundleProcessor::new(ctx.dir_gallery_data, None, MissingKey::Bond);
            processor.process_assets(assets, missing);

            if let Some(bundle) =
                processor.get_main_and_log(id, &row.cg_id, missing, MissingAssetPolicy::LogIfMissing)
            {
                let motions = row.motion_field.split("~").map(str::to_string).collect();
                result.push(BondPresentation::Animated { bundle, motions });
            }
        }
    }

    Some(result)
}

fn find_still(
    id: &str,
    assets: &AssetLookup,
    bond: &str,
    motions: &str,
    missing: &mut Missing,
) -> Option<Vec<String>> {
    let motion_list: Vec<&str> = motions.split("~").collect();

    let prefix = format!("CG/{}", bond);
    let groups = assets.get_by_prefix(&prefix);

    let mut result = Vec::<String>::new();
    'outer: for motion in motion_list {
        if let Some(num) = motion.split("_").last() {
            let target = format!("{}_{}", bond, num);
            for group in &groups {
                for file in &group.files {
                    if file == &target {
                        result.push(Entry::build_file_path(&group.container, &format!("{}.png", file)));
                        continue 'outer;
                    }
                }
            }
        }

        missing.insert_log(
            id.to_string(),
            MissingKey::Bond,
            format!("Missing still '{}' (id '{}')", motion, bond),
        );
        return None;
    }

    Some(result)
}

/// Rows from `RoleCollection.txt` belonging to `id`, filtered to the patterns
/// `Rules::get_collection` considers worth parsing, sorted by the row's own
/// CSV key for a deterministic order (the underlying data is a `HashMap`).
pub(super) fn find_role_collection_rows(
    id: &str,
    variables: &VariableLookup,
    rules: &Rules,
    query: RoleCollectionQuery,
) -> Option<Vec<RoleCollectionRow>> {
    let patterns: Vec<Regex> = rules
        .get_collection()
        .iter()
        .map(|pattern| Regex::new(pattern).unwrap())
        .collect();

    let collection = variables.get_file(FILE_ROLE_COLLECTION)?;
    let id_index = collection.get_column_index(FIELD_ROLE_ID)?;
    let prefab_index = collection.get_column_index(FIELD_PREFAB)?;
    let motions_index = collection.get_column_index(FIELD_ROLE_MOTIONS)?;

    let wants_motions = matches!(query, RoleCollectionQuery::Bond);

    let rows = collection
        .get_data()
        .iter()
        .filter(|(_, cols)| {
            cols[id_index] == id && !cols[motions_index].is_empty() == wants_motions
        })
        .filter(|(_, cols)| {
            let prefab = &cols[prefab_index];
            patterns.iter().any(|pattern| pattern.is_match(prefab))
        })
        .sorted_by(|(a, _), (b, _)| a.cmp(b))
        .filter_map(|(_, cols)| {
            let prefab = &cols[prefab_index];
            let cg_id = prefab.split("/").nth(1)?;
            Some(RoleCollectionRow {
                cg_id: cg_id.to_string(),
                motion_field: cols[motions_index].clone(),
            })
        })
        .collect();

    Some(rows)
}
