from fastapi import FastAPI, HTTPException,status, Request, Form
from fastapi.responses import JSONResponse
import json
from fastapi.responses import HTMLResponse, RedirectResponse
from database import conn, cursor
from typing import List
from ai_service import call_llm
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from datetime import datetime
app = FastAPI(title="My TO Do App")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse )
def get_all_Task(request: Request):
    cursor.execute("SELECT * FROM ai_todo ")
                  
    rows = cursor.fetchall()


    if not rows:
        raise HTTPException(status_code=404, detail="No Tasks Yet")
    
    tasks = []
    for  row in rows:
        tasks.append({
            "id": row[0],
            "title": row[1],
            "description":row[2],
            "status": row[3],
            "created_at": row[4],
            "due_date": row[5],
            "completed": row[6]
        })

    total_tasks = len(tasks)
    done_tasks = len([t for t in tasks if t["completed"]])
    pending_tasks = total_tasks - done_tasks

    now = datetime.now()
    

    return templates.TemplateResponse(
    request=request,
    name="index.html",
    context={
        "tasks": tasks,
        "total_tasks": total_tasks,
        "done_tasks": done_tasks,
        "pending_tasks": pending_tasks,
        "today_day": now.day,
        "today_month": now.strftime("%b")
    }
)

@app.post("/ai_create_task")
def create_task_from_ai(request: Request, text: str = Form(...)):
    ai_response = call_llm(text)

    print("AI RESPONSE =", repr(ai_response))

    if not ai_response:
        raise HTTPException(status_code=500, detail="AI response is empty")

    try:
        cleaned = ai_response.replace("```json", "").replace("```", "").strip()
        task_data = json.loads(cleaned)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="AI response is not valid JSON")

    result_type = task_data.get("type")

    if result_type == "task":
        title = task_data.get("title")
        description = task_data.get("description")

        cursor.execute(
            "INSERT INTO ai_todo(title, description) VALUES(?, ?)",
            (title, description)
        )
        conn.commit()

        return templates.TemplateResponse(
            request=request,
            name="index.html",
            context={
                "request": request,
                "ai_title": title,
                "ai_description": description
            }
        )

    elif result_type == "answer":
        answer = task_data.get("answer")

        return templates.TemplateResponse(
            request=request,
            name="index.html",
            context={
                "request": request,
                "ai_answer": answer
            }
        )

    else:
        raise HTTPException(status_code=400, detail="Invalid AI response type")

@app.post("/create",  status_code=status.HTTP_303_SEE_OTHER)
def create_task(   title: str = Form(...),
    description: str = Form(...),
    due_date: str = Form(...)):
    cursor.execute("INSERT INTO ai_todo (title, description, due_date) VALUES(?, ?, ?)",
                   (title, description, due_date))
    conn.commit()

    return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)

@app.post("/update/{id}" )
def update_task(    id: int,
    status: str = Form(None),
    due_date: str = Form(None),
    completed: str = Form(None)):
    cursor.execute("SELECT * FROM ai_todo WHERE id = ?",
                   (id,))
    row = cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="ID Not Found")
    old_status = row[3]
    old_due_date = row[5]
    old_completed = row[6]

    new_status =status if status is not None else old_status
    new_due_date =due_date if  due_date is not None else old_due_date
    new_completed = completed if  completed is not None else old_completed
    
    cursor.execute("UPDATE ai_todo SET status = ?, due_date = ?, completed = ? WHERE id = ?",
                   (new_status,new_due_date, new_completed, id))
    conn.commit()
  

    return RedirectResponse(url="/", status_code=303)  

@app.post("/delete/{id}")
def delete_task(id:int):
    cursor.execute("SELECT * FROM ai_todo WHERE id = ?",
                   (id,))
    row = cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="ID Not Match")
    
    cursor.execute("DELETE FROM ai_todo WHERE id = ?",
                   (id,))
    conn.commit()

    return RedirectResponse(url="/", status_code=303)
