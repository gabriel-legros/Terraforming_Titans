import openai

client = openai.OpenAI(
    api_key="wNzKgiQW57kMTPG6DdKjD4qAHXL0Oz7xwUfm_zsKKps",  # Get this from poe.com/api_key
    base_url="https://api.poe.com/v1",
)

# Use any model with the same code
models = ["GPT-5"]

for model in models:
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": "What is the latest Python version?"}],
        stream=True
    )
    print(f"\\n{model}: ")
    for chunk in response:
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end='')