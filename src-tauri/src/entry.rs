use crate::assets::AssetLookup;
use crate::bundle::{Bundle, BundleProcessor};
use crate::constants::{
    DETAIL_BIRTHDAY, DETAIL_CONSTELLATION, DETAIL_CUP_SIZE, DETAIL_ELEMENT, DETAIL_HEIGHT,
    DETAIL_JOB, DETAIL_NAME, DETAIL_STARS, DETAIL_WEIGHT, FIELD_PREFAB, FIELD_ROLE_ID,
    FIELD_ROLE_MOTIONS, FILE_ROLE, FILE_ROLE_COLLECTION,
};
use crate::missing::{Missing, MissingKey};
use crate::rules::Rules;
use crate::utils::is_none_or_empty;
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
    #[serde(skip_serializing_if = "is_none_or_empty")]
    bond: Option<Vec<Bundle>>, // edge case, needs animations

    #[serde(skip_serializing_if = "is_none_or_empty")]
    collection: Option<Vec<String>>,
}

impl Entry {
    pub fn new(
        dir_gallery_data: String,
        id: &str,
        assets: &AssetLookup,
        variables: &VariableLookup,
        rules: &Rules,
        missing: &mut Missing,
    ) -> Result<Option<Self>> {
        Ok(
            if let Some((hero, alt)) =
                Self::init_hero(dir_gallery_data.clone(), id, assets, rules, missing)?
            {
                Some(Self {
                    id: id.to_string(),
                    icons: Icons::default(),
                    details: Details::new(id.to_string(), variables),

                    hero,
                    alt,
                    skill: Self::init_skill(dir_gallery_data.clone(), id, assets, missing)?,
                    bond: Self::init_bond(
                        dir_gallery_data.clone(),
                        id,
                        assets,
                        variables,
                        rules,
                        missing,
                    )?,

                    collection: Self::init_collection(id, assets, variables, rules, missing),
                })
            } else {
                None
            },
        )
    }

    fn init_hero(
        dir_gallery_data: String,
        id: &str,
        assets: &AssetLookup,
        rules: &Rules,
        missing: &mut Missing,
    ) -> Result<Option<(Bundle, Option<Bundle>)>> {
        let assets = Self::collect_hero_assets(id, assets, rules);
        let alt_regex = rules.get_alt(id).and_then(|p| Regex::new(p).ok());

        let mut processor =
            BundleProcessor::new(dir_gallery_data, alt_regex.as_ref(), MissingKey::Hero);
        processor.process_assets(assets, missing);
        processor.get_both_and_log(id.to_string(), id.to_string(), missing)
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

    fn init_skill(
        dir_gallery_data: String,
        id: &str,
        assets: &AssetLookup,
        missing: &mut Missing,
    ) -> Result<Option<Bundle>> {
        let prefix = format!("Hero/{}/{}_S/", id, id);
        let assets = assets.get_by_prefix(&prefix);

        let mut processor = BundleProcessor::new(dir_gallery_data, None, MissingKey::Skill);
        processor.process_assets(assets, missing);
        processor.get_main_and_log(id.to_string(), format!("{}_S", id), missing, false)
    }

    fn init_bond(
        dir_gallery_data: String,
        id: &str,
        assets: &AssetLookup,
        variables: &VariableLookup,
        rules: &Rules,
        missing: &mut Missing,
    ) -> Result<Option<Vec<Bundle>>> {
        if let Some(bonds) = Self::find_role_values(id, variables, rules, true) {
            let mut result = Vec::<Bundle>::new();

            for bond in bonds {
                missing.record_cg(bond.to_string());

                let prefix = format!("CG/{}/{}/", bond, bond);
                let assets = assets.get_by_prefix(&prefix);

                let mut processor =
                    BundleProcessor::new(dir_gallery_data.to_string(), None, MissingKey::Bond);
                processor.process_assets(assets, missing);

                if let Ok(Some(bundle)) =
                    processor.get_main_and_log(id.to_string(), bond, missing, true)
                {
                    result.push(bundle);
                }
            }

            return Ok(Some(result));
        }

        Ok(None)
    }

    fn init_collection(
        id: &str,
        assets: &AssetLookup,
        variables: &VariableLookup,
        rules: &Rules,
        missing: &mut Missing,
    ) -> Option<Vec<String>> {
        if let Some(collection) = Self::find_role_values(id, variables, rules, false) {
            let mut result = Vec::<String>::new();
            for cg in collection {
                missing.record_cg(cg.to_string());
                if let Some(path) = Self::find_collection(id, &cg, assets, missing) {
                    result.push(path);
                }
            }
            Some(result)
        } else {
            None
        }
    }

    fn find_collection(
        id: &str,
        cg: &str,
        assets: &AssetLookup,
        missing: &mut Missing,
    ) -> Option<String> {
        let search = |prefix: String, target: String| -> Option<(String, String)> {
            let results = assets.get_by_prefix(&prefix);

            for (container, files) in results {
                if container.ends_with(&target) {
                    let mut files: Vec<&String> = files.iter().filter(|file| *file == cg).collect();
                    if files.len() == 0 {
                        continue;
                    }

                    files.sort();
                    files.dedup();
                    return Some((container, files[0].to_string()));
                }
            }

            None
        };

        if let Some((shallow, name)) =
            search(format!("CG/{}/", cg), format!("/{}_LoveTalk.prefab", cg))
        {
            let spl: Vec<&str> = shallow.split("/").collect();
            let first = spl[..spl.len().saturating_sub(1)].join("/");
            Some(format!("{}/{}.png", first, name))
        } else if let Some((deep, _)) = search(format!("CG/{}/Img", cg), format!("/{}.png", cg)) {
            Some(deep)
        } else {
            missing.insert_log(
                id.to_string(),
                MissingKey::Collection,
                format!("Missing image (id '{}')", cg),
            );
            None
        }
    }

    fn find_role_values(
        id: &str,
        variables: &VariableLookup,
        rules: &Rules,
        find_motions: bool,
    ) -> Option<Vec<String>> {
        let regex: Vec<Regex> = rules
            .get_collection()
            .iter()
            .map(|s| Regex::new(s).unwrap())
            .collect();

        let collection = variables.get_file(FILE_ROLE_COLLECTION)?;
        let id_index = collection.get_column_index(FIELD_ROLE_ID)?;
        let prefab_index = collection.get_column_index(FIELD_PREFAB)?;
        let motions_index = collection.get_column_index(FIELD_ROLE_MOTIONS)?;

        let data = collection.get_data();
        let mut result = Vec::<(String, String)>::new();
        for (collection_id, cols) in data {
            if cols[id_index] == id && (cols[motions_index] != "") == find_motions {
                let val = cols[prefab_index].to_string();
                for reg in &regex {
                    if reg.is_match(&val) {
                        result.push((collection_id.to_string(), val));
                        break;
                    }
                }
            }
        }

        result.sort_by(|a, b| a.0.cmp(&b.0));
        Some(
            result
                .iter()
                .filter_map(|e| e.1.split("/").nth(1))
                .map(str::to_string)
                .collect(),
        )
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
