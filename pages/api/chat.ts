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
    } else if (item.courses) {
      flatData.push(...item.courses); // Extract 'courses'
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
  console.log("flattenData",flattenData);
  return flatData;
};

// Main filter function
const filterData = (query: string, data: any[]) => {
  const flatData = flattenData(data);

  // Preprocess query
  const preprocessQuery = (query: string) => {
    return query
      .toLowerCase()
      .trim();
  };

  const processedQuery = preprocessQuery(query);

  // Fuzzy matching with Fuse.js
  const fuse = new Fuse(flatData, {
    keys: ["question", "answer", "tags", "title", "description", "link", "reasons", "name", "about", "services", "courseLink", "category", "previewLink", "technologies", "testimonial", "designation", "country", "courses", "reviews", "review","reason", "partner", "affiliate","Technology we use","Technology used","instructor", "teacher", "course teacher", "course instructor","company", "about", "services", "Embedded Systems","certificates", "course completion","enrollment", "courses", "how to","payment", "methods", "options","refund", "policy", "satisfaction","course policy","resources" ],
    threshold: 0.7,
    distance: 200,
    shouldSort: true,
  });

  const results = fuse.search(processedQuery).map((result) => result.item);
  console.log("Fuse.js Results:", results);


  // Manual fallback
  if (results.length === 0) {
    const manualMatch = flatData.filter((item) =>
      ["question", "answer", "tags", "title", "description", "reasons", "name", "about", "services", "category", "technologies", "testimonial", "designation", "courses", "reviews", "review"].some((key) =>
        item[key]?.toLowerCase().includes(processedQuery)
      )
    );
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
      console.log('Filtered Results:', filteredResults);
      console.log('====================================');
      // Step 2: Format context dynamically for GPT
      if (filteredResults.length > 0) {
          const context = filteredResults.map((item) => {
              if (item.question) return `Q: ${item.question}\nA: ${item.answer}`;
              if (item.title) return `Resource: ${item.title}\nDescription: ${item.description}\nReason: ${item.reason}`;
              if (item.name && item.description && item.category) return `Course name: ${item.name}\nDescription:${ item.description}`;
              if (item.course) return `Course: ${item.course}\nReview: ${item.review}`;
              if (item.name && item.testimonial) return `Testimonial by ${item.name}: "${item.testimonial}"`;
              return `Info: ${item.description || item.about || ''}`;
          }).join("\n\n");
          console.log('====================================');
          console.log('Context:', context);
          console.log('====================================');
          // Call OpenAI API with formatted context
          const completion = await openai.chat.completions.create({
              model: "gpt-4",
              messages: [
                  { role: "system", content: `You are a helpful assistant. ${context.includes("Course name:") ? 'Use the following course context to answer questions with 5-6 bullet points including course link' : 'Use the following context to answer questions'} :\n\n${context}` },
                  { role: "user", content: message },
              ],
              max_tokens: 1000,
          });
          const reply = completion.choices[0]?.message?.content || "I couldn't find a detailed answer.";
          return res.status(200).json({ reply });
      }

      // Step 3: Fallback to general GPT-4 knowledge if no results
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
