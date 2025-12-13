use crate::assets::AssetLookup;
use crate::bundle::{Bundle, BundleProcessor};
use crate::constants::{
    CONNECT_ARTIFACT, DETAIL_BIRTHDAY, DETAIL_CONSTELLATION, DETAIL_CUP_SIZE, DETAIL_ELEMENT,
    DETAIL_HEIGHT, DETAIL_JOB, DETAIL_NAME, DETAIL_STARS, DETAIL_WEIGHT, FIELD_DYNAMIC, FILE_ROLE,
};
use crate::rules::Rules;
use crate::variables::VariableLookup;

use anyhow::Result;
use regex::Regex;
use serde::{Deserialize, Serialize};

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
    #[serde(skip_serializing_if = "Option::is_none")]
    bond: Option<Bundle>, // edge case, needs animations

    #[serde(skip_serializing_if = "Option::is_none")]
    collection: Option<Vec<String>>,
}

impl Entry {
    pub fn new(
        id: &str,
        assets: &AssetLookup,
        variables: &VariableLookup,
        rules: &Rules,
    ) -> Result<Option<Self>> {
        Ok(
            if let Some((hero, alt)) = Self::init_hero(id, assets, rules)? {
                Some(Self {
                    id: id.to_string(),
                    icons: Icons::default(),
                    details: Details::new(id.to_string(), variables),

                    hero,
                    alt,
                    skill: Self::init_skill(id, assets)?,
                    bond: Self::init_bond(id, assets, variables)?,

                    collection: None,
                })
            } else {
                None
            },
        )
    }

    fn init_hero(
        id: &str,
        assets: &AssetLookup,
        rules: &Rules,
    ) -> Result<Option<(Bundle, Option<Bundle>)>> {
        let assets = Self::collect_hero_assets(id, assets, rules);
        let alt_regex = rules.get_alt(id).and_then(|p| Regex::new(p).ok());

        let mut processor = BundleProcessor::new(alt_regex.as_ref());
        processor.process_assets(assets);
        Ok(processor.get_both()?)
    }

    fn collect_hero_assets(
        id: &str,
        assets: &AssetLookup,
        rules: &Rules,
    ) -> Vec<(String, Vec<String>)> {
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

    fn init_skill(id: &str, assets: &AssetLookup) -> Result<Option<Bundle>> {
        let prefix = format!("Hero/{}/{}_S/", id, id);
        let assets = assets.get_by_prefix(&prefix);

        let mut processor = BundleProcessor::new(None);
        processor.process_assets(assets);
        Ok(processor.get_main()?)
    }

    fn init_bond(
        id: &str,
        assets: &AssetLookup,
        variables: &VariableLookup,
    ) -> Result<Option<Bundle>> {
        if let Some(bond) = Self::find_bond(id, variables) {
            let prefix = format!("CG/{}/{}/", bond, bond);
            let assets = assets.get_by_prefix(&prefix);

            let mut processor = BundleProcessor::new(None);
            processor.process_assets(assets);
            return Ok(processor.get_main()?);
        }

        Ok(None)
    }

    fn find_bond(id: &str, variables: &VariableLookup) -> Option<String> {
        if let Some(file) = variables.get_file(FILE_ROLE) {
            let mut results = Vec::<String>::new();

            for (column, _) in file.get_columns() {
                if column.starts_with(FIELD_DYNAMIC) {
                    if let Some(value) = file.lookup(id, column) {
                        results.push(value);
                    }
                }
            }

            for result in results {
                if result.starts_with(CONNECT_ARTIFACT) {
                    return result.split("#").into_iter().last().map(|v| v.to_string());
                }
            }
        }

        None
    }

    fn init_collection(id: &str, assets: &AssetLookup, variables: &VariableLookup) -> Vec<String> {
        // iterate over the RoleID column of RoleCollection, take note of the IDs of any that match
        // iterate over all the IDs and check it has no RoleMotions column
        // note the true asset name from the assets list CG/AXXXX/Img/
        // only AXXXX worth the effort
        // push corrected path to collection

        

        Vec::new()
    }

    pub fn build_file_path(container: &str, file_name: &str) -> String {
        let path = std::path::Path::new(container);
        let parent = path.parent().unwrap().display();
        format!("{}/{}", parent, file_name)
    }
}

#[derive(Serialize, Deserialize, Clone, Default)]
struct Icons {
    hero: String,
}

#[derive(Serialize, Deserialize, Clone, Default)]
struct Details {
    name: String,
    stars: String,
    element: String,
    job: String,
    constellation: String,
    cup_size: String,
    birthday: String,
    height: String,
    weight: String,
}

impl Details {
    pub fn new(id: String, variables: &VariableLookup) -> Self {
        let mut details = Self::default();

        macro_rules! lookup_field {
            ($variables:expr, $id:expr, $detail:ident => $field:ident) => {
                if let Some(value) = $variables.lookup(FILE_ROLE, &$id, $detail) {
                    details.$field = value;
                }
            };
        }

        lookup_field!(variables, id, DETAIL_NAME => name);
        lookup_field!(variables, id, DETAIL_STARS => stars);
        lookup_field!(variables, id, DETAIL_ELEMENT => element);
        lookup_field!(variables, id, DETAIL_JOB => job);
        lookup_field!(variables, id, DETAIL_CONSTELLATION => constellation);
        lookup_field!(variables, id, DETAIL_CUP_SIZE => cup_size);
        lookup_field!(variables, id, DETAIL_BIRTHDAY => birthday);
        lookup_field!(variables, id, DETAIL_HEIGHT => height);
        lookup_field!(variables, id, DETAIL_WEIGHT => weight);

        if details.name == "" {
            details.name = id.to_string();
        }

        details
    }
}
