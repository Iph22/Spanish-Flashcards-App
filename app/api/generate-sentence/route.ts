import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { front, back } = await req.json();

  if (!front || !back) {
    return NextResponse.json(
      { error: "Missing front or back content" },
      { status: 400 }
    );
  }

  const options = {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.EDEN_AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      response_as_dict: true,
      attributes_as_list: false,
      show_original_response: false,
      temperature: 0.2,
      max_tokens: 50,
      providers: "openai",
      text: `Generate a simple sentence in Spanish that uses the word "${back}" (which means "${front}" in English). Provide the Spanish sentence and its English translation.`,
    }),
  };

  try {
    const response = await fetch(
      "https://api.edenai.run/v2/text/generation",
      options
    );
    const data = await response.json();
    const sentence = data.openai.generated_text.trim();

    return NextResponse.json({ sentence });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to generate sentence" },
      { status: 500 }
    );
  }
}