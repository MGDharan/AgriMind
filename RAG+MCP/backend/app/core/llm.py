from typing import AsyncGenerator, List

from ollama import AsyncClient

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

SYSTEM_PROMPT = """You are a helpful AI assistant with access to a document knowledge base.
Answer questions based on the provided context documents. 
If the context does not contain enough information to answer fully, say so clearly but still help as much as possible.
Always be accurate. When referencing specific information from documents, mention which source it comes from.
Format your responses in markdown when appropriate (use headers, bullet points, code blocks, etc.)."""


async def stream_chat(
    messages: List[dict],
    context: str,
    system_prompt: str = SYSTEM_PROMPT,
) -> AsyncGenerator[str, None]:
    """Stream chat completion from the configured Ollama chat model."""
    client = AsyncClient(host=settings.ollama_base_url)

    if context.strip():
        full_system = (
            f"{system_prompt}\n\n"
            f"## Relevant Context from Knowledge Base\n\n{context}\n\n"
            f"Use the above context to answer the user's question accurately."
        )
    else:
        full_system = system_prompt + "\n\nNote: No relevant documents were found in the knowledge base for this query."

    ollama_messages = [{"role": "system", "content": full_system}] + messages

    try:
        async for chunk in await client.chat(
            model=settings.ollama_chat_model,
            messages=ollama_messages,
            stream=True,
        ):
            content = chunk.get("message", {}).get("content", "")
            if content:
                yield content
    except Exception as e:
        logger.error("LLM streaming error", error=str(e))
        raise
