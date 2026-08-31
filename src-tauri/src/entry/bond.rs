use std::collections::HashSet;

use itertools::Itertools;
use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::assets::AssetLookup;
use crate::bundle::{Bundle, BundleProcessor, MissingAssetPolicy};
use crate::constants::{FIELD_PREFAB, FIELD_ROLE_ID, FIELD_ROLE_MOTIONS, FILE_ROLE_COLLECTION};
use crate::missing::{Missing, MissingKey};
use crate::rules::Rules;
use crate::variables::VariableLookup;

use super::connect_artifact::find_connect_artifact_cg;
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

/// Rows feeding a hero's bond, combining `RoleCollection.txt`'s own Bond-query
/// rows with the manual `extra_bond` override and any `ConnectArtifact` link.
fn bond_rows(ctx: &GalleryContext, id: &str) -> Option<Vec<RoleCollectionRow>> {
    let mut rows =
        find_role_collection_rows(id, ctx.variables, ctx.rules, RoleCollectionQuery::Bond)?;

    if let Some((cg_id, motion_field)) = ctx.rules.get_extra_bond(id) {
        rows.push(RoleCollectionRow {
            cg_id: cg_id.to_string(),
            motion_field: motion_field.to_string(),
        });
    }

    if let Some(cg_id) = find_connect_artifact_cg(id, ctx.variables) {
        let has_bundle = !ctx
            .assets
            .get_by_prefix(&format!("CG/{}/{}/", cg_id, cg_id))
            .is_empty();

        if has_bundle && !rows.iter().any(|row| row.cg_id == cg_id) {
            rows.push(RoleCollectionRow {
                cg_id,
                motion_field: "Bond".to_string(),
            });
        }
    }

    Some(rows)
}

/// cg ids that `init_bond` will resolve into a bond presentation for `id`,
/// so `init_collection` can exclude them from the collection instead.
pub(super) fn bond_cg_ids(ctx: &GalleryContext, id: &str) -> HashSet<String> {
    bond_rows(ctx, id)
        .map(|rows| rows.into_iter().map(|row| row.cg_id).collect())
        .unwrap_or_default()
}

pub(super) fn init_bond(
    ctx: &GalleryContext,
    id: &str,
    missing: &mut Missing,
) -> Option<Vec<BondPresentation>> {
    let rows = bond_rows(ctx, id)?;

    let mut result = Vec::new();
    for row in rows {
        missing.record_cg(row.cg_id.clone());

        if row.motion_field.starts_with("CG") {
            if let Some(images) =
                find_still(id, ctx.assets, ctx.rules, &row.cg_id, &row.motion_field, missing)
            {
                result.push(BondPresentation::Stills { images });
            }
        } else {
            let prefix = format!("CG/{}/{}/", row.cg_id, row.cg_id);
            let assets = ctx.assets.get_by_prefix(&prefix);

            let mut processor =
                BundleProcessor::new(ctx.dir_gallery_data, None, MissingKey::Bond, ctx.rules);
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
    rules: &Rules,
    bond: &str,
    motions: &str,
    missing: &mut Missing,
) -> Option<Vec<String>> {
    let motion_list: Vec<&str> = motions.split("~").collect();
    let redirect = rules.get_collection_redirect(bond);

    let mut result = Vec::<String>::new();
    for motion in motion_list {
        let target = motion.split("_").last().map(|num| format!("{}_{}", bond, num));

        let found = target.as_deref().and_then(|target| {
            find_still_file(assets, bond, target)
                .or_else(|| redirect.and_then(|redirect| find_still_file(assets, redirect, target)))
        });

        match found {
            Some(path) => result.push(path),
            None => {
                missing.insert_log(
                    id.to_string(),
                    MissingKey::Bond,
                    format!("Missing still '{}' (id '{}')", motion, bond),
                );
                return None;
            }
        }
    }

    Some(result)
}

fn find_still_file(assets: &AssetLookup, folder_id: &str, target: &str) -> Option<String> {
    let prefix = format!("CG/{}", folder_id);
    assets.get_by_prefix(&prefix).into_iter().find_map(|group| {
        group
            .files
            .iter()
            .find(|file| file.as_str() == target)
            .map(|file| Entry::build_file_path(&group.container, &format!("{}.png", file)))
    })
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
