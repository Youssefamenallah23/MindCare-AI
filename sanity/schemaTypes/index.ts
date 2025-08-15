import { type SchemaTypeDefinition } from "sanity";
import { users } from "./users";
import { sentimentAnalysis } from "./sentimentAnalysis";
import { routines } from "./routines";
import { quote } from "./quote";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [users, sentimentAnalysis, routines, quote],
};
