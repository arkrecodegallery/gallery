use anyhow::{anyhow, Context, Result};
use quick_xml::events::{BytesEnd, BytesStart, BytesText, Event};
use quick_xml::reader::Reader;
use std::collections::HashMap;
use std::str;

use crate::constants::{DIR_ASSETS, DIR_GALLERY_DATA, FILE_ASSETS_XML};

pub struct AssetLookup {
    pub map: HashMap<String, Vec<String>>,

    duplicates: HashMap<String, usize>,
    current_name: String,
    current_container: String,
    current_element: String,
    in_asset: bool,
}

impl AssetLookup {
    pub fn new() -> Result<Self> {
        let mut assets = Self {
            map: HashMap::new(),
            duplicates: HashMap::new(),
            current_name: String::new(),
            current_container: String::new(),
            current_element: String::new(),
            in_asset: false,
        };

        let xml = format!("{}{}", DIR_GALLERY_DATA, FILE_ASSETS_XML);
        assets
            .parse_xml(&xml)
            .with_context(|| format!("unable to parse xml file '{}'", xml))?;

        Ok(assets)
    }

    fn parse_xml(&mut self, file_name: &str) -> Result<()> {
        let mut reader = Reader::from_file(file_name).context("unable to read xml file")?;
        reader.config_mut().trim_text(true);
        let mut buf = Vec::new();

        loop {
            match reader.read_event_into(&mut buf) {
                Ok(Event::Start(e)) => self.start(e),
                Ok(Event::End(e)) => self.end(e),
                Ok(Event::Text(e)) => self.text(e)?,
                Ok(Event::Eof) => break,
                Err(e) => return Err(anyhow!(e)),
                _ => (),
            }

            buf.clear();
        }

        Ok(())
    }

    fn start(&mut self, e: BytesStart) {
        self.current_element = String::from_utf8_lossy(e.name().as_ref()).to_string();
        if self.current_element == "Asset" {
            self.in_asset = true;
            self.current_name.clear();
            self.current_container.clear();
        }
    }

    fn end(&mut self, e: BytesEnd) {
        let element_name = String::from_utf8_lossy(e.name().as_ref()).to_string();

        if element_name == "Asset" && self.in_asset {
            if !self.current_name.is_empty() && !self.current_container.is_empty() {
                self.add_asset(self.current_container.clone(), self.current_name.clone());
            }
            self.in_asset = false;
        }

        self.current_element.clear();
    }

    fn text(&mut self, e: BytesText) -> Result<()> {
        if self.in_asset {
            let text = e
                .decode()
                .with_context(|| {
                    format!(
                        "failed to decode the text inside of the '{}' element",
                        self.current_element
                    )
                })?
                .into_owned();
            match self.current_element.as_str() {
                "Name" => {
                    self.current_name = text;
                    self.duplicates
                        .entry(self.current_name.clone())
                        .and_modify(|count| *count += 1)
                        .or_insert(0);
                }
                "Container" => self.current_container = text,
                _ => (),
            }
        }

        Ok(())
    }

    fn add_asset(&mut self, container: String, name: String) {
        self.map
            .entry(container)
            .or_insert_with(Vec::new)
            .push(name);
    }

    pub fn get_by_prefix(&self, prefix: &str) -> Vec<(String, Vec<String>)> {
        let container = self.get_container(prefix);

        self.map
            .iter()
            .filter(|(path, _)| path.starts_with(&container))
            .map(|(k, v)| (k.clone(), v.to_vec()))
            .collect()
    }

    fn get_container(&self, prefix: &str) -> String {
        format!("{}{}", DIR_ASSETS, prefix)
    }
}
