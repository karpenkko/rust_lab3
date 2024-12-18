const apiBaseUrl = 'http://127.0.0.1:8000/todos';

async function fetchTasks() {
  const response = await fetch(apiBaseUrl);
  const tasks = await response.json();
  const taskList = document.getElementById('taskList');
  taskList.innerHTML = '';

  const uncompletedTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  uncompletedTasks.forEach(task => prependTask(task, 'uncompleted'));
  completedTasks.forEach(task => prependTask(task, 'completed'));
}

async function addTask() {
  const newTaskInput = document.getElementById('newTaskInput');
  const newTask = newTaskInput.value.trim();
  if (!newTask) return alert('Task cannot be empty!');

  const response = await fetch(apiBaseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: newTask, completed: false }),
  });

  if (response.ok) {
    const createdTask = await response.json();
    prependTask(createdTask, 'uncompleted');
    newTaskInput.value = '';
  }
}

function prependTask(task, status) {
    const taskList = document.getElementById('taskList');
    const taskItem = document.createElement('li');
  
    taskItem.setAttribute('data-id', task.id);
    taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
  
    taskItem.innerHTML = `
      <input type="checkbox" 
        ${task.completed ? 'checked' : ''} 
        onchange="toggleTaskCompleted('${task.id}', this.checked)" />
      <span class="task-name" contenteditable="true" 
        onblur="saveTaskEdit('${task.id}', this)" 
        onkeydown="checkEnterKey(event, '${task.id}', this)">
        ${task.task}
      </span>
      <div class="task-actions">
        <button class="delete" onclick="deleteTask('${task.id}')">Delete</button>
      </div>
    `;
    
    if (status === 'uncompleted') {
      taskList.prepend(taskItem);
    } else if (status === 'completed') {
      taskList.appendChild(taskItem);
    }
  }
  

async function saveTaskEdit(id, element) {
    const newTaskName = element.textContent.trim();
    if (!newTaskName) return;
  
    const response = await fetch(`${apiBaseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: newTaskName, completed: false }),
    });
  
    if (response.ok) {
      const updatedTask = await response.json();
      fetchTasks();
    }
  }

function checkEnterKeyNewTask(event) {
    if (event.key === 'Enter') {
      event.preventDefault();  
      addTask();
    }
}

function checkEnterKey(event, id, element) {
    if (event.key === 'Enter') {
      event.preventDefault(); 
      saveTaskEdit(id, element);
    }
}

async function toggleTaskCompleted(id, isCompleted) {
    const taskElement = document.querySelector(`[data-id="${id}"]`);
    if (!taskElement) return console.error('Task not found');
  
    const taskName = taskElement.querySelector('.task-name').textContent.trim();
  
    const response = await fetch(`${apiBaseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: taskName, completed: isCompleted }),
    });
  
    if (response.ok) {
      const updatedTask = await response.json();
      taskElement.className = `task-item ${updatedTask.completed ? 'completed' : ''}`;
      const checkbox = taskElement.querySelector('input[type="checkbox"]');
      checkbox.checked = updatedTask.completed;
  
      const taskList = document.getElementById('taskList');
  
      if (updatedTask.completed) {
        taskElement.style.opacity = '0.5';
        taskList.appendChild(taskElement);
      } else {
        taskElement.style.opacity = '1';
        taskList.prepend(taskElement);
      }
    } else {
      const errorText = await response.text();
      console.error('Failed to toggle task status:', errorText);
    }
}
  

async function deleteTask(id) {
  const response = await fetch(`${apiBaseUrl}/${id}`, {
    method: 'DELETE',
  });

  if (response.ok) {
    fetchTasks();
  }
}

// async function downloadTasks() {
//   const response = await fetch(`${apiBaseUrl}/download-tasks`);
//   const text = await response.text();
//   alert(text);  // Наприклад, повідомлення про успіх
// }


async function downloadTasks() {
  const response = await fetch(apiBaseUrl);
  if (response.ok) {
    const tasks = await response.json();
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'tasks.json';
    link.click();
  } else {
    console.error('Не вдалося отримати список завдань для експорту.');
    alert('Сталася помилка при завантаженні списку завдань.');
  }
}


function triggerFileUpload() {
  const fileInput = document.getElementById('uploadFileInput');
  fileInput.click();
}

function uploadTasks() {
  const fileInput = document.getElementById('uploadFileInput');
  const file = fileInput.files[0];

  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  fetch(`${apiBaseUrl}/upload-tasks`, {
    method: 'POST',
    body: formData,
  })
  .then(response => response.text())
  .then(text => {
    alert(text); 
    fetchTasks();
  })
  .catch(err => {
    console.error('Error uploading tasks:', err);
    alert('Error uploading tasks!');
  });
}

