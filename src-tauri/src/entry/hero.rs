use regex::Regex;

use crate::assets::{AssetGroup, AssetLookup};
use crate::bundle::{Bundle, BundleProcessor, MainAndAlt, MissingAssetPolicy};
use crate::missing::{Missing, MissingKey};
use crate::rules::Rules;

use super::GalleryContext;

pub(super) fn init_hero(
    ctx: &GalleryContext,
    id: &str,
    missing: &mut Missing,
) -> Option<MainAndAlt> {
    let assets = collect_hero_assets(id, ctx.assets, ctx.rules);
    let alt_regex = ctx.rules.get_alt(id).and_then(|p| Regex::new(p).ok());

    let mut processor = BundleProcessor::new(ctx.dir_gallery_data, alt_regex.as_ref(), MissingKey::Hero);
    processor.process_assets(assets, missing);
    processor.get_both_and_log(id, id, missing)
}

fn collect_hero_assets(id: &str, assets: &AssetLookup, rules: &Rules) -> Vec<AssetGroup> {
    if let Some(hero_rule) = rules.get_hero(id) {
        hero_rule
            .iter()
            .flat_map(|rule| {
                let prefix = format!("Hero/{}/{}/", id, rule);
                assets.get_by_prefix(&prefix)
            })
            .collect()
    } else {
        let prefix = format!("Hero/{}/{}/", id, id);
        assets.get_by_prefix(&prefix)
    }
}

pub(super) fn init_skill(ctx: &GalleryContext, id: &str, missing: &mut Missing) -> Option<Bundle> {
    let prefix = format!("Hero/{}/{}_S/", id, id);
    let assets = ctx.assets.get_by_prefix(&prefix);

    let mut processor = BundleProcessor::new(ctx.dir_gallery_data, None, MissingKey::Skill);
    processor.process_assets(assets, missing);
    processor.get_main_and_log(id, &format!("{}_S", id), missing, MissingAssetPolicy::Ignore)
}
