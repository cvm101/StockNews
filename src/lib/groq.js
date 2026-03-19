import Groq from "groq-sdk";

// Initialize Groq.
// Note: dangerouslyAllowBrowser is set to true so you can test this purely on the frontend without needing a backend server yet.
const groq = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true
});

export async function getInvestmentSummary(newsData, assetCategory) {
    // Our professional prompt we discussed earlier
    const prompt = `You are an expert financial analyst. I am providing you with the top latest news regarding the Indian ${assetCategory} market. 
  Based ONLY on this news, provide exactly 5 concise bullet points summarizing where a smart investor should look, and whether the general sentiment is bullish (buy) or bearish (sell). Do not include any fluff. 
  
  Here is the news:
  ${newsData}`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant", // This is Groq's super fast, free Llama 3 model
            temperature: 0.2, // Keeps the AI highly analytical and strictly focused on the facts
        });

        return chatCompletion.choices[0].message.content;
    } catch (error) {
        console.error("Error fetching AI summary:", error);
        return "Could not generate summary at this time.";
    }
}