const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));
app.use(express.json());

// API to get tasks (for syncing across devices)
app.get('/api/tasks', (req, res) => {
  try {
    const tasksFile = path.join(__dirname, 'tasks.json');
    if (fs.existsSync(tasksFile)) {
      const data = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
      res.json(data);
    } else {
      res.json({ tasks: [] });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

// API to save tasks
app.post('/api/tasks', (req, res) => {
  try {
    const tasksFile = path.join(__dirname, 'tasks.json');
    fs.writeFileSync(tasksFile, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save tasks' });
  }
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Jarvis Kanban running on port ${PORT}`);
});
