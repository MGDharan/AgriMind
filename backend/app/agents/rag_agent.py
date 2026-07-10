import logging
import time

logger = logging.getLogger(__name__)

KNOWLEDGE_BASE = [
    {
        "topic": "late blight tomato",
        "content": "Late blight is caused by Phytophthora infestans. Symptoms include water-soaked lesions on leaves that turn brown. Spread rapidly in cool, humid weather. Control with copper fungicides and remove infected plant material.",
        "source": "ICAR-National Bureau of Plant Genetic Resources, Disease Management Guide 2024",
    },
    {
        "topic": "irrigation tomato",
        "content": "Tomatoes need 25-30mm water per week. Drip irrigation is most efficient, reducing water use by 40%. Water early morning to minimize fungal diseases. Avoid overhead irrigation during flowering.",
        "source": "FAO Irrigation and Drainage Paper No. 56 — Crop Water Requirements",
    },
    {
        "topic": "npk rice",
        "content": "Rice requires split NPK application: 50% nitrogen at transplanting, 25% at tillering, 25% at panicle initiation. Typical dose: 100-120 kg N, 50 kg P2O5, 40 kg K2O per hectare.",
        "source": "IRRI Rice Knowledge Bank — Fertilizer Management",
    },
    {
        "topic": "organic farming",
        "content": "Organic farming prohibits synthetic pesticides and fertilizers. Use compost, green manure, and biopesticides. Certification requires 3-year conversion period. Premium prices offset lower yields.",
        "source": "APEDA National Programme for Organic Production (NPOP) Guidelines",
    },
    {
        "topic": "pest aphids",
        "content": "Aphids are soft-bodied insects that suck plant sap. Natural predators include ladybugs and lacewings. Neem oil (3%) spray every 7 days is effective. Avoid broad-spectrum insecticides that kill beneficial insects.",
        "source": "CABI Crop Protection Compendium — Aphid Management",
    },
    {
        "topic": "soil ph",
        "content": "Most crops grow best at pH 6.0-7.0. Test soil every 2 years. Lime raises pH (for acidic soils), sulfur lowers pH (for alkaline soils). pH affects nutrient availability significantly.",
        "source": "Soil Science Society of India — Soil Health Handbook",
    },
]


class RAGAgent:
    """Answers agricultural questions using document retrieval. Never hallucinates."""

    name = "rag"

    def analyze(self, question: str) -> dict:
        start = time.perf_counter()
        q_lower = question.lower()
        scores: list[tuple[float, dict]] = []

        for doc in KNOWLEDGE_BASE:
            score = 0.0
            for word in q_lower.split():
                if len(word) > 3 and word in doc["topic"] or word in doc["content"].lower():
                    score += 1.0
            if score > 0:
                scores.append((score, doc))

        scores.sort(key=lambda x: x[0], reverse=True)

        if not scores or scores[0][0] < 1:
            latency = (time.perf_counter() - start) * 1000
            return {
                "answer": "I don't have sufficient information in my agricultural knowledge base to answer this confidently. Please consult your local Krishi Vigyan Kendra (KVK) or agricultural extension officer.",
                "sources": [],
                "confidence": 15.0,
                "problem": "Question outside knowledge base",
                "recommendation": "Contact local agricultural extension services",
                "risk": "Low",
                "latency_ms": round(latency, 1),
            }

        top_docs = [s[1] for s in scores[:2]]
        answer_parts = [doc["content"] for doc in top_docs]
        sources = [doc["source"] for doc in top_docs]
        confidence = min(95.0, 50.0 + scores[0][0] * 15)

        latency = (time.perf_counter() - start) * 1000
        return {
            "answer": " ".join(answer_parts),
            "sources": sources,
            "confidence": round(confidence, 1),
            "problem": question,
            "recommendation": answer_parts[0][:200] + "...",
            "risk": "Low",
            "latency_ms": round(latency, 1),
        }
