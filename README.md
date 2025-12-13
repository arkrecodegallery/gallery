# Gallery

Gallery is a dedicated Spine model viewing app.

> [!IMPORTANT]
> Disclaimers:
>
> 1. **User-Provided Content**: This app operates on a "bring-your-own-files" basis. It organizes user-supplied model files and does not host, distribute, or provide instructions for acquiring game assets.
> 2. **NSFW Content**: The application is designed to display model data, which may include Not Safe For Work (NSFW) or adult content such as nudity and suggestive material. Users are solely responsible for the content they choose to load and view.
> 3. **Spine License Requirement**: This software incorporates the Spine runtime. As specified in the [Spine Web Runtimes licensing terms](https://github.com/XfLoops/spine-web-runtimes?tab=readme-ov-file#licensing), all users must possess a valid, up-to-date [commercial license for Spine](https://esotericsoftware.com/spine-purchase) from Esoteric Software.
>
> By using this application, you affirm that you:
>
> -   Accept all responsibility for the files you provide.
> -   Are of legal age to view adult content in your region.
> -   Comply with the Spine license requirement.

## Setup

The app will prompt you for a source directory. Inside this source directory, you should have the following:

-   An `assets.xml` outlining the assets that exist in the `containers` directory.
-   A `containers` directory containing all of the files; contains all of the Sprite, TextAsset, and Texture2D files needed to reconstruct the models.

## Technology

For the frontend, this app utilizes [Svelte](https://svelte.dev/) with [TypeScript](https://www.typescriptlang.org/), [tailwindcss](https://tailwindcss.com/), and [Shadcn](https://www.shadcn-svelte.com/) for the UI and [Esoteric Software's Spine webgl runtime](https://github.com/XfLoops/spine-web-runtimes) for the model displaying. For the backend, this app uses [Tauri](https://v2.tauri.app/) with [Rust](https://rust-lang.org/).
