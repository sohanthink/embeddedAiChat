import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import CompanyData from "@/data/CompanyData.json"; // Ensure JSON path is correct

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "error on API Key", // Fallback for TypeScript
});

// Define data structures for FAQ and Company Data
type FAQ = {
  question: string;
  answer: string;
};

type CompanyDataType = {
  companyName: string;
  about: string;
  services: string[];
  faq: FAQ[];
};

// Type guard for HTTP POST method
const isPostMethod = (req: NextApiRequest): boolean => req.method === "POST";

// Main handler function for the API endpoint
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check if request method is POST
  if (!isPostMethod(req)) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Extract user message from request body
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  // Check if the user's question matches an FAQ entry
  const companyData = CompanyData as CompanyDataType;
  const faqMatch = companyData.faq.find((faq) =>
    message.toLowerCase().includes(faq.question.toLowerCase())
  );

  // Respond with FAQ answer if found
  if (faqMatch) {
    return res.status(200).json({ reply: faqMatch.answer });
  }

  // Define messages array strictly according to expected types
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    {
      role: "system",
      content: `You are a helpful assistant for a company called ${companyData.companyName}. Here is some information about the company:
      - About: ${companyData.about}
      - Services: ${companyData.services.join(", ")}`,
    },
    {
      role: "user",
      content: message,
    },
  ];

  try {
    // Send prompt to OpenAI and retrieve response
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Chat model endpoint
      messages,
      max_tokens: 100,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || "";

    // Check if the AI response is generic or unrelated
    const irrelevantResponses = [
      "I'm sorry, I couldn't find an answer.",
      "I'm not sure about that.",
      "I don't have enough information."
    ];

    // If response is irrelevant or empty, suggest contacting support
    if (!reply || irrelevantResponses.some((phrase) => reply.includes(phrase))) {
      return res.status(200).json({
        reply: `It seems your question is outside of our available information. Please contact our support team at support@company.com for more assistance.`,
      });
    }

    // Otherwise, respond with the AI-generated reply
    res.status(200).json({ reply });

  } catch (error) {
    console.error("OpenAI API error:", error);
    res.status(500).json({ error: "An error occurred while processing your request." });
  }
}
