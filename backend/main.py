from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import subprocess
import shutil
import os
from typing import Optional
import json
import uuid
import time
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Store active processes and their status
active_tasks = {}

def run_transcription(task_id: str, file_path: str, cmd: list, output_filename: str, output_format: str):
    """Background task to run transcription"""
    try:
        print(f"[{task_id}] Starting transcription: {' '.join(cmd)}")
        active_tasks[task_id]["start_time"] = time.time()
        
        # Use Popen for async execution
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        active_tasks[task_id]["process"] = process
        active_tasks[task_id]["status"] = "processing"
        
        # Wait for completion
        stdout, stderr = process.communicate()
        
        # Check if cancelled
        if task_id not in active_tasks:
            print(f"[{task_id}] Task was cancelled")
            return
        
        end_time = time.time()
        elapsed = end_time - active_tasks[task_id]["start_time"]
        
        if process.returncode != 0:
            active_tasks[task_id]["status"] = "error"
            active_tasks[task_id]["error"] = "Whisper command failed"
            active_tasks[task_id]["logs"] = stderr
        else:
            # Read output file
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            
            if os.path.exists(output_path):
                with open(output_path, "r") as f:
                    content = f.read()
                active_tasks[task_id]["status"] = "complete"
                active_tasks[task_id]["output"] = content
                active_tasks[task_id]["filename"] = output_filename
                active_tasks[task_id]["logs"] = stderr
                active_tasks[task_id]["elapsed_time"] = elapsed
            else:
                active_tasks[task_id]["status"] = "error"
                active_tasks[task_id]["error"] = "Output file not found"
                active_tasks[task_id]["logs"] = stderr
                
    except Exception as e:
        if task_id in active_tasks:
            active_tasks[task_id]["status"] = "error"
            active_tasks[task_id]["error"] = str(e)

@app.post("/transcribe")
async def transcribe(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    model: str = Form("base"),
    language: Optional[str] = Form(None),
    task: str = Form("transcribe"),
    output_format: str = Form("txt"),
    temperature: float = Form(0.0),
    beam_size: int = Form(5),
    patience: Optional[float] = Form(None),
):
    # Generate unique task ID
    task_id = str(uuid.uuid4())
    
    # Save uploaded file
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Construct command
    cmd = [
        "whisper",
        file_path,
        "--model", model,
        "--output_dir", OUTPUT_DIR,
        "--output_format", output_format,
        "--task", task,
        "--temperature", str(temperature),
        "--beam_size", str(beam_size),
        "--verbose", "False"
    ]
    
    if language and language != "auto":
        cmd.extend(["--language", language])
        
    if patience is not None:
        cmd.extend(["--patience", str(patience)])

    # Initialize task
    input_stem = os.path.splitext(os.path.basename(file.filename))[0]
    output_filename = input_stem + "." + output_format
    
    active_tasks[task_id] = {
        "status": "queued",
        "file_path": file_path,
        "output_filename": output_filename
    }

    # Start background task
    background_tasks.add_task(run_transcription, task_id, file_path, cmd, output_filename, output_format)

    return {"status": "started", "task_id": task_id}

@app.get("/status/{task_id}")
async def get_status(task_id: str):
    if task_id not in active_tasks:
        return {"status": "not_found"}
    
    task = active_tasks[task_id]
    response = {"status": task["status"]}
    
    if task["status"] == "complete":
        response["output"] = task.get("output", "")
        response["filename"] = task.get("filename", "")
        response["logs"] = task.get("logs", "")
        response["elapsed_time"] = task.get("elapsed_time", 0)
    elif task["status"] == "error":
        response["error"] = task.get("error", "Unknown error")
        response["logs"] = task.get("logs", "")
    elif task["status"] == "processing":
        # Calculate elapsed time
        if "start_time" in task:
            response["elapsed_time"] = time.time() - task["start_time"]
    
    return response

@app.post("/cancel/{task_id}")
async def cancel_task(task_id: str):
    if task_id not in active_tasks:
        return {"status": "not_found"}
    
    task = active_tasks[task_id]
    
    # Kill the process if it's running
    if "process" in task and task["process"].poll() is None:
        task["process"].kill()
        print(f"[{task_id}] Process killed")
    
    # Clean up
    del active_tasks[task_id]
    
    return {"status": "cancelled"}

@app.get("/download/{filename}")
async def download_file(filename: str):
    file_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(path=file_path, filename=filename, media_type='application/octet-stream')
    else:
        return {"status": "error", "message": "File not found"}

@app.get("/health")
def health():
    return {"status": "ok"}
