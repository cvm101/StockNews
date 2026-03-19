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