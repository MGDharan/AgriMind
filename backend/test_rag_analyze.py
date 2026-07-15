from app.agents.rag_agent import RAGAgent

agent = RAGAgent()

q1 = "How do I treat late blight in tomatoes?"
res1 = agent.analyze(q1)
print('QUESTION:', q1)
print('ANSWER:', res1.get('answer'))
print('SOURCES:', res1.get('sources'))
print('CONFIDENCE:', res1.get('confidence'))

q2 = "When should I apply nitrogen for rice?"
res2 = agent.analyze(q2)
print('\nQUESTION:', q2)
print('ANSWER:', res2.get('answer'))
print('SOURCES:', res2.get('sources'))
print('CONFIDENCE:', res2.get('confidence'))

q3 = "What is the weather now?"
res3 = agent.analyze(q3)
print('\nQUESTION:', q3)
print('ANSWER:', res3.get('answer'))
print('SUGGESTED_TOPICS:', res3.get('suggested_topics'))
print('CONFIDENCE:', res3.get('confidence'))
