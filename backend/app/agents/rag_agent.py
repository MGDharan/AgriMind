import logging
import time
import difflib
import re

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
    {
        "topic": "fertilizer timing",
        "content": "Apply nitrogen in split doses for most cereals. Avoid heavy nitrogen close to harvest. Follow soil test recommendations for P and K.",
        "source": "National Fertilizer Guidelines",
    },
    {
        "topic": "irrigation scheduling",
        "content": "Schedule irrigation based on crop growth stage and soil moisture. Use tensiometers or neutron probe readings where possible; otherwise use crop water requirement tables.",
        "source": "FAO Irrigation Practices",
    },
]


class RAGAgent:
    """Answers agricultural questions using document retrieval. Never hallucinates."""

    name = "rag"

    def analyze(self, question: str) -> dict:
        start = time.perf_counter()
        q_lower = question.lower()
        # Improved scoring: combine direct token matches with fuzzy similarity
        scores: list[tuple[float, dict]] = []

        # prepare query tokens (remove punctuation)
        q_tokens = [t for t in re.findall(r"\w+", q_lower) if len(t) > 2]

        for doc in KNOWLEDGE_BASE:
            score = 0.0
            topic = doc.get("topic", "").lower()
            content = doc.get("content", "").lower()

            # direct token matches (weighted)
            for word in q_tokens:
                if word in topic:
                    score += 2.0
                elif word in content:
                    score += 1.0

            # fuzzy similarity boost using sequence matcher on topic+content
            combined = f"{topic} {content}"
            sim = difflib.SequenceMatcher(a=q_lower, b=combined).ratio()
            # scale similarity into [0..3]
            score += sim * 3.0

            if score > 0.5:
                scores.append((score, doc))

        scores.sort(key=lambda x: x[0], reverse=True)

        if not scores or scores[0][0] < 2:
            latency = (time.perf_counter() - start) * 1000
            return {
                "answer": "I don't have sufficient information in my agricultural knowledge base to answer this confidently. Please consult your local Krishi Vigyan Kendra (KVK) or agricultural extension officer, or upload relevant documents to the Knowledge Base.",
                "suggested_topics": [d[1]["topic"] for d in sorted(scores, key=lambda x: x[0], reverse=True)][:3] if scores else [],
                "sources": [],
                "confidence": 12.0,
                "problem": "Question outside knowledge base",
                "recommendation": "Upload documents or provide more details (crop, location, growth stage)",
                "risk": "Low",
                "latency_ms": round(latency, 1),
            }

        top_docs = [s[1] for s in scores[:3]]
        answer_parts = [doc["content"] for doc in top_docs]
        sources = [doc["source"] for doc in top_docs]
        confidence = min(98.0, 40.0 + scores[0][0] * 12)

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
