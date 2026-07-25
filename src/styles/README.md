# Central Styles Directory

This folder centralizes style assets for easier navigation and review.

## Structure

- `sources/` — copied snapshots of style sources from across the project
- `combined/all-project-styles.css` — one aggregated file containing all collected project styles
- `main/` — modularized current styles for the Main landing page
- `main.css` — entry file that imports all `main/*` parts

## Main Page Split

- `main/base.css` — variables, resets, base typography, buttons, common pills
- `main/header-hero-teacher.css` — announcement bar, header/nav, hero, trust, teacher-entry
- `main/sections-content.css` — cards, feature blocks, course/levels grids, faq, newsletter, footer
- `main/overlays-auth-scroll.css` — scroll-to-top and auth modal styles
- `main/responsive.css` — all media queries from the current Main page

## Important

- Project styles are centralized here for navigation and maintenance.
- Runtime styling for Main landing now loads from `styles/main.css`.
- `sources/` remains a snapshot/reference area.

## Included Sources

- `Main/Main.styles.css` -> `src/styles/sources/Main.Main.styles.css`
- `index.html` inline `<style>` -> `src/styles/sources/index.inline.css`
- `src/app/globals.css` -> `src/styles/sources/src.app.globals.css`
- `src/core/styles/animations.css` -> `src/styles/sources/src.core.styles.animations.css`
- `src/core/styles/buttons.css` -> `src/styles/sources/src.core.styles.buttons.css`
- `src/core/styles/forms.css` -> `src/styles/sources/src.core.styles.forms.css`
- `src/core/styles/themes.css` -> `src/styles/sources/src.core.styles.themes.css`
- `src/core/styles/typography.css` -> `src/styles/sources/src.core.styles.typography.css`
- `src/core/styles/utilities.css` -> `src/styles/sources/src.core.styles.utilities.css`
- `src/core/styles/variables.css` -> `src/styles/sources/src.core.styles.variables.css`
