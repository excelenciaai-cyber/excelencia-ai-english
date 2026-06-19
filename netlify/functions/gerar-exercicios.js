exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método não permitido' })
    };
  }

  try {
    const { type, level } = JSON.parse(event.body);

    const GEMINI_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'GEMINI_API_KEY não configurada no servidor.' })
      };
    }

    const typeLabel = type === 'vocab' ? 'vocabulário' : 'gramática';

    const prompt = `És um professor de inglês especializado em alunos angolanos de nível ${level}.
Gera exactamente 4 perguntas de múltipla escolha sobre ${typeLabel} em inglês.
As perguntas devem ser adequadas ao nível ${level} do CEFR.
As explicações devem ser em português de Angola.

Responde APENAS com um array JSON válido, sem texto adicional, sem markdown, sem backticks.
Formato exacto:
[
  {
    "q": "texto da pergunta em inglês",
    "opts": ["opção A", "opção B", "opção C", "opção D"],
    "correct": 0,
    "explain": "explicação em português angolano de porque a opção correcta está certa"
  }
]
O campo correct é o índice (0-3) da opção correcta.
Varia os temas: ${type === 'vocab' ? 'negócios, vida quotidiana, viagens, tecnologia' : 'present simple, past simple, present continuous, future, conditionals'}.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro da API Gemini:', data);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Erro ao contactar a API Gemini', details: data })
      };
    }

    const text = data.candidates[0].content.parts[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    const exercises = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exercises)
    };

  } catch (err) {
    console.error('Erro na função gerar-exercicios:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno ao gerar exercícios', details: err.message })
    };
  }
};
