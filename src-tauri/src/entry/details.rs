use serde::{Deserialize, Serialize};

use crate::constants::{
    DETAIL_BIRTHDAY, DETAIL_CONSTELLATION, DETAIL_CUP_SIZE, DETAIL_ELEMENT, DETAIL_HEIGHT,
    DETAIL_JOB, DETAIL_NAME, DETAIL_STARS, DETAIL_WEIGHT, DIR_ASSETS, FILE_ROLE,
};
use crate::variables::VariableLookup;

#[derive(Serialize, Deserialize, Clone, Default)]
pub(super) struct Icons {
    hero: String,
}

pub(super) fn init_icons(id: &str) -> Icons {
    // TODO
    // check rules for corrections (some need manual corrections)
    // then check for if this icon exists
    // if not, replace with No_Icon.png && log as missing

    Icons {
        hero: format!("{}Hero/{}/Img/Icon_Head_S_{}.png", DIR_ASSETS, id, id),
    }
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub(super) struct Details {
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
    pub(super) fn new(id: &str, variables: &VariableLookup) -> Self {
        let mut details = Self::default();

        macro_rules! lookup_field {
            ($variables:expr, $id:expr, $detail:ident => $field:ident) => {
                if let Some(value) = $variables.lookup(FILE_ROLE, $id, $detail) {
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
