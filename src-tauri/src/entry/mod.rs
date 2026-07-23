mod bond;
mod collection;
mod details;
mod hero;

use crate::assets::AssetLookup;
use crate::bundle::{Bundle, MainAndAlt};
use crate::missing::Missing;
use crate::rules::Rules;
use crate::utils::is_none_or_empty;
use crate::variables::VariableLookup;

use bond::BondPresentation;
use details::{Details, Icons};

use serde::{Deserialize, Serialize};

/// Read-only pipeline state shared by every step of building an `Entry`,
/// so it can be passed as a single reference instead of threading each
/// lookup table through every function individually.
pub struct GalleryContext<'a> {
    pub dir_gallery_data: &'a str,
    pub assets: &'a AssetLookup,
    pub variables: &'a VariableLookup,
    pub rules: &'a Rules,
}

#[derive(Serialize, Deserialize)]
pub struct Entry {
    id: String,
    icons: Icons,
    details: Details,

    hero: Bundle,
    #[serde(skip_serializing_if = "Option::is_none")]
    alt: Option<Bundle>,
    #[serde(skip_serializing_if = "Option::is_none")]
    skill: Option<Bundle>,
    #[serde(skip_serializing_if = "is_none_or_empty")]
    bond: Option<Vec<BondPresentation>>,

    #[serde(skip_serializing_if = "is_none_or_empty")]
    collection: Option<Vec<String>>,
}

impl Entry {
    pub fn new(ctx: &GalleryContext, id: &str, missing: &mut Missing) -> Option<Self> {
        let MainAndAlt { main: hero, alt } = hero::init_hero(ctx, id, missing)?;

        Some(Self {
            id: id.to_string(),
            icons: details::init_icons(id),
            details: Details::new(id, ctx.variables, ctx.rules),

            hero,
            alt,
            skill: hero::init_skill(ctx, id, missing),
            bond: bond::init_bond(ctx, id, missing),

            collection: collection::init_collection(ctx, id, missing),
        })
    }

    pub fn build_file_path(container: &str, file_name: &str) -> String {
        let path = std::path::Path::new(container);
        let parent = path.parent().unwrap().display();
        format!("{}/{}", parent, file_name)
    }
}
