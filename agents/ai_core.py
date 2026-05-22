from langchain_google_vertexai import ChatVertexAI
from config import settings

_llm = None


def get_llm() -> ChatVertexAI:
    global _llm
    if _llm is None:
        _llm = ChatVertexAI(
            model=settings.vertex_model,
            project=settings.google_project_id,
            location=settings.vertex_location,
        )
    return _llm
