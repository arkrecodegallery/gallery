use itertools::Itertools;

use crate::assets::AssetLookup;
use crate::missing::{Missing, MissingKey};
use crate::rules::Rules;

use super::bond::{bond_cg_ids, find_role_collection_rows, RoleCollectionQuery};
use super::GalleryContext;

struct CollectionMatch {
    container: String,
    file_name: String,
}

pub(super) fn init_collection(
    ctx: &GalleryContext,
    id: &str,
    missing: &mut Missing,
) -> Option<Vec<String>> {
    let rows = find_role_collection_rows(id, ctx.variables, ctx.rules, RoleCollectionQuery::Collection)?;
    let bond_cg_ids = bond_cg_ids(ctx, id);

    let result = rows
        .into_iter()
        .filter(|row| !bond_cg_ids.contains(&row.cg_id))
        .filter_map(|row| {
            missing.record_cg(row.cg_id.clone());
            find_collection(id, &row.cg_id, ctx.assets, ctx.rules, missing)
        })
        .collect();

    Some(result)
}

/// Looks for `cg`'s image under a given folder id, which is normally `cg`
/// itself but may be a sibling id via `Rules::get_collection_redirect` when
/// the texture was attributed to a paired CG's container instead.
fn try_find(assets: &AssetLookup, cg: &str, folder_id: &str) -> Option<String> {
    let search = |prefix: &str, container_suffix: &str| -> Option<CollectionMatch> {
        assets.get_by_prefix(prefix).into_iter().find_map(|group| {
            if !group.container.ends_with(container_suffix) {
                return None;
            }

            group
                .files
                .iter()
                .filter(|file| *file == cg)
                .sorted()
                .dedup()
                .next()
                .map(|file_name| CollectionMatch {
                    container: group.container.clone(),
                    file_name: file_name.clone(),
                })
        })
    };

    if let Some(shallow) = search(
        &format!("CG/{}/", folder_id),
        &format!("/{}_LoveTalk.prefab", folder_id),
    ) {
        let segments: Vec<&str> = shallow.container.split("/").collect();
        let parent = segments[..segments.len().saturating_sub(1)].join("/");
        Some(format!("{}/{}.png", parent, shallow.file_name))
    } else {
        search(&format!("CG/{}/Img", folder_id), &format!("/{}.png", folder_id))
            .map(|deep| deep.container)
    }
}

fn find_collection(
    id: &str,
    cg: &str,
    assets: &AssetLookup,
    rules: &Rules,
    missing: &mut Missing,
) -> Option<String> {
    let result = try_find(assets, cg, cg).or_else(|| {
        rules
            .get_collection_redirect(cg)
            .and_then(|redirect| try_find(assets, cg, redirect))
    });

    if result.is_none() {
        missing.insert_log(
            id.to_string(),
            MissingKey::Collection,
            format!("Missing image (id '{}')", cg),
        );
    }

    result
}
