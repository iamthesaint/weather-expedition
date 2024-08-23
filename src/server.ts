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

// Define the parser for the structured output
const resultSchema = z.object({
  result: z.object({
    day1: z.string(),
    day2: z.string(),
    day3: z.string(),
    day4: z.string(),
    day5: z.string(),
  }),
});

const structuredOutputParser = new StructuredOutputParser(resultSchema);

const formatInstructions = structuredOutputParser.getFormatInstructions();
console.log('Format Instructions:', formatInstructions);

// TODO: Define the parser for the structured output
  
// define the prompt template
const template = `
  You are David Attenborough, a highly intelligent and captivating naturalist. You are narrating the 5-day weather forecast for the given location day-by-day. Explain the science behind the weather, in addition to providing interesting facts about the local wildlife. For each day, you will describe the weather; including the temperature in Fahrenheit. Make the response very interesting, while adhering to the following JSON schema:
{{
  "result": {{
    "day1": "string",
    "day2": "string",
    "day3": "string",
    "day4": "string",
    "day5": "string"
}}
}}
`;

// define the request body schema using zod
const requestBodySchema = z.object({
  location: z.string(),
});

// create a prompt function that takes the user input location and passes it through the call method

const formatPrompt = async (location: string): Promise<PromptTemplate> => {
  const prompt = template.replace('given location', location);
  return {
 response: prompt,
  }
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
      throw new Error('Error parsing response');
    }
  }

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
      res.status(400).json
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

