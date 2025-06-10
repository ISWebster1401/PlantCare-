import openai

openai.api_key = "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"

response = openai.ChatCompletion.create(
    model="gpt-3.5-turbo-0125",
    messages=[
        {
            "role": "system",
            "content": (
                "Eres PlantCare, un asistente experto en el cuidado de plantas. "
                "Ayudas a los usuarios a interpretar datos de sensores como humedad, luz y temperatura, "
                "y das recomendaciones simples y claras para mantener sus plantas saludables. "
                "Hablas de forma amable, breve y sin usar jerga técnica complicada."
            )
        },
        {"role": "user", "content": "Mi planta tiene 25% de humedad y está en sombra, ¿qué hago?"}
    ]
)

print(response["choices"][0]["message"]["content"])
print("Tokens usados:")
print(response["usage"])


# api key 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