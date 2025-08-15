import { DataAPIClient } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import "dotenv/config";

type SimilarityMetric = "dot_product" | "cosine" | "euclidean";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  GEMINI_API_KEY,
} = process.env;

console.log(GEMINI_API_KEY);
const genAI = new GoogleGenerativeAI(`${GEMINI_API_KEY}`);
const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

const data = [
  "https://evidence.nihr.ac.uk/alert/play-and-social-skills-may-protect-children-who-have-difficulties-with-spoken-language/",
  "https://evidence.nihr.ac.uk/alert/loneliness-strongly-linked-depression-older-adults/",
  "https://www.mind.org.uk/information-support/tips-for-everyday-living/student-life/support-and-treatment/",
  "https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/five-steps-to-mental-wellbeing/",
  "https://medlineplus.gov/howtoimprovementalhealth.html",
  "https://www.mentalhealth.org.uk/explore-mental-health/articles/how-support-someone-mental-health-problem",
];

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_ENDPOINT!, { namespace: ASTRA_DB_NAMESPACE });

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
});

const createCollection = async (
  similarityMetric: SimilarityMetric = "dot_product"
) => {
  const res = await db.createCollection(ASTRA_DB_COLLECTION!, {
    vector: {
      dimension: 768,
      metric: similarityMetric,
    },
  });
  console.log(res);
};

const loadSampleData = async () => {
  const collection = await db.collection(ASTRA_DB_COLLECTION!);
  for await (const url of data) {
    const content = await scrapePage(url);
    const chunks = await splitter.splitText(content);
    for await (const chunk of chunks) {
      try {
        const embeddingResponse = await embeddingModel.embedContent({
          // Use embeddingModel (text-embedding-004)
          content: { role: "user", parts: [{ text: chunk }] },
        });
        const vectorEmbedding = embeddingResponse.embedding.values; // Extract embedding vector

        console.log(
          `Generated embedding for chunk: ${chunk.substring(0, 50)}...`
        );

        const res = await collection.insertOne({
          pageContent: chunk,
          $vector: vectorEmbedding,
          metadata: { source: url },
        });
        console.log(`Chunk stored in DB: ${chunk.substring(0, 50)}...`);
      } catch (error) {
        console.error("Error generating or storing embedding:", error);
        console.error(error);
      }
    }
  }
  console.log("Sample data loaded successfully!");
};

const scrapePage = async (url: string) => {
  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: {
      headless: true,
    },
    gotoOptions: {
      waitUntil: "domcontentloaded",
    },
    evaluate: async (page, browser) => {
      const result = await page.evaluate(() => {
        // Your evaluation logic here
        return document.body.innerText;
      });
      await browser.close();
      return result;
    },
  });

  return (await loader.scrape())?.replace(/<[^>]*>?/gm, "");
};

createCollection().then(() => loadSampleData());
