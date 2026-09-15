AI Interview Backend — Local AI Setup

This project supports running AI inference locally using either:

- Ollama (recommended for local open-source models)
- Hugging Face `transformers` pipeline (fallback)

Environment variables

- `AI_BACKEND`: `ollama` or `transformers` (default: `transformers`)
- `LOCAL_MODEL_NAME`: model identifier. For Ollama, this is the Ollama model name (e.g. `llama2-mini` or the model you pulled). For transformers, a Hugging Face model id (default used in code: `gpt2-medium`).

Ollama setup (recommended)

1. Install Ollama following https://ollama.ai/docs
2. Pull a model (example):

```bash
ollama pull llama2-mini
```

3. Configure env and run backend:

```bash
export AI_BACKEND=ollama
export LOCAL_MODEL_NAME="llama2-mini"
uvicorn app.main:app --reload --port 8000
```

Transformers fallback

If you don't have Ollama, the backend can use Hugging Face models locally. Smaller models are easier to download and run on CPU (e.g. `gpt2-medium`). Larger models (Falcon, GPT-J, Llama variants) require substantial RAM/VRAM.

Install dependencies and run:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export AI_BACKEND=transformers
export LOCAL_MODEL_NAME="gpt2-medium"
uvicorn app.main:app --reload --port 8000
```

Notes & recommendations

- Ollama is the preferred local server for open-source models; it manages model download and efficient inference.
- Choose a model appropriate for your machine: `llama2-mini` / small Falcon models for CPU testing; move to GPU-capable machines for larger models.
- If `AI_BACKEND=ollama` is set but `ollama` is not installed, the backend will raise an error explaining how to install Ollama or switch back to `transformers`.

If you want, I can:
- Add a lightweight mock mode for CI (`MOCK_LOCAL_AI=true`) that returns canned responses.
- Set a different default `LOCAL_MODEL_NAME` in code (e.g., `llama2-mini`).
