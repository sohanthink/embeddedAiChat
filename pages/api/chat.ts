import { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import Fuse from "fuse.js";
import jsonData from "@/data/data.json"; // Import your JSON file

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "", // Set your API key in the environment
});

// Flatten nested data to make everything searchable
const flattenData = (data: any[]) => {
  const flatData: any[] = [];

  data.forEach((item) => {
    if (item.questions) {
      flatData.push(...item.questions); // Extract 'questions' from FAQ
    } else if (item.reasons) {
      flatData.push(...item.reasons); // Extract 'reasons' from AffiliatePartner
    } else if (item.testimonials) {
      flatData.push(...item.testimonials); // Extract 'testimonials'
    } else if (item.services) {
      flatData.push({ description: item.services.join(", "), ...item }); // Flatten 'services'
    } else if (item.reviews) {
      flatData.push(...item.reviews); // Flatten 'reviews'
    } else {
      flatData.push(item); // Include everything else
    }
  });

  return flatData;
};

// Main filter function
const filterData = (query: string, data: any[]) => {
  const flatData = flattenData(data);

  console.log("Flat Data for Search:", flatData);

  // Preprocess query
  const preprocessQuery = (query: string) => {
    return query
      .toLowerCase()
      .trim();
  };

  const processedQuery = preprocessQuery(query);

  // Fuzzy matching with Fuse.js
  const fuse = new Fuse(flatData, {
    keys: ["question", "answer", "tags", "title", "description", "link", "reasons", "title", "name", "about", "services", "description", "courseLink", "category", "previewLink", "technologies", "testimonial", "designation", "country", "courses", "reviews", "review",],
    threshold: 0.7,
    distance: 200,
    shouldSort: true,
  });

  const results = fuse.search(processedQuery).map((result) => result.item);
  console.log("Fuse.js Results:", results);

  // Manual fallback
  if (results.length === 0) {
    const manualMatch = flatData.filter((item) =>
      ["question", "tags", "description", "about", "name", "title", "courses", "reviews", "review"].some((key) =>
        item[key]?.toLowerCase().includes(processedQuery)
      )
    );
    console.log("Manual Match Fallback:", manualMatch);
    return manualMatch;
  }

  return results;
};


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "A valid message is required." });
  }

  try {
    // Step 1: Search the JSON data
    const filteredResults = filterData(message, jsonData.data);
    console.log('====================================');
    console.log("filteredResults", filteredResults);
    console.log('====================================');
    // Step 2: If relevant results found, format them for GPT
    if (filteredResults.length > 0) {
      const context = filteredResults.map((item) => `- ${item.question || item.title}: ${item.answer || item.description}`).join("\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: `You are a helpful assistant that answers questions based on the following context:\n${context}` },
          { role: "user", content: message },
        ],
        max_tokens: 1000,
      });

      const reply = completion.choices[0]?.message?.content || "I couldn't find a detailed answer.";
      return res.status(200).json({ reply });
    }

    // Step 3: If no results found, use GPT-4 fallback
    const fallback = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a helpful assistant that answers questions based on your general knowledge." },
        { role: "user", content: message },
      ],
      max_tokens: 1000,
    });

    const fallbackReply = fallback.choices[0]?.message?.content || "I couldn't find an answer to your question.";
    return res.status(200).json({ reply: fallbackReply });
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({ error: "An error occurred while processing your request." });
  }
}
