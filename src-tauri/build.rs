fn main() {
  // generate_context! embeds icons in the executable. Recompile when they change.
  println!("cargo:rerun-if-changed=icons");
  tauri_build::build()
}
