use anyhow::{Context, Result};

use crate::{constants::FILE_ROLE, rules::Rules, variables::VariableLookup};

pub fn get_hero_ids(variables: &VariableLookup, rules: &Rules) -> Result<Vec<String>> {
    let roles = variables
        .get_file(FILE_ROLE)
        .with_context(|| format!("missing role file {}", FILE_ROLE))?;
    let data = roles.get_data();

    let mut result = Vec::<String>::new();
    for (id, _) in data {
        if id.starts_with('H') && id.len() == 4 {
            result.push(id.to_string());
        }
    }
    for id in rules.get_extra() {
        result.push(id.to_string());
    }
    result.sort();

    Ok(result)
}

pub fn is_none_or_empty<T>(opt: &Option<Vec<T>>) -> bool {
    opt.as_ref().map_or(true, |v| v.is_empty())
}
