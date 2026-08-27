export interface TranslateTextRequest {
  text: string;
  mode: "final";
}

export interface TranslateTextResponse {
  translation: string;
  original: string;
}

export async function translateText(
  request: TranslateTextRequest,
): Promise<TranslateTextResponse> {
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Translation request failed with ${response.status}`);
  }

  return response.json();
}
