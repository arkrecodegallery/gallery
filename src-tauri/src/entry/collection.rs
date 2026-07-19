use itertools::Itertools;

use crate::assets::AssetLookup;
use crate::missing::{Missing, MissingKey};

use super::bond::{find_role_collection_rows, RoleCollectionQuery};
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

    let result = rows
        .into_iter()
        .filter_map(|row| {
            missing.record_cg(row.cg_id.clone());
            find_collection(id, &row.cg_id, ctx.assets, missing)
        })
        .collect();

    Some(result)
}

fn find_collection(id: &str, cg: &str, assets: &AssetLookup, missing: &mut Missing) -> Option<String> {
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

    if let Some(shallow) = search(&format!("CG/{}/", cg), &format!("/{}_LoveTalk.prefab", cg)) {
        let segments: Vec<&str> = shallow.container.split("/").collect();
        let parent = segments[..segments.len().saturating_sub(1)].join("/");
        Some(format!("{}/{}.png", parent, shallow.file_name))
    } else if let Some(deep) = search(&format!("CG/{}/Img", cg), &format!("/{}.png", cg)) {
        Some(deep.container)
    } else {
        missing.insert_log(
            id.to_string(),
            MissingKey::Collection,
            format!("Missing image (id '{}')", cg),
        );
        None
    }
}
