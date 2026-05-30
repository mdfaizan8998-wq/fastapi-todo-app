from fastapi import FastAPI, HTTPException,status
from database import conn, cursor
from models import TaskSchema, TaskUpdateSchema, TaskResponseSchema, AIRequest,ResponseSchema
from typing import List
from ai_service import call_llm
import json







app = FastAPI(title="My TO Do App")


@app.get("/all_Tasks", response_model=List[TaskResponseSchema], status_code=status.HTTP_200_OK)
def get_all_Task():
    cursor.execute("SELECT * FROM ai_todo ")
                  
    rows = cursor.fetchall()

    if rows is None:
        raise HTTPException(status_code=404, detail="No Tasks Yet")
    
    all_task = []
    for  row in rows:
        all_task.append({
            "id": row[0],
            "title": row[1],
            "description":row[2],
            "status": row[3],
            "created_at": row[4],
            "due_date": row[5],
            "completed": row[6]
        })
    

    return all_task

@app.post("/ai_create_task", response_model=ResponseSchema, status_code=status.HTTP_201_CREATED)
def create_task_from_ai(body: AIRequest):
    ai_response = call_llm(body.text)
    # print(ai_response)
    # ai_response = call_llm(body.text)
    print("AI RESPONSE =",  repr(ai_response))
    if not ai_response:
        raise HTTPException(status_code=500, detail="AI response is empty")
    try:
        cleaned = ai_response.replace("```json", "").replace("```", "").strip()
        task_data = json.loads(cleaned)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="AI response is not valid JSON")
    
    title = task_data.get("title")
    description = task_data.get("description")
    

    cursor.execute("INSERT INTO ai_todo (title, description) VALUES (?, ?)",
                   (title, description))
    # conn.commit()
    task_id = cursor.lastrowid

    cursor.execute("SELECT * FROM ai_todo WHERE id = ?", (task_id,))
    row = cursor.fetchone()
     
    return {
        "title": row[1],
        "description": row[2]
    }

@app.post("/create", response_model=TaskSchema, status_code=status.HTTP_201_CREATED)
def create_task(data:TaskSchema):
    cursor.execute("INSERT INTO ai_todo (title, description, due_date) VALUES(?, ?, ?)",
                   (data.title, data.description, data.due_date))
    conn.commit()

    return data

@app.put("/update/{id}" ,response_model=TaskResponseSchema, status_code=status.HTTP_201_CREATED )
def update_task(id:int, data:TaskUpdateSchema):
    cursor.execute("SELECT * FROM ai_todo WHERE id = ?",
                   (id,))
    row = cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="ID Not Found")
    old_status = row[3]
    old_due_date = row[5]
    old_completed = row[6]

    new_status = data.status if data.status is not None else old_status
    new_due_date = data.due_date if data. due_date is not None else old_due_date
    new_completed = data.completed if data. completed is not None else old_completed
    
    cursor.execute("UPDATE ai_todo SET status = ?, due_date = ?, completed = ? WHERE id = ?",
                   (new_status,new_due_date, new_completed, id))
    conn.commit()
    cursor.execute("SELECT * FROM ai_todo WHERE id = ?",
                   (id,))
    updated_row = cursor.fetchone()



    return {
        "id" :updated_row[0],
        "title":updated_row[1],
        "description":updated_row[2],
        "status":updated_row[3],
        "created_at":updated_row[4],
        "due_date":updated_row[5],
        "completed":updated_row[6]
    }

@app.delete("/delete/{id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
def delete_task(id:int):
    cursor.execute("SELECT * FROM ai_todo WHERE id = ?",
                   (id,))
    row = cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="ID Not Match")
    
    cursor.execute("DELETE FROM ai_todo WHERE id = ?",
                   (id,))
    conn.commit()

    return None