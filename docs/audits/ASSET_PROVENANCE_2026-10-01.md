# Visual-asset provenance (2026-10-01)

This inventory records sources and follow-up checks; it is not a legal opinion or a guarantee against claims.

| Asset | Provenance / notice | Follow-up |
| --- | --- | --- |
| Lily logo (`public/logos/`) | The project owner confirmed on 2026-10-01 that they created the logo. | Keep the original working file or dated creation record outside the public repository. |
| Shop avatars (`public/shop-avatars/`, 40 images) | The project owner confirmed on 2026-10-01 that these were created specifically for KRIN by the project assistant, not taken from an external avatar marketplace. | Retain the generation history and review individual outputs if a close-match claim is received. |
| Flower collection (`public/flower-chests/`, 104 photographs) | Wikimedia Commons source, author, individual license and local transformation are listed in `src/modules/motivation/utils/flower-photos.json` and on the public `/credits` page. | Check the source page again if an original uploader changes a license or authorship record. Preserve CC BY-SA conditions for adapted versions. |
| Interface icons (`lucide-react`) | ISC license, including Feather/MIT notices, copied verbatim to `public/licenses/lucide-react.txt` and linked from `/credits`. | Keep the notice when upgrading the package. |

The audit also removed unverified named student testimonials from the public homepage and deleted an unused lesson-preview component that hotlinked external Pixabay video URLs. The archived `/legacy/` prototype contains placeholder statistics and testimonials; its public URLs now redirect to the current homepage. Future testimonials should be published only with evidence of authenticity and the speaker's permission. Third-party uploads and CMS content need their own source/permission review before publication.
