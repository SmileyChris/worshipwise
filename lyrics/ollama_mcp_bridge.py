#!/usr/bin/env python3
"""
Ollama-MCP Bridge for Lyrics Analysis
====================================
Makes Ollama act as an MCP client to use the lyrics search tool directly.
This allows Ollama to fetch and analyze lyrics in a single conversation.

Usage:
    python ollama_mcp_bridge.py
"""

import json
import subprocess
import requests
from typing import Dict, Any, List


class MCPClient:
    """Simple MCP client for calling tools."""
    
    def __init__(self, server_script: str = "./lyrics_search_mcp_server.py"):
        self.server_script = server_script
    
    def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> str:
        """Call an MCP tool and return the result."""
        try:
            # For now, we'll use subprocess to call the tool
            # In a full MCP implementation, this would use the MCP protocol
            if tool_name == "get_lyrics":
                cmd = [
                    "python", "-c",
                    f"""
import sys
sys.path.append('.')
from lyrics_search_mcp_server import get_lyrics
result = get_lyrics('{arguments.get('title', '')}', '{arguments.get('artist', '')}')
print(result)
"""
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                if result.returncode == 0:
                    return result.stdout.strip()
                else:
                    return "Error fetching lyrics"
            else:
                return f"Unknown tool: {tool_name}"
                
        except Exception as e:
            return f"Error calling tool: {e}"


class OllamaWithMCP:
    """Ollama client that can use MCP tools."""
    
    def __init__(self, model: str = "llama3.2", base_url: str = "http://localhost:11434"):
        self.model = model
        self.base_url = base_url
        self.mcp_client = MCPClient()
        
        # Define available tools
        self.tools = {
            "get_lyrics": {
                "description": "Search for song lyrics by title and optional artist",
                "parameters": {
                    "title": {"type": "string", "description": "Song title"},
                    "artist": {"type": "string", "description": "Artist name (optional)"}
                }
            }
        }
    
    def _make_ollama_request(self, messages: List[Dict], tools: List[Dict] = None) -> str:
        """Make a request to Ollama with optional tool support."""
        try:
            # For now, we'll simulate tool calling by including tool descriptions in the prompt
            system_prompt = "You are a worship song analysis assistant. You have access to these tools:\n"
            for tool_name, tool_info in self.tools.items():
                system_prompt += f"- {tool_name}: {tool_info['description']}\n"
            
            system_prompt += "\nWhen you need to use a tool, respond with: TOOL_CALL:{tool_name}:{json_arguments}"
            
            # Combine system prompt with user messages
            full_prompt = system_prompt + "\n\n" + "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
            
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": full_prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "top_p": 0.9
                    }
                },
                timeout=60
            )
            
            if response.status_code == 200:
                return response.json()["response"]
            else:
                return f"Ollama API error: {response.status_code}"
                
        except requests.RequestException as e:
            return f"Error connecting to Ollama: {e}"
    
    def chat_with_tools(self, user_message: str) -> str:
        """Chat with Ollama while supporting tool calls."""
        messages = [{"role": "user", "content": user_message}]
        
        max_iterations = 5  # Prevent infinite loops
        iteration = 0
        
        while iteration < max_iterations:
            iteration += 1
            
            # Get response from Ollama
            response = self._make_ollama_request(messages)
            
            # Check if Ollama wants to call a tool
            if "TOOL_CALL:" in response:
                try:
                    # Parse tool call
                    tool_call_part = response.split("TOOL_CALL:")[1].strip()
                    tool_name, args_json = tool_call_part.split(":", 1)
                    tool_args = json.loads(args_json)
                    
                    # Call the tool
                    tool_result = self.mcp_client.call_tool(tool_name, tool_args)
                    
                    # Add tool result to conversation
                    messages.append({"role": "assistant", "content": f"I'll search for those lyrics using {tool_name}."})
                    messages.append({"role": "system", "content": f"Tool result: {tool_result}"})
                    messages.append({"role": "user", "content": "Now please analyze these lyrics."})
                    
                except (ValueError, json.JSONDecodeError, IndexError) as e:
                    return f"Error parsing tool call: {e}\nResponse: {response}"
            else:
                # No tool call needed, return the response
                return response
        
        return "Max iterations reached"
    
    def analyze_song(self, title: str, artist: str = None) -> str:
        """Analyze a song by fetching lyrics and providing insights."""
        if artist:
            query = f"Please analyze the worship song '{title}' by {artist}. First get the lyrics, then provide insights about themes, biblical references, and worship planning recommendations."
        else:
            query = f"Please analyze the worship song '{title}'. First get the lyrics, then provide insights about themes, biblical references, and worship planning recommendations."
        
        return self.chat_with_tools(query)


def interactive_mode():
    """Run in interactive mode."""
    print("Ollama-MCP Lyrics Analysis Bridge")
    print("Type 'quit' to exit, 'help' for commands")
    print()
    
    ollama = OllamaWithMCP()
    
    while True:
        try:
            user_input = input("You: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                break
            elif user_input.lower() == 'help':
                print("Commands:")
                print("  analyze <title> [artist] - Analyze a specific song")
                print("  <any question> - General chat about worship songs")
                print("  quit - Exit")
                continue
            elif user_input.lower().startswith('analyze '):
                parts = user_input[8:].strip().split(' ', 1)
                title = parts[0].strip('"\'')
                artist = parts[1].strip('"\'') if len(parts) > 1 else None
                
                print("\nAnalyzing...")
                response = ollama.analyze_song(title, artist)
                print(f"\nAssistant: {response}")
            else:
                print("\nThinking...")
                response = ollama.chat_with_tools(user_input)
                print(f"\nAssistant: {response}")
                
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"\nError: {e}")
    
    print("\nGoodbye!")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Command line mode
        if sys.argv[1] == "analyze":
            if len(sys.argv) < 3:
                print("Usage: python ollama_mcp_bridge.py analyze <title> [artist]")
                sys.exit(1)
            
            title = sys.argv[2]
            artist = sys.argv[3] if len(sys.argv) > 3 else None
            
            ollama = OllamaWithMCP()
            result = ollama.analyze_song(title, artist)
            print(result)
        else:
            print("Unknown command. Use 'analyze' or run without arguments for interactive mode.")
    else:
        # Interactive mode
        interactive_mode()