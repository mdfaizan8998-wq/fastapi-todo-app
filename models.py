from pydantic import BaseModel
from typing import Optional

class TaskSchema(BaseModel):
    title : str
    description : str
    due_date : str
   

class TaskUpdateSchema(BaseModel):
    status : Optional[str] = None
    due_date :Optional[str] = None
    completed : Optional[bool] =  None 


class TaskResponseSchema(BaseModel):
    id : int
    title : str
    description : str
    status : Optional[str] = None
    created_at : str
    due_date :Optional[str] = None
    completed : Optional[bool] =  None 

class AIRequest(BaseModel):
    text : str
    

class ResponseSchema(BaseModel):
    title: str
    description: str
    