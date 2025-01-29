// Data structures to store tasks and dependencies
const tasks = new Map();
const dependencies = new Map(); // Stores task dependencies (key: task ID, value: array of dependent task IDs)

let taskIdCounter = 0; // Unique ID for each task
let currentTaskIndex = 0; // Track the current task for the timer
let timerInterval = null; // Reference for the timer interval

// Function to add a task
function addTask() {
    const taskName = document.getElementById("taskName").value.trim();
    const taskDuration = parseInt(document.getElementById("taskDuration").value);

    if (!taskName || isNaN(taskDuration) || taskDuration <= 0) {
        showError("Invalid task name or duration. Please enter valid values.");
        return;
    }

    const taskId = taskIdCounter++;
    tasks.set(taskId, { id: taskId, name: taskName, duration: taskDuration, dependencies: [] });

    updateTaskList();
    updateDependencySelects();
    updateVisualization();

    // Clear input fields
    document.getElementById("taskName").value = "";
    document.getElementById("taskDuration").value = "";
}

// Function to remove a task
function removeTask(taskId) {
    tasks.delete(taskId);

    // Remove task from dependencies
    dependencies.delete(taskId);
    dependencies.forEach((deps) => {
        const index = deps.indexOf(taskId);
        if (index !== -1) deps.splice(index, 1);
    });

    updateTaskList();
    updateDependencySelects();
    updateVisualization();
}

// Function to add a dependency
function addDependency() {
    const fromTaskId = parseInt(document.getElementById("taskFrom").value);
    const toTaskId = parseInt(document.getElementById("taskTo").value);

    if (fromTaskId === toTaskId) {
        showError("A task cannot depend on itself.");
        return;
    }

    if (!dependencies.has(toTaskId)) {
        dependencies.set(toTaskId, []);
    }

    if (!dependencies.get(toTaskId).includes(fromTaskId)) {
        dependencies.get(toTaskId).push(fromTaskId);
    }

    updateVisualization();
}

// Function to calculate and display the task schedule using topological sorting
function calculateSchedule() {
    try {
        const sortedTasks = topologicalSort();
        displayGraphicalSchedule(sortedTasks);
    } catch (error) {
        showError(error.message);
    }
}

// Topological sorting algorithm (Kahn's Algorithm)
function topologicalSort() {
    const inDegree = new Map(); // Tracks in-degree of each task

    // Initialize in-degree map
    tasks.forEach((_, taskId) => {
        inDegree.set(taskId, 0);
    });

    // Calculate in-degrees based on dependencies
    dependencies.forEach((deps, taskId) => {
        deps.forEach((dep) => {
            inDegree.set(taskId, inDegree.get(taskId) + 1);
        });
    });

    const queue = []; // Tasks with in-degree 0
    inDegree.forEach((degree, taskId) => {
        if (degree === 0) queue.push(taskId);
    });

    const sortedTasks = [];

    while (queue.length > 0) {
        const currentTaskId = queue.shift();
        sortedTasks.push(tasks.get(currentTaskId));

        if (dependencies.has(currentTaskId)) {
            dependencies.get(currentTaskId).forEach((dependentTaskId) => {
                inDegree.set(dependentTaskId, inDegree.get(dependentTaskId) - 1);
                if (inDegree.get(dependentTaskId) === 0) {
                    queue.push(dependentTaskId);
                }
            });
        }
    }

    if (sortedTasks.length !== tasks.size) {
        throw new Error("Cycle detected in task dependencies. Cannot generate a valid schedule.");
    }

    return sortedTasks;
}

// Function to update task list in the UI
function updateTaskList() {
    const taskList = document.getElementById('taskList');
    let html = '<h3>Current Tasks</h3>';

    tasks.forEach(task => {
        html += `
            <div class="task-item">
                <div class="task-info">
                    <span>${task.name}</span>
                    <span class="task-duration">${task.duration}h</span>
                </div>
                <button class="btn btn-danger" onclick="removeTask(${task.id})">Remove</button>
            </div>
        `;
    });

    taskList.innerHTML = html;
}

// Function to update dependency dropdowns in the UI
function updateDependencySelects() {
    const fromSelect = document.getElementById("taskFrom");
    const toSelect = document.getElementById("taskTo");

    fromSelect.innerHTML = "";
    toSelect.innerHTML = "";

    tasks.forEach(task => {
        const option = `<option value="${task.id}">${task.name}</option>`;
        fromSelect.innerHTML += option;
        toSelect.innerHTML += option;
    });
}

// Function to display the task schedule as a graphical representation with a timer
function displayGraphicalSchedule(schedule) {
    const resultSection = document.getElementById('resultSection');
    resultSection.innerHTML = '<h3>Optimal Schedule</h3>';

    const graphContainer = document.createElement('div');
    graphContainer.style.display = 'flex';
    graphContainer.style.justifyContent = 'space-around';
    graphContainer.style.alignItems = 'center';
    graphContainer.style.padding = '1rem';

    schedule.forEach((task, index) => {
        const taskNode = document.createElement('div');
        taskNode.style.width = '150px';
        taskNode.style.height = '150px';
        taskNode.style.borderRadius = '50%';
        taskNode.style.background = 'linear-gradient(135deg, #6366f1, #818cf8)';
        taskNode.style.color = 'white';
        taskNode.style.display = 'flex';
        taskNode.style.flexDirection = 'column';
        taskNode.style.justifyContent = 'center';
        taskNode.style.alignItems = 'center';
        taskNode.style.fontSize = '1.2rem';
        taskNode.style.margin = '0 1rem';
        taskNode.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.2)';
        taskNode.id = `task-${index}`;

        const taskName = document.createElement('div');
        taskName.textContent = task.name;

        const taskDuration = document.createElement('div');
        taskDuration.textContent = `${task.duration}h`;

        taskNode.appendChild(taskName);
        taskNode.appendChild(taskDuration);
        graphContainer.appendChild(taskNode);
    });

    resultSection.appendChild(graphContainer);

    // Start the timer for tasks
    currentTaskIndex = 0;
    startGraphicalTaskTimer(schedule, graphContainer);
}

// Function to start the graphical timer for tasks
function startGraphicalTaskTimer(schedule, graphContainer) {
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    const highlightTask = (index) => {
        const nodes = graphContainer.children;
        for (let i = 0; i < nodes.length; i++) {
            nodes[i].style.transform = 'scale(1)';
            nodes[i].style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.2)';
        }
        nodes[index].style.transform = 'scale(1.2)';
        nodes[index].style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.4)';
    };

    let remainingTime = schedule[currentTaskIndex].duration * 3600; // Convert hours to seconds

    timerInterval = setInterval(() => {
        const hours = Math.floor(remainingTime / 3600);
        const minutes = Math.floor((remainingTime % 3600) / 60);
        const seconds = remainingTime % 60;

        highlightTask(currentTaskIndex);

        const taskNode = document.getElementById(`task-${currentTaskIndex}`);
        taskNode.querySelector('div:nth-child(2)').textContent = `${hours}h ${minutes}m ${seconds}s`;

        if (remainingTime <= 0) {
            currentTaskIndex++;
            if (currentTaskIndex >= schedule.length) {
                clearInterval(timerInterval);
                alert('All tasks completed!');
            } else {
                remainingTime = schedule[currentTaskIndex].duration * 3600;
            }
        } else {
            remainingTime--;
        }
    }, 1000);
}

// Function to show error messages in the UI
function showError(message) {
    const resultSection = document.getElementById('resultSection');
    resultSection.innerHTML = `
        <div class="error">
            <strong>Error:</strong> ${message}
        </div>
    `;
}
