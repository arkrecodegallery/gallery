# Gallery

Ark Re:Code Gallery is a dedicated  model viewing app designed specifically for the gacha game *[Ark Re:Code](https://www.arkrecode.com/landing_page_en.html)*.

> [!IMPORTANT]
> Important Disclaimers:
>
> 1. **Third-Party Project**: This application is an independent, fan-made project and is not affiliated with, endorsed by, or sponsored by the creators or publishers of Ark Re:Code. All associated game assets, characters, and trademarks are the property of their respective owners.
> 2. **User-Provided Content**: This app operates on a "bring-your-own-files" basis. It organizes user-supplied model files and does not host, distribute, or provide instructions for acquiring game assets.
> 3. **NSFW Content**: The application is designed to display model data, which may include Not Safe For Work (NSFW) or adult content such as nudity and suggestive material. Users are solely responsible for the content they choose to load and view.
> 4. **Spine License Requirement**: This software incorporates the Spine runtime. As specified in the [Spine Web Runtimes licensing terms](https://github.com/XfLoops/spine-web-runtimes?tab=readme-ov-file#licensing), all users must possess a valid, up-to-date [commercial license for Spine](https://esotericsoftware.com/spine-purchase) from Esoteric Software.
> 
> By using this application, you affirm that you:
> - Acknowledge this is an unofficial project.
> - Accept all responsibility for the files you provide.
> - Are of legal age to view adult content in your region.
> - Comply with the Spine license requirement.

## Setup

The app will prompt you for a destination folder. Inside this destination folder, you should have two folders: **TextAsset** (containing a dump of *all* text assets, i.e. txt, skel, and atlas files) and **Texture2D** (containing a dump of all images, i.e. pngs).

For an example of what this output folder structure looks like, see the output exported by [Asset Studio](https://github.com/aelurum/AssetStudio).

## Technology

This web app uses [Esoteric Software's Spine webgl runtime](https://github.com/XfLoops/spine-web-runtimes). This serves as the backbone of the app, as it is the same software with which the *Ark Re:Code* team originally developed their models.

For the frontend, this app utilizes [Svelte](https://svelte.dev/) with [TypeScript](https://www.typescriptlang.org/), [tailwindcss](https://tailwindcss.com/), and [Shadcn](https://www.shadcn-svelte.com/).

For the backend, this app uses [Tauri](https://v2.tauri.app/) with [Rust](https://rust-lang.org/).