export const LANGUAGES = [
    { code: "auto", name: "Auto Detection" },
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "it", name: "Italian" },
    { code: "pt", name: "Portuguese" },
    { code: "nl", name: "Dutch" },
    { code: "ja", name: "Japanese" },
    { code: "zh", name: "Chinese" },
    { code: "ru", name: "Russian" },
    // Add more as needed, keeping it simple for now but covering major ones
];

export const MODELS = ["tiny", "base", "small", "medium", "large", "large-v2", "large-v3"];
export const TASKS = ["transcribe", "translate"];
export const OUTPUT_FORMATS = ["txt", "vtt", "srt", "tsv", "json", "all"];
