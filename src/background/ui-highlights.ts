async function getHighlightsToShow(): Promise<string[]> {
    return [];
}

async function hideHighlights(_keys: string[]): Promise<void> {}

async function restoreHighlights(_keys: string[]): Promise<void> {}

export default {
    getHighlightsToShow,
    hideHighlights,
    restoreHighlights,
};
