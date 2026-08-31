use crate::constants::{FIELD_DYNAMIC, FILE_ROLE};
use crate::variables::VariableLookup;

/// Role.txt convention: `DynamicField{n}` = `ConnectArtifact#A####`.
pub(super) fn find_connect_artifact_cg(id: &str, variables: &VariableLookup) -> Option<String> {
    let role = variables.get_file(FILE_ROLE)?;
    let cols = role.get_data().get(id)?;

    (1..)
        .map_while(|i| role.get_column_index(&format!("{}{}", FIELD_DYNAMIC, i)))
        .find_map(|idx| {
            cols[idx]
                .starts_with("ConnectArtifact#A")
                .then(|| cols[idx].split('#').last().unwrap().to_string())
        })
}
