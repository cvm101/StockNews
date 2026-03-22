import Groq from "groq-sdk";

// Initialize the Groq client
// Note: dangerouslyAllowBrowser is used here for our local React project.
// In a real, public production app, you would move this to a backend server to hide the API key!
const groq = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY, // Ensure this matches your .env file
    dangerouslyAllowBrowser: true
});

export async function getInvestmentSummary(news, portfolio) {
    if (!news) return "No news provided to analyze.";

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an expert financial advisor. 
          
          The user has the following specific investment portfolio: ${portfolio}
          
          Read the provided live market news. Give a short, insightful summary of how this news specifically impacts the user's portfolio. 
          
          If the news doesn't explicitly mention their specific assets, give a general market outlook and explain how the current trends might affect their specific sectors or asset classes. Keep the formatting clean and keep the response under 4 paragraphs.`
                },
                {
                    role: "user",
                    content: `Here is the latest market news: ${news}`
                }
            ],
            // llama3-8b-8192 is incredibly fast, but you can change this to llama-3.1-70b-versatile for deeper logic
            model: "llama-3.1-8b-instant",
            temperature: 0.7,
        });

        return chatCompletion.choices[0]?.message?.content || "No summary generated.";
    } catch (error) {
        console.error("Error fetching AI summary:", error);
        return "Sorry, there was an error generating the AI summary. Please check your Groq API key and console logs.";
    }
}

// --- NEW: Generate a Strategy & Smart Move ---
export async function getSmartAnalysis(newsArticles, portfolioItems, category) {
    if (!newsArticles || newsArticles.length === 0) return "No news available to analyze.";
    if (!portfolioItems || portfolioItems.length === 0) return `You don't have any ${category} saved yet. Add some on the Dashboard first!`;

    // Turn the array of news objects into a readable string for the AI
    const newsText = newsArticles.map((n, i) => `${i + 1}. ${n.headline}: ${n.summary}`).join('\n');

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an elite wealth manager. The user holds the following ${category}: ${portfolioItems.join(', ')}.
          
          Read the following 10 recent financial news headlines. 
          
          Respond with two sections:
          1. "Impact on Your Portfolio": Explain how this specific news might positively or negatively affect their exact ${category}. If the news is unrelated, explain the broad market effect on this asset class.
          2. "Next Smart Move": Give a highly actionable, 1-2 sentence recommendation on what the user should do right now (e.g., Hold, Buy on dips, Rebalance, etc.). Keep it concise and professional.`
                },
                {
                    role: "user",
                    content: `Here are the latest 10 articles:\n${newsText}`
                }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.7,
        });

        return chatCompletion.choices[0]?.message?.content || "No analysis generated.";
    } catch (error) {
        console.error("Error fetching Smart Analysis:", error);
        return "Error generating strategy.";
    }
}