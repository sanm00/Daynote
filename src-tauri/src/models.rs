use serde::{Deserialize, Serialize};

pub const SCHEMA_VERSION: u32 = 4;

fn default_version() -> u32 {
    SCHEMA_VERSION
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TagDefinition {
    pub id: String,
    pub name: String,
    pub color: String,
}

pub fn default_tags() -> Vec<TagDefinition> {
    [
        ("工作", "work"),
        ("学习", "study"),
        ("生活", "life"),
        ("健康", "health"),
    ]
    .iter()
    .map(|(name, color)| TagDefinition {
        id: name.to_string(),
        name: name.to_string(),
        color: color.to_string(),
    })
    .collect()
}

fn legacy_palette() -> String {
    "warm".to_string()
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub theme: String,
    #[serde(default = "legacy_palette")]
    pub palette: String,
    pub default_tag: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub tag: String,
    pub prio: String,
    pub begin_date: Option<String>,
    pub end_date: Option<String>,
    pub done: bool,
    pub done_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parsed_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: i64,
    pub title: String,
    #[serde(default)]
    pub content: String,
    pub tag: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StateFile {
    #[serde(default = "default_version")]
    pub version: u32,
    pub settings: Settings,
    #[serde(default = "default_tags")]
    pub tags: Vec<TagDefinition>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StoreData {
    pub version: u32,
    pub settings: Settings,
    #[serde(default = "default_tags")]
    pub tags: Vec<TagDefinition>,
    pub tasks: Vec<Task>,
    pub notes: Vec<Note>,
}
