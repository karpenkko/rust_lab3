use actix_web::{web, App, HttpServer, Responder, HttpResponse};
use actix_multipart::Multipart;
use futures::StreamExt;
use std::fs::File;
use std::io::Write;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::sync::Mutex;
use actix_cors::Cors;
use std::path::Path;
use std::env;

#[derive(Serialize, Deserialize, Clone)]
struct Todo {
    id: Option<Uuid>,
    task: String,
    completed: Option<bool>,
}

struct AppState {
    todos: Mutex<Vec<Todo>>,
}

#[actix_web::get("/todos")]
async fn get_todos(data: web::Data<AppState>) -> impl Responder {
    let todos = data.todos.lock().unwrap();
    HttpResponse::Ok().json(&*todos)
}

#[actix_web::post("/todos")]
async fn add_todo(new_todo: web::Json<Todo>, data: web::Data<AppState>) -> impl Responder {
    let mut todos = data.todos.lock().unwrap();
    let todo = Todo {
        id: Some(Uuid::new_v4()),
        task: new_todo.task.clone(),
        completed: Some(false),
    };
    todos.push(todo.clone());
    HttpResponse::Created().json(todo)
}

#[actix_web::put("/todos/{id}")]
async fn update_todo(
    path: web::Path<Uuid>,
    updated_todo: web::Json<Todo>,
    data: web::Data<AppState>,
) -> impl Responder {
    let id = path.into_inner();
    let mut todos = data.todos.lock().unwrap();
    if let Some(todo) = todos.iter_mut().find(|t| t.id == Some(id)) {
        todo.task = updated_todo.task.clone();
        todo.completed = updated_todo.completed;
        return HttpResponse::Ok().json(todo.clone());
    }
    HttpResponse::NotFound().body("Todo not found")
}

#[actix_web::delete("/todos/{id}")]
async fn delete_todo(
    path: web::Path<Uuid>,
    data: web::Data<AppState>,
) -> impl Responder {
    let id = path.into_inner();
    let mut todos = data.todos.lock().unwrap();
    if todos.iter().any(|t| t.id == Some(id)) {
        todos.retain(|t| t.id != Some(id));
        return HttpResponse::NoContent().finish();
    }
    HttpResponse::NotFound().body("Todo not found")
}

#[actix_web::get("/todos/download-tasks")]
async fn download_tasks(data: web::Data<AppState>) -> impl Responder {
    let todos = data.todos.lock().unwrap();
    let file_content = serde_json::to_string(&*todos).unwrap();

    let home_dir = env::var("HOME").unwrap();
    let file_path = Path::new(&home_dir).join("tasks.json");

    let mut file = File::create(file_path).unwrap();
    file.write_all(file_content.as_bytes()).unwrap();

    HttpResponse::Ok().body("Tasks downloaded as tasks.json")
}

#[actix_web::post("/todos/upload-tasks")]
async fn upload_tasks(mut payload: Multipart, data: web::Data<AppState>) -> impl Responder {
    let file_path = "tasks_upload.json";

    let mut file_data = Vec::new();

    while let Some(item) = payload.next().await {
        let mut field = item.unwrap();
        while let Some(chunk) = field.next().await {
            let data = chunk.unwrap();
            file_data.extend(data);
        }
    }

    let file = web::block(move || {
        let mut file = File::create(file_path).unwrap();
        file.write_all(&file_data).unwrap();
        file
    })
    .await;


    match file {
        Ok(_) => {
            let file_content = std::fs::read_to_string(file_path).unwrap();
            let new_tasks: Vec<Todo> = serde_json::from_str(&file_content).unwrap();
    
            let mut todos = data.todos.lock().unwrap();
            todos.extend(new_tasks);
    
            HttpResponse::Ok().body("Tasks uploaded successfully")
        },
        Err(_) => HttpResponse::InternalServerError().body("File processing failed"),
    }
}


#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let data = web::Data::new(AppState {
        todos: Mutex::new(Vec::new()),
    });

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin() 
            .allow_any_method() 
            .allow_any_header(); 

        App::new()
            .wrap(cors)
            .app_data(data.clone())
            .service(get_todos)
            .service(add_todo)
            .service(update_todo)
            .service(delete_todo)
            .service(download_tasks)
            .service(upload_tasks)
    })
    .bind("127.0.0.1:8000")?
    .run()
    .await
}

