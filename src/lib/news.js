const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY;

export async function fetchLatestMarketNews() {
    // We use Finnhub's general market news category
    const url = `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // Finnhub returns an array of objects. We'll check if it exists and has items.
        if (data && data.length > 0) {
            // Slice the array to grab only the top 10 most recent articles
            const top10Articles = data.slice(0, 10);

            // Extract the headline and summary for the AI to read
            const newsSummaries = top10Articles.map((article, index) =>
                `${index + 1}. ${article.headline}: ${article.summary}`
            ).join('\n');

            return newsSummaries;
        }
        return "No significant market news found today.";
    } catch (error) {
        console.error("Error fetching news from Finnhub:", error);
        return "Error retrieving live news.";
    }
}

// Add this to the bottom of src/lib/news.js
export async function searchStockSymbol(query) {
    if (!query || query.length < 2) return []; // Don't search if it's blank or 1 letter

    const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // Finnhub returns results in an array called "result"
        if (data.result) {
            // Return just the top 5 matches to keep the UI clean
            return data.result.slice(0, 5);
        }
        return [];
    } catch (error) {
        console.error("Error searching Finnhub:", error);
        return [];
    }
}

export async function searchSIP(query) {
    if (!query || query.length < 3) return []; // Require at least 3 letters

    try {
        const response = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        // mfapi returns an array of objects. We'll grab the top 5 matches.
        if (data && data.length > 0) {
            return data.slice(0, 5);
        }
        return [];
    } catch (error) {
        console.error("Error searching SIPs:", error);
        return [];
    }
}