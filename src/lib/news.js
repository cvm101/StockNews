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