/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public Google OAuth client ID for the optional Drive report export. */
  readonly VITE_GOOGLE_OAUTH_CLIENT_ID?: string;
  /** Optional Drive folder created by this app for report exports. */
  readonly VITE_GOOGLE_DRIVE_EXPORT_FOLDER_ID?: string;
  /** NASA Open API key for the optional EPIC Earth backdrop. Public in the bundle. */
  readonly VITE_NASA_API_KEY?: string;
}

declare module '*.glb' {
  const src: string;
  export default src;
}

declare module '*.gltf' {
  const src: string;
  export default src;
}

declare module '*.mp4' {
  const src: string;
  export default src;
}

declare module '*.webm' {
  const src: string;
  export default src;
}

declare module '*.md?raw' {
  const content: string;
  export default content;
}

declare module '*.txt?raw' {
  const content: string;
  export default content;
}
