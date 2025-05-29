import { Glean } from "@gleanwork/api-client";
import { requestUrl } from "obsidian";

import { GleanSettings } from "./settings";

let gleanClient: Glean | null = null;

export function initializeGleanClient(settings: GleanSettings): void {
  if (!settings.apiKey || !settings.instanceName) {
    gleanClient = null;
    return;
  }

  try {
    gleanClient = new Glean({
      apiToken: settings.apiKey,
      instance: settings.instanceName,
    });
  } catch (error) {
    console.error("Failed to initialize Glean client:", error);
    gleanClient = null;
  }
}

export async function queryGleanWithoutCors(
  query: string,
  settings: GleanSettings
): Promise<string> {
  if (!settings.apiKey || !settings.instanceName) {
    throw new Error("Glean client not configured. Please check your settings.");
  }

  try {
    const url = `https://${settings.instanceName}-be.glean.com/rest/api/v1/chat`;

    const requestBody = {
      messages: [
        {
          author: "USER",
          messageType: "CONTENT",
          fragments: [
            {
              text: query,
            },
          ],
        },
      ],
    };

    const response = await requestUrl({
      url: url,
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
      throw: false,
    });

    if (response.status < 200 || response.status >= 300) {
      console.error("Request failed with status:", response.status);
      console.error("Error response body:", response.text);
      throw new Error(`HTTP ${response.status}: ${response.text || "Unknown error"}`);
    }

    let responseData;
    try {
      responseData = response.json;
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);
      throw new Error("Failed to parse response as JSON");
    }

    try {
      const formattedResponse = formatGleanResponse(responseData, query);
      return formattedResponse;
    } catch (formatError) {
      console.error("Error in formatGleanResponse:", formatError);
      throw formatError;
    }
  } catch (error) {
    console.error("Glean query failed (CORS-free):", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    throw new Error(`Failed to query Glean: ${error.message}`);
  }
}

export async function testGleanConnectionWithoutCors(settings: GleanSettings): Promise<boolean> {
  if (!settings.apiKey || !settings.instanceName) {
    return false;
  }

  try {
    const url = `https://${settings.instanceName}-be.glean.com/rest/api/v1/chat`;

    const requestBody = {
      messages: [
        {
          author: "USER",
          messageType: "CONTENT",
          fragments: [
            {
              text: "Hello, this is a connection test.",
            },
          ],
        },
      ],
    };

    const response = await requestUrl({
      url: url,
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
      throw: false,
    });

    if (response.status < 200 || response.status >= 300) {
      console.error("Test failed with HTTP status:", response.status);
      console.error("Error response body:", response.text);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Glean connection test failed (CORS-free):", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return false;
  }
}

export async function testGleanConnection(settings: GleanSettings): Promise<boolean> {
  if (settings.useCorsFreeMethods) {
    return await testGleanConnectionWithoutCors(settings);
  }

  if (!settings.apiKey || !settings.instanceName) {
    return false;
  }

  try {
    const testClient = new Glean({
      apiToken: settings.apiKey,
      instance: settings.instanceName,
    });

    const testResponse = await testClient.client.chat.create({
      messages: [
        {
          author: "USER",
          messageType: "CONTENT",
          fragments: [
            {
              text: "Hello, this is a connection test.",
            },
          ],
        },
      ],
      timeoutMillis: 10000,
    });

    return true;
  } catch (error) {
    console.error("Glean connection test failed:", error);
    return false;
  }
}

export async function queryGlean(query: string, settings: GleanSettings): Promise<string> {
  if (settings.useCorsFreeMethods) {
    return await queryGleanWithoutCors(query, settings);
  }

  if (!gleanClient) {
    initializeGleanClient(settings);
    if (!gleanClient) {
      throw new Error("Glean client not configured. Please check your settings.");
    }
  }

  try {
    const response = await gleanClient.client.chat.create({
      messages: [
        {
          author: "USER",
          messageType: "CONTENT",
          fragments: [
            {
              text: query,
            },
          ],
        },
      ],
      timeoutMillis: settings.timeout,
    });

    return formatGleanResponse(response, query);
  } catch (error) {
    console.error("Glean query failed:", error);
    throw new Error(`Failed to query Glean: ${error.message}`);
  }
}

function formatGleanResponse(response: any, originalQuery: string): string {
  try {
    // Extract the AI response from Glean's response structure
    const messages = response.messages || [];

    // Look for the final CONTENT message from GLEAN_AI, not just any GLEAN_AI message
    // Glean sends multiple messages: first are UPDATE messages with status, final is CONTENT message with the actual response
    const contentMessage = messages
      .filter((msg: any) => msg.author === "GLEAN_AI" && msg.messageType === "CONTENT")
      .pop(); // Get the last content message if there are multiple

    if (!contentMessage || !contentMessage.fragments) {
      // Fallback: look for any GLEAN_AI message if no CONTENT message found
      const fallbackMessage = messages.find((msg: any) => msg.author === "GLEAN_AI");

      if (!fallbackMessage || !fallbackMessage.fragments) {
        return `> [!warning] Glean Response
> No response received from Glean for: "${originalQuery}"`;
      }

      // If we found a fallback message but it's just a status update, show that info
      const fallbackText = fallbackMessage.fragments
        .map((fragment: any) => fragment.text || "")
        .join(" ")
        .trim();

      if (fallbackText === "Search company knowledge" || fallbackMessage.messageType === "UPDATE") {
        return `> [!warning] Glean Response
> Received incomplete response from Glean (status: "${fallbackText}")
> This might be a streaming response issue. Try your query again.
> Query: "${originalQuery}"`;
      }
    }

    // Use the content message (or fallback if no content message found)
    const aiMessage = contentMessage || messages.find((msg: any) => msg.author === "GLEAN_AI");

    // Process fragments and combine text with citations
    let responseText = "";
    let sources: string[] = [];

    // First pass: collect all citations
    const citations: Array<{ sourceTitle: string; sourceUrl: string }> = [];

    aiMessage.fragments.forEach((fragment: any, index: number) => {
      // Collect citations from any fragment that has them
      if (fragment.citation && fragment.citation.sourceDocument) {
        const sourceDoc = fragment.citation.sourceDocument;
        const sourceTitle = sourceDoc.title || "Source";
        const sourceUrl = sourceDoc.url;

        if (sourceUrl) {
          citations.push({ sourceTitle, sourceUrl });

          // Also add to sources for the references section
          const sourceRef = `[${sourceTitle}](${sourceUrl})`;
          if (!sources.includes(sourceRef)) {
            sources.push(sourceRef);
          }
        }
      }
    });

    // Second pass: build response text and add citations after meaningful text blocks
    let citationIndex = 0;
    aiMessage.fragments.forEach((fragment: any, index: number) => {
      const text = fragment.text || "";
      responseText += text;

      // If this fragment has substantial text content and we have unused citations,
      // add the next citation after this text
      if (text.trim().length > 10 && citationIndex < citations.length) {
        const citation = citations[citationIndex];
        const citationLink = ` [[📎](${citation.sourceUrl} "${citation.sourceTitle}")]`;
        responseText += citationLink;
        citationIndex++;
      }
    });

    // If we still have unused citations, add them at the end of the response
    // while (citationIndex < citations.length) {
    //   const citation = citations[citationIndex];
    //   const citationLink = ` [[📎](${citation.sourceUrl} "${citation.sourceTitle}")]`;
    //   responseText += citationLink;
    //   citationIndex++;
    // }

    responseText = responseText.trim();

    if (!responseText) {
      return `> [!warning] Glean Response
> Empty response received from Glean for: "${originalQuery}"`;
    }

    // Format the response in a callout block
    let formattedResponse = `> [!info] Glean Response\n`;

    // Split response into lines and format each line with callout prefix
    const lines = responseText.split("\n");
    lines.forEach((line: string) => {
      formattedResponse += `> ${line}\n`;
    });

    // Add sources section if we have any
    // if (sources.length > 0) {
    //   formattedResponse += `>\n> **Sources:**\n`;
    //   sources.forEach((source) => {
    //     formattedResponse += `> - ${source}\n`;
    //   });
    // }

    // Add query info and timestamp
    formattedResponse += `>\n> **Query:** "${originalQuery}"\n`;

    // Add timestamp
    const timestamp = new Date().toLocaleString();
    formattedResponse += `> **Generated:** ${timestamp}`;

    return formattedResponse;
  } catch (error) {
    console.error("Error formatting Glean response:", error);
    return `> [!error] Glean Response Error
> Failed to format response for: "${originalQuery}"
> Error: ${error.message}`;
  }
}
