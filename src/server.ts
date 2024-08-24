import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { OpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from 'langchain/output_parsers';


dotenv.config();

const port = process.env.PORT || 3001;
const app = express();
app.use(express.json());

const apiKey = process.env.OPENAI_API_KEY;
console.log('API Key:', apiKey);

// check if the api key is defined
if (!apiKey) {
  throw new Error('OPENAI_API_KEY is not defined');
}
// initialize the model with the api key
const model = new OpenAI({
  openAIApiKey: apiKey,
  temperature: 0.8,
  modelName: 'gpt-3.5-turbo',
});

// define the request body schema using zod
const requestBodySchema = z.object({
  location: z.string(),
});

  const promptTemplate = `
  Provide the 5-day weather forecast for the requested location in the captivating, educational narrative style of David Attenborough. Include the location name in your response. For each day, describe the weather and provide an environmental-based fact. Give temperature in Fahrenheit, and be sure to include some information about the native wildlife.
  
  Adhere to the following JSON schema for your response:
  {{
  "result": {{ 
    "day1": "string",
    "day2": "string",
    "day3": "string",
    "day4": "string",
    "day5": "string"
}}
}}
  `
  // create a structured output parser using zod
  const structuredOutputParser = new StructuredOutputParser(
    z.object({
      result: z.object({
        day1: z.string(),
        day2: z.string(),
        day3: z.string(),
        day4: z.string(),
        day5: z.string(),
      }),
    }),
  );

// create a prompt function that takes the user input location and passes it through the call method

  // TODO: Format the prompt with the user input
  const formatPrompt = async (location: string): Promise<string> => {
    return promptTemplate.replace('requested location', location);
  };
  

  // TODO: use formatPrompt to create a prompt function
  const promptFunc = async (location: string): Promise<any> => {
    try {
      if (model) {
        const prompt = await formatPrompt(location);
        return await model.invoke(prompt);
      }
      return 'No OpenAI API Key provided';
    } catch (err) {
      console.error('error getting response from OpenAI:', err);
      throw new Error('Error getting response from OpenAI');
        }
  }

  // TODO: return the JSON response

  export const parseResponse = async (response: string): Promise<any> => {
    try {
      console.log('Raw Response:', response);
      return await structuredOutputParser.parse(response);
    } catch (err) {
      console.error('error parsing response:', err);
      if (err instanceof z.ZodError) {
        console.error('Zod validation error:', err.errors);
        throw new Error('Invalid response format');
      }
      throw new Error('Error parsing response');
    }
  };

  // Endpoint to handle request
app.post('/forecast', async (req: Request, res: Response): Promise<any> => {
  try {
    // Validate the request body
    const parsedBody = requestBodySchema.parse(req.body);

    const location: string = parsedBody.location;
    const result = await promptFunc(location);
    const parsedResult = await parseResponse(result);
    res.json(parsedResult);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request format', details: err.errors });
    } else {
      const error = err as Error;
      res.status(500).json({
        error: error.message,});
    }
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

