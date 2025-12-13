use std::collections::HashMap;

use anyhow::{Context, Result};

use crate::constants::{
    DIR_ASSETS, DIR_CONTAINERS, DIR_GALLERY_DATA, DIR_STATIC_DATA, FILE_ARTIFACT, FILE_ENG,
    FILE_ROLE, FILE_ROLE_COLLECTION, FILE_SKILL,
};

pub struct VariableLookup {
    files: HashMap<String, CSVFile>,
    variables: HashMap<String, String>,
}

impl VariableLookup {
    pub fn new() -> Result<Self> {
        let mut files = HashMap::new();
        let mut variables = HashMap::new();

        for file in [FILE_ARTIFACT, FILE_ROLE, FILE_ROLE_COLLECTION, FILE_SKILL] {
            let path = Self::get_file_path(file);
            files.insert(file.to_string(), CSVFile::new(path, &mut variables)?);
        }

        Self::resolve_variables(&mut variables)?;
        Ok(Self { files, variables })
    }

    fn resolve_variables(variables: &mut HashMap<String, String>) -> Result<()> {
        let path = Self::get_file_path(FILE_ENG);
        let bytes: Vec<u8> = std::fs::read(&path)?;
        let content = String::from_utf8_lossy(&bytes);
        let mut reader = csv::ReaderBuilder::new()
            .delimiter(b'@')
            .from_reader(content.as_bytes());

        while let Some(result) = reader.records().next() {
            match result {
                Ok(record) => {
                    variables
                        .entry(record.get(0).unwrap_or_default().to_string())
                        .and_modify(|v| *v = record.get(1).unwrap_or_default().to_string());
                }
                Err(e) => match e.kind() {
                    csv::ErrorKind::UnequalLengths {
                        pos: _,
                        expected_len: _,
                        len: _,
                    } => {
                        continue;
                    }
                    _ => return Err(e.into()),
                },
            }
        }

        Ok(())
    }

    fn get_file_path(file: &str) -> String {
        format!(
            "{}{}{}{}{}",
            DIR_GALLERY_DATA, DIR_CONTAINERS, DIR_ASSETS, DIR_STATIC_DATA, file
        )
    }

    pub fn get_file(&self, file_name: &str) -> Option<&CSVFile> {
        self.files.get(file_name)
    }

    pub fn lookup(&self, file_name: &str, id: &str, column: &str) -> Option<String> {
        self.files
            .get(file_name)?
            .lookup(id, column)
            .map(|raw| self.variables.get(&raw).cloned().unwrap_or(raw))
    }
}

pub struct CSVFile {
    columns: HashMap<String, usize>,
    data: HashMap<String, Vec<String>>,
}

impl CSVFile {
    pub fn new(path: String, variables: &mut HashMap<String, String>) -> Result<Self> {
        let mut csv = Self {
            columns: HashMap::new(),
            data: HashMap::new(),
        };
        csv.parse_csv(path, variables)?;
        Ok(csv)
    }

    fn parse_csv(&mut self, path: String, variables: &mut HashMap<String, String>) -> Result<()> {
        let bytes: Vec<u8> = std::fs::read(&path)?;
        let content = String::from_utf8_lossy(&bytes);
        let mut reader = csv::ReaderBuilder::new()
            .delimiter(b'@')
            .from_reader(content.as_bytes());

        // set columns
        let headers = reader
            .headers()
            .with_context(|| format!("failed to read headers from '{}'", &path))?;
        for (i, key) in headers.iter().enumerate() {
            self.columns.insert(key.to_string(), i);
        }

        // set data
        while let Some(result) = reader.records().next() {
            let record =
                result.with_context(|| format!("failed to parse row of csv file '{}'", &path))?;

            let mut key = String::new();
            for (i, field) in record.iter().enumerate() {
                if i == 0 {
                    key = field.to_string();
                }

                self.data
                    .entry(key.clone())
                    .or_insert_with(|| Vec::new())
                    .push(field.to_string());

                if field.starts_with("T_") {
                    variables.insert(field.to_string(), "".to_string());
                }
            }
        }

        Ok(())
    }

    pub fn lookup(&self, id: &str, column: &str) -> Option<String> {
        let row = self.data.get(id)?;
        let key = self.columns.get(column)?;
        Some(row[*key].to_string())
    }

    pub fn get_columns(&self) -> &HashMap<String, usize> {
        &self.columns
    }
}
