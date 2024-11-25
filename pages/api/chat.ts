import { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";

// Import your JSON data
import jsonData from "@/data/data.json";

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Filtering function to narrow down relevant data
const filterData = (query: string, data: any) => {
  const results = [];
  for (const category in data) {
    results.push(
      ...data[category].filter((item: any) =>
        JSON.stringify(item).toLowerCase().includes(query.toLowerCase())
      )
    );
  }
  return results;
};

// Main handler function
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { message } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "A valid message is required." });
    }

    // Filter data based on user query
    const filteredResults = filterData(message, jsonData);

    // If relevant results are found, pass them to GPT
    if (filteredResults.length > 0) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4", // Use GPT-4 for better contextual understanding
        messages: [
          {
            role: "system",
            content: `You are an assistant that answers questions based on the following JSON data: ${JSON.stringify(
              filteredResults
            )}. If no answer is found in this data, say: "I couldn't find anything relevant in the provided data."`,
          },
          { role: "user", content: message },
        ],
        max_tokens: 1000,
      });

      const reply =
        completion.choices?.[0]?.message?.content?.trim() ||
        "I couldn't find an answer in the provided data.";

      return res.status(200).json({ reply });
    }

    // If no match is found, fallback to OpenAI's general knowledge
    const fallbackCompletion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an assistant with no additional context. Answer questions using only your general knowledge.`,
        },
        { role: "user", content: message },
      ],
      max_tokens: 1000,
    });

    const fallbackReply =
      fallbackCompletion.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I couldn't find an answer to your question.";

    return res.status(200).json({ reply: fallbackReply });
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while processing your request." });
  }
}
