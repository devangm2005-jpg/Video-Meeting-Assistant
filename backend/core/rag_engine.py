"""
RAG chatbot engine. Answers questions grounded ONLY in the context of a
specific session's vector store (built from a transcript or an uploaded
document).
"""

import os
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_mistralai import ChatMistralAI
from langchain_core.runnables import RunnablePassthrough, RunnableLambda

from core.vector_store import build_vector_store, load_vector_store, get_retriever, session_exists

SYSTEM_PROMPT = """
You are an expert meeting assistant. Answer the user's question
based ONLY on the context provided below.

If the answer is not found in the context, say:
"I could not find this information in the provided content."
Always be concise and precise. If quoting someone, mention it clearly.

Context:
{context}
"""


def get_llm():
    return ChatMistralAI(
        model="mistral-small-latest",
        api_key=os.getenv("MISTRAL_API_KEY"),
        temperature=0.3,
    )


def format_docs(docs) -> str:
    return "\n\n".join(doc.page_content for doc in docs)


def create_session(text: str, session_id: str) -> None:
    """Build and persist a vector store for a new RAG session."""
    build_vector_store(text, session_id)


def _build_chain(vector_store):
    retriever = get_retriever(vector_store, k=4)
    llm = get_llm()

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", "{question}"),
    ])

    chain = (
        {
            "context": retriever | RunnableLambda(format_docs),
            "question": RunnablePassthrough(),
        }
        | prompt
        | llm
        | StrOutputParser()
    )
    return chain


def ask_question(session_id: str, question: str) -> str:
    if not session_exists(session_id):
        raise ValueError(f"RAG session '{session_id}' does not exist. Build it first.")

    vector_store = load_vector_store(session_id)
    chain = _build_chain(vector_store)
    return chain.invoke(question)
