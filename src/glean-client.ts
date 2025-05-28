import { Glean } from '@gleanwork/api-client';
import { requestUrl } from 'obsidian';
import { GleanSettings } from './settings';

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
		console.error('Failed to initialize Glean client:', error);
		gleanClient = null;
	}
}

// Alternative CORS-free implementation using Obsidian's requestUrl
export async function queryGleanWithoutCors(query: string, settings: GleanSettings): Promise<string> {
	if (!settings.apiKey || !settings.instanceName) {
		throw new Error('Glean client not configured. Please check your settings.');
	}

	try {
		console.log('Querying Glean (CORS-free):', query);
		console.log('Instance:', settings.instanceName);
		
		const url = `https://${settings.instanceName}-be.glean.com/rest/api/v1/chat`;
		console.log('Request URL:', url);
		
		// Corrected request body structure based on Glean API docs
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

		console.log('Request body:', JSON.stringify(requestBody, null, 2));
		console.log('Making CORS-free request...');

		const response = await requestUrl({
			url: url,
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${settings.apiKey}`,
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
			body: JSON.stringify(requestBody),
			throw: false, // Don't throw on HTTP errors, let us handle them
		});

		console.log('Response status:', response.status);
		console.log('Response headers:', response.headers);
		console.log('Raw response text:', response.text);

		// Check if the request was successful
		if (response.status < 200 || response.status >= 300) {
			console.error('Request failed with status:', response.status);
			console.error('Error response body:', response.text);
			throw new Error(`HTTP ${response.status}: ${response.text || 'Unknown error'}`);
		}

		// Parse the response
		let responseData;
		try {
			responseData = response.json;
			console.log('Parsed response data:', responseData);
		} catch (parseError) {
			console.error('Failed to parse JSON response:', parseError);
			console.log('Raw response text:', response.text);
			throw new Error('Failed to parse response as JSON');
		}

		// Process the response and format it
		console.log('=== DEBUG: About to call formatGleanResponse ===');
		console.log('responseData type:', typeof responseData);
		console.log('responseData messages count:', responseData?.messages?.length || 'No messages property');
		
		try {
			const formattedResponse = formatGleanResponse(responseData, query);
			console.log('=== DEBUG: formatGleanResponse completed successfully ===');
			console.log('Formatted response length:', formattedResponse.length);
			return formattedResponse;
		} catch (formatError) {
			console.error('=== DEBUG: Error in formatGleanResponse ===');
			console.error('Format error:', formatError);
			throw formatError;
		}
		
	} catch (error) {
		console.error('Glean query failed (CORS-free):', error);
		console.error('Error details:', {
			message: error.message,
			stack: error.stack,
			name: error.name
		});
		throw new Error(`Failed to query Glean: ${error.message}`);
	}
}

export async function testGleanConnectionWithoutCors(settings: GleanSettings): Promise<boolean> {
	if (!settings.apiKey || !settings.instanceName) {
		return false;
	}

	try {
		console.log('Testing Glean connection (CORS-free)...');
		console.log('Instance:', settings.instanceName);
		console.log('API Key (first 10 chars):', settings.apiKey.substring(0, 10) + '...');
		
		const url = `https://${settings.instanceName}-be.glean.com/rest/api/v1/chat`;
		console.log('Test URL:', url);
		
		// Corrected request body structure based on Glean API docs
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

		console.log('Test request body:', JSON.stringify(requestBody, null, 2));
		console.log('Making test request...');

		const response = await requestUrl({
			url: url,
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${settings.apiKey}`,
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
			body: JSON.stringify(requestBody),
			throw: false, // Don't throw on HTTP errors, let us handle them
		});

		console.log('Test response status:', response.status);
		console.log('Test response headers:', response.headers);
		console.log('Test response text:', response.text);

		// Check if the request was successful
		if (response.status < 200 || response.status >= 300) {
			console.error('Test failed with HTTP status:', response.status);
			console.error('Error response body:', response.text);
			return false;
		}

		// If we get here without an error, the connection works
		console.log('Glean connection test successful (CORS-free)');
		return true;
	} catch (error) {
		console.error('Glean connection test failed (CORS-free):', error);
		console.error('Error details:', {
			message: error.message,
			stack: error.stack,
			name: error.name
		});
		return false;
	}
}

export async function testGleanConnection(settings: GleanSettings): Promise<boolean> {
	if (settings.useCorsFreeMethods) {
		// Use CORS-free method
		return await testGleanConnectionWithoutCors(settings);
	}

	// Use original Glean client method
	if (!settings.apiKey || !settings.instanceName) {
		return false;
	}

	try {
		// Create a temporary client for testing
		const testClient = new Glean({
			apiToken: settings.apiKey,
			instance: settings.instanceName,
		});

		// Try a simple test query to verify the connection works - using correct message format
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
			timeoutMillis: 10000, // 10 second timeout for test
		});

		// If we get here without an error, the connection works
		console.log('Glean connection test successful:', testResponse);
		return true;
	} catch (error) {
		console.error('Glean connection test failed:', error);
		return false;
	}
}

export async function queryGlean(query: string, settings: GleanSettings): Promise<string> {
	if (settings.useCorsFreeMethods) {
		// Use CORS-free method
		return await queryGleanWithoutCors(query, settings);
	}

	// Use original Glean client method
	if (!gleanClient) {
		initializeGleanClient(settings);
		if (!gleanClient) {
			throw new Error('Glean client not configured. Please check your settings.');
		}
	}

	try {
		console.log('Querying Glean:', query);
		
		// Make the actual Chat API call - using correct message format
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

		// Process the response and format it
		return formatGleanResponse(response, query);
		
	} catch (error) {
		console.error('Glean query failed:', error);
		throw new Error(`Failed to query Glean: ${error.message}`);
	}
}

function formatGleanResponse(response: any, originalQuery: string): string {
	try {
		// Extract the AI response from Glean's response structure
		const messages = response.messages || [];
		
		// Debug logging to see what messages we're getting
		console.log('=== DEBUG: All messages received ===');
		console.log('Total messages:', messages.length);
		messages.forEach((msg: any, index: number) => {
			console.log(`Message ${index}:`, {
				author: msg.author,
				messageType: msg.messageType,
				fragmentsCount: msg.fragments?.length || 0,
				firstFragmentText: msg.fragments?.[0]?.text?.substring(0, 100) || 'No text'
			});
		});
		
		// Look for the final CONTENT message from GLEAN_AI, not just any GLEAN_AI message
		// Glean sends multiple messages: first are UPDATE messages with status, final is CONTENT message with the actual response
		const gleanAiMessages = messages.filter((msg: any) => msg.author === 'GLEAN_AI');
		console.log('=== DEBUG: GLEAN_AI messages ===');
		console.log('GLEAN_AI messages count:', gleanAiMessages.length);
		gleanAiMessages.forEach((msg: any, index: number) => {
			console.log(`GLEAN_AI Message ${index}:`, {
				messageType: msg.messageType,
				fragmentsCount: msg.fragments?.length || 0,
				firstFragmentText: msg.fragments?.[0]?.text?.substring(0, 100) || 'No text'
			});
		});
		
		const contentMessage = messages
			.filter((msg: any) => msg.author === 'GLEAN_AI' && msg.messageType === 'CONTENT')
			.pop(); // Get the last content message if there are multiple
		
		console.log('=== DEBUG: Content message found ===');
		console.log('Content message:', contentMessage ? {
			messageType: contentMessage.messageType,
			fragmentsCount: contentMessage.fragments?.length || 0,
			firstFragmentText: contentMessage.fragments?.[0]?.text?.substring(0, 100) || 'No text'
		} : 'No content message found');
		
		if (!contentMessage || !contentMessage.fragments) {
			// Fallback: look for any GLEAN_AI message if no CONTENT message found
			const fallbackMessage = messages.find((msg: any) => msg.author === 'GLEAN_AI');
			
			console.log('=== DEBUG: Using fallback message ===');
			console.log('Fallback message:', fallbackMessage ? {
				messageType: fallbackMessage.messageType,
				fragmentsCount: fallbackMessage.fragments?.length || 0,
				firstFragmentText: fallbackMessage.fragments?.[0]?.text?.substring(0, 100) || 'No text'
			} : 'No fallback message found');
			
			if (!fallbackMessage || !fallbackMessage.fragments) {
				return `> [!warning] Glean Response
> No response received from Glean for: "${originalQuery}"`;
			}
			
			// If we found a fallback message but it's just a status update, show that info
			const fallbackText = fallbackMessage.fragments
				.map((fragment: any) => fragment.text || '')
				.join(' ')
				.trim();
				
			if (fallbackText === 'Search company knowledge' || fallbackMessage.messageType === 'UPDATE') {
				return `> [!warning] Glean Response
> Received incomplete response from Glean (status: "${fallbackText}")
> This might be a streaming response issue. Try your query again.
> Query: "${originalQuery}"`;
			}
		}

		// Use the content message (or fallback if no content message found)
		const aiMessage = contentMessage || messages.find((msg: any) => msg.author === 'GLEAN_AI');
		
		console.log('=== DEBUG: Final message being used ===');
		console.log('Final message:', {
			messageType: aiMessage.messageType,
			fragmentsCount: aiMessage.fragments?.length || 0,
			firstFragmentText: aiMessage.fragments?.[0]?.text?.substring(0, 100) || 'No text'
		});
		
		// Process fragments and combine text with citations
		let responseText = '';
		let sources: string[] = [];
		
		aiMessage.fragments.forEach((fragment: any, index: number) => {
			const text = fragment.text || '';
			responseText += text;
			
			// Check if this fragment has a citation
			if (fragment.citation && fragment.citation.sourceDocument) {
				const sourceDoc = fragment.citation.sourceDocument;
				const sourceTitle = sourceDoc.title || 'Source';
				const sourceUrl = sourceDoc.url;
				
				if (sourceUrl && text.trim()) {
					// Add citation link after the text (only if the fragment has actual text content)
					responseText += ` [[📎](${sourceUrl} "${sourceTitle}")]`;
					
					// Also collect unique sources for a references section
					const sourceRef = `[${sourceTitle}](${sourceUrl})`;
					if (!sources.includes(sourceRef)) {
						sources.push(sourceRef);
					}
				}
			}
		});
		
		responseText = responseText.trim();

		if (!responseText) {
			return `> [!warning] Glean Response
> Empty response received from Glean for: "${originalQuery}"`;
		}

		// Format the response in a callout block
		let formattedResponse = `> [!info] Glean Response\n`;
		
		// Split response into lines and format each line with callout prefix
		const lines = responseText.split('\n');
		lines.forEach((line: string) => {
			formattedResponse += `> ${line}\n`;
		});

		// Add sources section if we have any
		if (sources.length > 0) {
			formattedResponse += `>\n> **Sources:**\n`;
			sources.forEach(source => {
				formattedResponse += `> - ${source}\n`;
			});
		}

		// Add query info and timestamp
		formattedResponse += `>\n> **Query:** "${originalQuery}"\n`;
		
		// Add timestamp
		const timestamp = new Date().toLocaleString();
		formattedResponse += `> **Generated:** ${timestamp}`;

		return formattedResponse;

	} catch (error) {
		console.error('Error formatting Glean response:', error);
		return `> [!error] Glean Response Error
> Failed to format response for: "${originalQuery}"
> Error: ${error.message}`;
	}
}

// Debug function to test if requestUrl is working at all
export async function debugNetworkRequest(): Promise<void> {
	try {
		console.log('Testing basic network request...');
		
		// Test with a simple GET request to a public API
		const response = await requestUrl({
			url: 'https://httpbin.org/get',
			method: 'GET',
		});
		
		console.log('Debug response status:', response.status);
		console.log('Debug response:', response);
		console.log('Network request is working!');
		
	} catch (error) {
		console.error('Network request failed:', error);
		console.error('requestUrl might not be available or working');
	}
} 