use crate::constants::{FIELD_DYNAMIC, FILE_ROLE};
use crate::variables::VariableLookup;

/// Finds the cg id linked to `id` via Role.txt's `DynamicField{n}` =
/// `ConnectArtifact#A####` convention
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
