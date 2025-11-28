# Whisper UI

A modern, futuristic web interface for OpenAI's Whisper speech recognition model. This application allows you to transcribe audio files and microphone recordings using a local Whisper instance.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

*   **Python 3.8+**: [Download Python](https://www.python.org/downloads/)
*   **Node.js 16+**: [Download Node.js](https://nodejs.org/)
*   **FFmpeg**: Required by `openai-whisper` for audio processing.
    *   **macOS**: `brew install ffmpeg`
    *   **Windows**: `winget install ffmpeg` or download from [ffmpeg.org](https://ffmpeg.org/)
    *   **Linux**: `sudo apt update && sudo apt install ffmpeg`

## Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd whisper_ui
```

### 2. Backend Setup

Navigate to the `backend` directory and install the Python dependencies:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 3. Frontend Setup

Navigate to the `frontend` directory and install the Node.js dependencies:

```bash
cd frontend
npm install
cd ..
```

## Usage

### Quick Start

You can start both the backend and frontend services using the provided helper script:

```bash
./start.sh
```

This will launch:
*   **Frontend**: http://localhost:5173
*   **Backend**: http://localhost:8000

### Manual Start

If you prefer to run the services manually:

**Backend:**

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend
npm run dev
```

## Features

*   **Local Transcription**: Runs entirely on your machine using OpenAI's Whisper model.
*   **Real-time Visualization**: Visual feedback during recording.
*   **Modern UI**: Futuristic and responsive design.
*   **File Support**: Upload audio files for transcription.
# whisper_ui
# whisper_ui
